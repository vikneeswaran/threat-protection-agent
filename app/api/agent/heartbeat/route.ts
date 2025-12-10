import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agent_id, account_id, status, system_info } = body

    if (!agent_id || !account_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Update endpoint status
    const { data: endpoint, error: updateError } = await supabaseAdmin
      .from("endpoints")
      .update({
        status: status || "online",
        last_seen: new Date().toISOString(),
        system_info: system_info || {},
      })
      .eq("agent_id", agent_id)
      .eq("account_id", account_id)
      .select("id, policies:endpoint_policies(policy:policies(*))")
      .maybeSingle()

    if (updateError) {
      console.error("Failed to update endpoint:", updateError)
      return NextResponse.json({ error: "Failed to update endpoint" }, { status: 500 })
    }

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 })
    }

    // Return assigned policies
    const policies = endpoint.policies?.map((p: any) => p.policy) || []

    return NextResponse.json({
      success: true,
      policies,
    })
  } catch (error) {
    console.error("Heartbeat error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
