import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { fullName, organizationName, licenseTier } = await request.json()

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    // Check if profile already exists
    const { data: existingProfile } = await adminClient.from("profiles").select("id").eq("id", user.id).maybeSingle()

    if (existingProfile) {
      return NextResponse.json({ message: "Profile already exists" })
    }

    // Get the license tier ID
    const { data: tierData, error: tierError } = await adminClient
      .from("license_tiers")
      .select("id, max_endpoints, trial_days")
      .eq("name", licenseTier || "free")
      .single()

    if (tierError || !tierData) {
      return NextResponse.json({ error: "License tier not found. Please run the seed script." }, { status: 400 })
    }

    // Calculate license expiry for free tier
    const expiresAt =
      tierData.trial_days > 0 ? new Date(Date.now() + tierData.trial_days * 24 * 60 * 60 * 1000).toISOString() : null

    // Create the account
    const { data: accountData, error: accountError } = await adminClient
      .from("accounts")
      .insert({
        name: organizationName || "My Organization",
        level: 1,
        license_tier_id: tierData.id,
        total_licenses: tierData.max_endpoints,
        license_expires_at: expiresAt,
      })
      .select()
      .single()

    if (accountError) {
      console.error("Account creation error:", accountError)
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
    }

    // Create the user profile as super_admin
    const { error: profileError } = await adminClient.from("profiles").insert({
      id: user.id,
      account_id: accountData.id,
      email: user.email!,
      full_name: fullName || null,
      role: "super_admin",
    })

    if (profileError) {
      console.error("Profile creation error:", profileError)
      // Rollback account creation
      await adminClient.from("accounts").delete().eq("id", accountData.id)
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Setup error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
