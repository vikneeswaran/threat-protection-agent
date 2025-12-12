import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Use service role to bypass RLS for agent registration
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, hostname, os, os_version, agent_version, ip_address, mac_address } = body

    if (!token) {
      return NextResponse.json({ error: "Registration token is required" }, { status: 400 })
    }

    // Decode the registration token
    let tokenData: { accountId: string; accountName: string; timestamp: number }
    try {
      tokenData = JSON.parse(Buffer.from(token, "base64").toString("utf-8"))
    } catch {
      return NextResponse.json({ error: "Invalid registration token" }, { status: 400 })
    }

    const { accountId } = tokenData

    // Verify the account exists and is active
    const { data: account, error: accountError } = await supabaseAdmin
      .from("accounts")
      .select("*, license_tier:license_tiers(*)")
      .eq("id", accountId)
      .eq("is_active", true)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: "Invalid or inactive account" }, { status: 400 })
    }

    // Check if there are available licenses
    const availableLicenses = account.total_licenses - account.used_licenses
    if (availableLicenses <= 0) {
      return NextResponse.json(
        { error: "No available licenses. Please upgrade your plan or allocate more licenses." },
        { status: 403 },
      )
    }

    // Check if endpoint with same hostname and mac_address already exists for this account
    const { data: existingEndpoint } = await supabaseAdmin
      .from("endpoints")
      .select("id")
      .eq("account_id", accountId)
      .eq("hostname", hostname)
      .eq("mac_address", mac_address)
      .maybeSingle()

    if (existingEndpoint) {
      // Update existing endpoint
      const { data: updatedEndpoint, error: updateError } = await supabaseAdmin
        .from("endpoints")
        .update({
          os,
          os_version,
          agent_version,
          ip_address,
          status: "online",
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingEndpoint.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: "Failed to update endpoint" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        endpoint_id: updatedEndpoint.id,
        message: "Endpoint re-registered successfully",
      })
    }

    // Create new endpoint
    const { data: endpoint, error: endpointError } = await supabaseAdmin
      .from("endpoints")
      .insert({
        account_id: accountId,
        hostname,
        os,
        os_version,
        agent_version,
        ip_address,
        mac_address,
        status: "online",
        last_seen_at: new Date().toISOString(),
        registered_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (endpointError) {
      return NextResponse.json({ error: "Failed to register endpoint" }, { status: 500 })
    }

    // Increment used_licenses on the account
    await supabaseAdmin
      .from("accounts")
      .update({ used_licenses: account.used_licenses + 1 })
      .eq("id", accountId)

    // Create audit log
    await supabaseAdmin.from("audit_logs").insert({
      account_id: accountId,
      action: "create",
      entity_type: "endpoint",
      entity_id: endpoint.id,
      details: {
        hostname,
        os,
        agent_version,
        ip_address,
      },
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    })

    return NextResponse.json({
      success: true,
      endpoint_id: endpoint.id,
      message: "Endpoint registered successfully",
    })
  } catch (error) {
    console.error("Agent registration error:", error)
    const isDebug = process.env.DEBUG_REGISTRATION === "true" || process.env.NODE_ENV !== "production"
    const errMessage = error instanceof Error ? error.message : String(error)
    const payload = isDebug
      ? { error: "Internal server error", details: errMessage, stack: error instanceof Error ? error.stack : undefined }
      : { error: "Internal server error" }
    return NextResponse.json(payload, { status: 500 })
  }
}
