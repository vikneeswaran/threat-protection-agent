import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SecurityHeader } from "@/components/security-agent/header"
import { SubAccountsList } from "@/components/security-agent/sub-accounts-list"
import { CreateSubAccountDialog } from "@/components/security-agent/create-sub-account-dialog"

export default async function AccountsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/securityAgent/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      *,
      account:accounts(
        *,
        license_tier:license_tiers(*)
      )
    `)
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "super_admin") {
    redirect("/securityAgent/dashboard")
  }

  // Get sub-accounts
  const { data: subAccounts } = await supabase
    .from("accounts")
    .select(`
      *,
      license_tier:license_tiers(*)
    `)
    .eq("parent_account_id", profile.account.id)
    .order("created_at", { ascending: false })

  return (
    <>
      <SecurityHeader title="Sub-Accounts" subtitle="Manage your organization's sub-accounts (up to 5 levels)" />

      <main className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">
              Current Level: {profile.account.level} of 5 | Available Licenses to Allocate:{" "}
              {profile.account.total_licenses - profile.account.used_licenses - profile.account.allocated_licenses}
            </p>
          </div>
          {profile.account.level < 5 && <CreateSubAccountDialog parentAccount={profile.account} userId={user.id} />}
        </div>

        <SubAccountsList accounts={subAccounts || []} parentAccount={profile.account} />
      </main>
    </>
  )
}
