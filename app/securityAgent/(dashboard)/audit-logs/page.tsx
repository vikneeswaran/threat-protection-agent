import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SecurityHeader } from "@/components/security-agent/header"
import { AuditLogsList } from "@/components/security-agent/audit-logs-list"
import { AuditLogsFilters } from "@/components/security-agent/audit-logs-filters"

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; user?: string; date?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/securityAgent/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*, account:accounts(*)").eq("id", user.id).single()

  if (!profile || !["super_admin", "admin"].includes(profile.role)) {
    redirect("/securityAgent/dashboard")
  }

  // Build query with filters
  let query = supabase
    .from("audit_logs")
    .select(`
      *,
      user:profiles(full_name, email)
    `)
    .order("created_at", { ascending: false })

  if (params.action && params.action !== "all") {
    query = query.eq("action", params.action)
  }

  if (params.user && params.user !== "all") {
    query = query.eq("user_id", params.user)
  }

  const { data: logs } = await query.limit(100)

  // Get users for filter dropdown
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("account_id", profile.account.id)

  return (
    <>
      <SecurityHeader title="Audit Logs" subtitle="Track all activity in your organization" />

      <main className="flex-1 space-y-6 p-4 md:p-6">
        <AuditLogsFilters currentFilters={params} users={users || []} />
        <AuditLogsList logs={logs || []} />
      </main>
    </>
  )
}
