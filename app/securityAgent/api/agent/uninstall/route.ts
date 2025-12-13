import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

function getUninstallCommands(os: string) {
  switch (os.toLowerCase()) {
    case "macos":
      return {
        os: "macos",
        commands: [
          "sudo launchctl unload /Library/LaunchDaemons/com.kuamini.agent.plist || true",
          "sudo rm -rf /usr/local/kuamini /etc/kuamini /var/log/kuamini /Library/LaunchDaemons/com.kuamini.agent.plist",
        ],
      }
    case "linux":
      return {
        os: "linux",
        commands: [
          "sudo systemctl stop kuamini-agent || true",
          "sudo systemctl disable kuamini-agent || true",
          "sudo rm -rf /opt/kuamini /etc/kuamini /var/log/kuamini /etc/systemd/system/kuamini-agent.service",
          "sudo systemctl daemon-reload",
        ],
      }
    case "windows":
      return {
        os: "windows",
        commands: [
          "powershell -Command \"Unregister-ScheduledTask -TaskName 'KuaminiThreatProtectAgent' -Confirm:$false -ErrorAction SilentlyContinue; Remove-Item -Recurse -Force 'C:\\Program Files\\Kuamini','C:\\ProgramData\\Kuamini' -ErrorAction SilentlyContinue\"",
        ],
      }
    default:
      return { os, commands: [] }
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { endpoint_id, agent_id, os } = await request.json()

    if (!endpoint_id && !agent_id) {
      return NextResponse.json({ error: "endpoint_id or agent_id is required" }, { status: 400 })
    }

    const admin = createAdminClient()

    // Get profile/role
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, account_id, role")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    if (!["super_admin", "admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Locate endpoint within the admin's account
    const endpointQuery = admin
      .from("endpoints")
      .select("id, account_id, hostname, os, agent_id, mac_address, ip_address")
      .eq("account_id", profile.account_id)
      .limit(1)

    if (endpoint_id) {
      endpointQuery.eq("id", endpoint_id)
    }

    if (!endpoint_id && agent_id) {
      endpointQuery.eq("agent_id", agent_id)
    }

    const { data: endpoint, error: endpointError } = await endpointQuery.maybeSingle()

    if (endpointError || !endpoint) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 })
    }

    // Delete endpoint (triggers will decrement used_licenses)
    const { error: deleteError } = await admin.from("endpoints").delete().eq("id", endpoint.id)

    if (deleteError) {
      console.error("Failed to delete endpoint:", deleteError)
      return NextResponse.json({ error: "Failed to delete endpoint" }, { status: 500 })
    }

    // Audit log
    await admin.from("audit_logs").insert({
      account_id: endpoint.account_id,
      user_id: user.id,
      action: "delete",
      entity_type: "endpoint",
      entity_id: endpoint.id,
      details: {
        hostname: endpoint.hostname,
        agent_id: endpoint.agent_id,
        mac_address: endpoint.mac_address,
        ip_address: endpoint.ip_address,
      },
    })

    const uninstall = getUninstallCommands(os || endpoint.os || "")

    return NextResponse.json({
      success: true,
      endpoint_id: endpoint.id,
      account_id: endpoint.account_id,
      uninstall,
    })
  } catch (error) {
    console.error("Uninstall agent error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
