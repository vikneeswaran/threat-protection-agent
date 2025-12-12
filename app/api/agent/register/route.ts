import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, hostname, os, os_version, agent_version, agent_id } = body

    if (!token || !hostname || !os) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Decode token
    let accountId: string
    try {
      const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"))
      accountId = decoded.accountId
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 })
    }

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Check if endpoint already exists
    const { data: existingEndpoint } = await supabaseAdmin
      .from("endpoints")
      .select("id")
      .eq("agent_id", agent_id)
      .maybeSingle()

    if (existingEndpoint) {
      // Update existing endpoint
      const { error: updateError } = await supabaseAdmin
        .from("endpoints")
        .update({
          hostname,
          os,
          os_version,
          agent_version,
          status: "online",
          last_seen: new Date().toISOString(),
        })
        .eq("agent_id", agent_id)

      if (updateError) {
        console.error("Failed to update endpoint:", updateError)
        return NextResponse.json({ error: "Failed to update endpoint" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: "Endpoint updated",
        endpoint_id: existingEndpoint.id,
      })
    }

    // Register new endpoint
    const { data: newEndpoint, error: insertError } = await supabaseAdmin
      .from("endpoints")
      .insert({
        account_id: accountId,
        agent_id,
        hostname,
        os,
        os_version,
        agent_version,
        status: "online",
        last_seen: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (insertError) {
      console.error("Failed to register endpoint:", insertError)
      return NextResponse.json({ error: "Failed to register endpoint" }, { status: 500 })
    }

    // Log the registration
    await supabaseAdmin.from("audit_logs").insert({
      account_id: accountId,
      action: "endpoint_registered",
      entity_type: "endpoint",
      entity_id: newEndpoint.id,
      details: { hostname, os, os_version, agent_version, agent_id },
    })

    return NextResponse.json({
      success: true,
      message: "Endpoint registered",
      endpoint_id: newEndpoint.id,
    })
  } catch (error) {
    console.error("Registration error:", error)
    const isDebug = process.env.DEBUG_REGISTRATION === "true" || process.env.NODE_ENV !== "production"
    const errMessage = error instanceof Error ? error.message : String(error)
    const payload = isDebug
      ? { error: "Internal server error", details: errMessage, stack: error instanceof Error ? error.stack : undefined }
      : { error: "Internal server error" }
    return NextResponse.json(payload, { status: 500 })
  }
}
