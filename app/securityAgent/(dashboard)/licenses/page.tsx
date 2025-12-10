import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SecurityHeader } from "@/components/security-agent/header"
import { LicenseDetails } from "@/components/security-agent/license-details"
import { LicenseAllocationHistory } from "@/components/security-agent/license-allocation-history"
import { LicenseTierComparison } from "@/components/security-agent/license-tier-comparison"

export default async function LicensesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/securityAgent/auth/login")
  }

  // Get user profile with account
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

  if (!profile || !["super_admin", "admin"].includes(profile.role)) {
    redirect("/securityAgent/dashboard")
  }

  // Get all license tiers for comparison
  const { data: licenseTiers } = await supabase.from("license_tiers").select("*").order("price_per_endpoint")

  // Get license allocation history
  const { data: allocations } = await supabase
    .from("license_allocations")
    .select(`
      *,
      to_account:accounts!license_allocations_to_account_id_fkey(name),
      allocated_by_user:profiles!license_allocations_allocated_by_fkey(full_name, email)
    `)
    .eq("from_account_id", profile.account.id)
    .order("allocated_at", { ascending: false })

  // Get sub-accounts for allocation
  const { data: subAccounts } = await supabase
    .from("accounts")
    .select("id, name, total_licenses, used_licenses")
    .eq("parent_account_id", profile.account.id)

  return (
    <>
      <SecurityHeader title="Licenses" subtitle="Manage your license allocation and usage" />

      <main className="flex-1 space-y-6 p-4 md:p-6">
        <LicenseDetails account={profile.account} subAccounts={subAccounts || []} userId={user.id} />

        <div className="grid gap-6 lg:grid-cols-2">
          <LicenseAllocationHistory allocations={allocations || []} />
          <LicenseTierComparison tiers={licenseTiers || []} currentTierId={profile.account.license_tier_id} />
        </div>
      </main>
    </>
  )
}
