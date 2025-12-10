import { EndpointTrayUI } from "@/components/endpoint-tray-ui"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function EndpointTrayPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/securityAgent/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, account:accounts(*)")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile) {
    redirect("/securityAgent/auth/setup")
  }

  // Get first endpoint for demo
  const { data: endpoint } = await supabase
    .from("endpoints")
    .select("id, hostname")
    .eq("account_id", profile.account.id)
    .limit(1)
    .maybeSingle()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <EndpointTrayUI endpointId={endpoint?.id} hostname={endpoint?.hostname} />
    </div>
  )
}
