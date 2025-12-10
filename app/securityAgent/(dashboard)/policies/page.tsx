import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SecurityHeader } from "@/components/security-agent/header"
import { PoliciesList } from "@/components/security-agent/policies-list"
import { CreatePolicyDialog } from "@/components/security-agent/create-policy-dialog"

export default async function PoliciesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/securityAgent/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*, account:accounts(*)").eq("id", user.id).single()

  if (!profile) {
    redirect("/securityAgent/auth/login")
  }

  // Get policies
  const { data: policies } = await supabase
    .from("policies")
    .select(`
      *,
      created_by_user:profiles!policies_created_by_fkey(full_name, email)
    `)
    .order("created_at", { ascending: false })

  // Get policy usage counts
  const { data: policyCounts } = await supabase.from("endpoint_policies").select("policy_id")

  const policyUsage = policyCounts?.reduce(
    (acc, curr) => {
      acc[curr.policy_id] = (acc[curr.policy_id] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <>
      <SecurityHeader title="Policies" subtitle="Manage security policies for your endpoints" />

      <main className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex justify-end">
          {["super_admin", "admin"].includes(profile.role) && (
            <CreatePolicyDialog accountId={profile.account.id} userId={user.id} />
          )}
        </div>

        <PoliciesList policies={policies || []} policyUsage={policyUsage || {}} userRole={profile.role} />
      </main>
    </>
  )
}
