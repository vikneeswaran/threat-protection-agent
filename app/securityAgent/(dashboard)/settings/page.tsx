import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SecurityHeader } from "@/components/security-agent/header"
import { SettingsForm } from "@/components/security-agent/settings-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Bell } from "lucide-react"

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/securityAgent/auth/login")
  }

  // Get user profile with account and settings
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

  if (!profile) {
    redirect("/securityAgent/auth/login")
  }

  // Get account settings
  const { data: accountSettings } = await supabase
    .from("account_settings")
    .select("*")
    .eq("account_id", profile.account.id)
    .single()

  return (
    <>
      <SecurityHeader title="Settings" subtitle="Configure your organization's settings" />

      <main className="flex-1 space-y-6 p-4 md:p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization
              </CardTitle>
              <CardDescription>Your organization details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Organization Name</span>
                <span className="font-medium">{profile.account.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Level</span>
                <span className="font-medium">Level {profile.account.level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">License Tier</span>
                <span className="font-medium capitalize">{profile.account.license_tier?.name || "Free"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Configure alert preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsForm
                accountId={profile.account.id}
                settings={accountSettings?.settings || {}}
                lockedSettings={accountSettings?.locked_settings || []}
                userRole={profile.role}
                userId={user.id}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
