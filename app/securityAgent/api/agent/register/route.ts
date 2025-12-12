import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Use service role to bypass RLS for agent registration
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, hostname, os, os_version, agent_version, ip_address, mac_address, agent_id } = body

    if (!token) {
      return NextResponse.json({ error: "Registration token is required" }, { status: 400 })
    }

    // Decode the registration token
      let accountId: string
      try {
        const cleaned = String(token).replace(/\s+/g, "")
        const decodedStr = Buffer.from(cleaned, "base64").toString("utf-8")
        const decoded = JSON.parse(decodedStr)
        accountId = decoded.accountId
      } catch (e) {
        console.error("Invalid registration token decode error:", e)
        return NextResponse.json({ error: "Invalid token" }, { status: 400 })
    }

    

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

    // Check if endpoint already exists — prefer `agent_id` when provided, otherwise fall back to mac+hostname
    let existingEndpoint: any = null
    if (agent_id) {
      const { data } = await supabaseAdmin.from("endpoints").select("id").eq("agent_id", agent_id).maybeSingle()
      existingEndpoint = data
    } else {
      const { data } = await supabaseAdmin
        .from("endpoints")
        .select("id")
        .eq("account_id", accountId)
        .eq("hostname", hostname)
        .eq("mac_address", mac_address)
        .maybeSingle()
      existingEndpoint = data
    }

    if (existingEndpoint) {
      const updateQuery = supabaseAdmin.from("endpoints").update({
        os,
        os_version,
        agent_version,
        ip_address,
        mac_address,
        agent_id: agent_id || null,
        status: "online",
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (agent_id) {
        updateQuery.eq("agent_id", agent_id)
      } else {
        updateQuery.eq("id", existingEndpoint.id)
      }

      const { data: updatedEndpoint, error: updateError } = await updateQuery.select().single()

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
        agent_id: agent_id || null,
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
