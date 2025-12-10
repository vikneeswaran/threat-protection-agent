import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/securityAgent/dashboard"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const adminClient = createAdminClient()
        const metadata = user.user_metadata

        // Check if profile already exists
        const { data: existingProfile } = await adminClient.from("profiles").select("id").eq("id", user.id).single()

        if (!existingProfile) {
          // Get the license tier ID
          const { data: tierData } = await adminClient
            .from("license_tiers")
            .select("id, max_endpoints, trial_days")
            .eq("name", metadata.license_tier || "free")
            .single()

          if (tierData) {
            // Calculate license expiry for free tier
            const expiresAt =
              tierData.trial_days > 0
                ? new Date(Date.now() + tierData.trial_days * 24 * 60 * 60 * 1000).toISOString()
                : null

            // Create the account
            const { data: accountData, error: accountError } = await adminClient
              .from("accounts")
              .insert({
                name: metadata.organization_name || "My Organization",
                level: 1,
                license_tier_id: tierData.id,
                total_licenses: tierData.max_endpoints,
                license_expires_at: expiresAt,
              })
              .select()
              .single()

            if (!accountError && accountData) {
              // Create the user profile as super_admin
              const { error: profileError } = await adminClient.from("profiles").insert({
                id: user.id,
                account_id: accountData.id,
                email: user.email!,
                full_name: metadata.full_name || null,
                role: "super_admin",
              })

              if (profileError) {
                console.error("Profile creation error:", profileError)
                return NextResponse.redirect(`${origin}/securityAgent/auth/error?message=profile_creation_failed`)
              }
            } else {
              console.error("Account creation error:", accountError)
              return NextResponse.redirect(`${origin}/securityAgent/auth/error?message=account_creation_failed`)
            }
          } else {
            console.error("License tier not found")
            return NextResponse.redirect(`${origin}/securityAgent/auth/error?message=license_tier_not_found`)
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/securityAgent/auth/error`)
}
