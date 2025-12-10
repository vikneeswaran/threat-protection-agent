import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint_id, name, description, severity, file_path, file_hash, process_name, detection_engine } = body

    if (!endpoint_id || !name || !severity) {
      return NextResponse.json({ error: "endpoint_id, name, and severity are required" }, { status: 400 })
    }

    // Get the endpoint to find the account
    const { data: endpoint, error: endpointError } = await supabaseAdmin
      .from("endpoints")
      .select("account_id")
      .eq("id", endpoint_id)
      .single()

    if (endpointError || !endpoint) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 })
    }

    // Create the threat record
    const { data: threat, error: threatError } = await supabaseAdmin
      .from("threats")
      .insert({
        account_id: endpoint.account_id,
        endpoint_id,
        name,
        description,
        severity,
        status: "detected",
        file_path,
        file_hash,
        process_name,
        detection_engine,
        detected_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (threatError) {
      return NextResponse.json({ error: "Failed to create threat record" }, { status: 500 })
    }

    // Create audit log
    await supabaseAdmin.from("audit_logs").insert({
      account_id: endpoint.account_id,
      action: "create",
      entity_type: "threat",
      entity_id: threat.id,
      details: {
        name,
        severity,
        endpoint_id,
        detection_engine,
      },
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    })

    // Check if there's an auto-action policy for this severity
    const { data: threatActionPolicies } = await supabaseAdmin
      .from("policies")
      .select("config")
      .eq("account_id", endpoint.account_id)
      .eq("type", "threat_actions")
      .eq("is_active", true)

    let autoAction = null
    for (const policy of threatActionPolicies || []) {
      const config = policy.config as Record<string, unknown>
      const severityActions = config[severity] as { auto_action?: string } | undefined
      if (severityActions?.auto_action) {
        autoAction = severityActions.auto_action
        break
      }
    }

    return NextResponse.json({
      success: true,
      threat_id: threat.id,
      auto_action: autoAction,
    })
  } catch (error) {
    console.error("Threat report error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
