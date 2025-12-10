import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SecurityHeader } from "@/components/security-agent/header"
import { UsersList } from "@/components/security-agent/users-list"
import { CreateUserDialog } from "@/components/security-agent/create-user-dialog"

export default async function UsersPage() {
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
      account:accounts(*)
    `)
    .eq("id", user.id)
    .single()

  if (!profile || !["super_admin", "admin"].includes(profile.role)) {
    redirect("/securityAgent/dashboard")
  }

  // Get users in this account
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .eq("account_id", profile.account.id)
    .order("created_at", { ascending: false })

  return (
    <>
      <SecurityHeader title="Users" subtitle="Manage users in your organization" />

      <main className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex justify-end">
          <CreateUserDialog accountId={profile.account.id} currentUserRole={profile.role} currentUserId={user.id} />
        </div>

        <UsersList users={users || []} currentUserId={user.id} currentUserRole={profile.role} />
      </main>
    </>
  )
}
