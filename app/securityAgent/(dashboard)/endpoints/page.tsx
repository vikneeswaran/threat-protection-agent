import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SecurityHeader } from "@/components/security-agent/header"
import { EndpointsList } from "@/components/security-agent/endpoints-list"
import { EndpointFilters } from "@/components/security-agent/endpoint-filters"

export default async function EndpointsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; os?: string; search?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/securityAgent/auth/login")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*, account:accounts(*)")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) {
    redirect("/securityAgent/auth/setup")
  }

  let query = supabase
    .from("endpoints")
    .select("*")
    .eq("account_id", profile.account_id)
    .order("last_seen_at", { ascending: false, nullsFirst: false })

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status)
  }

  if (params.os && params.os !== "all") {
    query = query.eq("os", params.os)
  }

  if (params.search) {
    query = query.or(`hostname.ilike.%${params.search}%,ip_address.ilike.%${params.search}%`)
  }

  const { data: endpoints, error: endpointsError } = await query

  if (endpointsError) {
    console.log("[v0] Endpoints fetch error:", endpointsError.message)
  }

  const endpointIds = endpoints?.map((e) => e.id) || []
  let threatCounts: Record<string, number> = {}

  if (endpointIds.length > 0) {
    const { data: threats, error: threatsError } = await supabase
      .from("threats")
      .select("endpoint_id")
      .in("endpoint_id", endpointIds)
      .eq("status", "detected")

    if (threatsError) {
      console.log("[v0] Threats fetch error:", threatsError.message)
    }

    if (threats) {
      threatCounts = threats.reduce(
        (acc, threat) => {
          acc[threat.endpoint_id] = (acc[threat.endpoint_id] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )
    }
  }

  const endpointsWithThreats =
    endpoints?.map((endpoint) => ({
      ...endpoint,
      activeThreats: threatCounts[endpoint.id] || 0,
    })) || []

  const { data: allEndpoints } = await supabase
    .from("endpoints")
    .select("status, os")
    .eq("account_id", profile.account_id)

  const stats = {
    total: allEndpoints?.length || 0,
    online: allEndpoints?.filter((e) => e.status === "online").length || 0,
    offline: allEndpoints?.filter((e) => e.status === "offline").length || 0,
    disconnected: allEndpoints?.filter((e) => e.status === "disconnected").length || 0,
    windows: allEndpoints?.filter((e) => e.os === "windows").length || 0,
    macos: allEndpoints?.filter((e) => e.os === "macos").length || 0,
    linux: allEndpoints?.filter((e) => e.os === "linux").length || 0,
  }

  return (
    <>
      <SecurityHeader title="Endpoints" subtitle={`${stats.total} endpoints registered`} />

      <main className="flex-1 space-y-6 p-4 md:p-6">
        <EndpointFilters stats={stats} currentFilters={params} />
        <EndpointsList endpoints={endpointsWithThreats} userRole={profile.role} />
      </main>
    </>
  )
}
