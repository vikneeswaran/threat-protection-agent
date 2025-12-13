import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ os: string }> }) {
  const { os } = await params
  const searchParams = request.nextUrl.searchParams
  const endpointId = searchParams.get("endpoint_id")
  const agentId = searchParams.get("agent_id")

  // Verify authentication
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()

  if (!profile || !["super_admin", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://kuaminisystems.com/securityAgent/api/agent"

  let script: string
  let filename: string
  let contentType: string

  switch (os.toLowerCase()) {
    case "macos":
      filename = "uninstall-kuamini-agent.sh"
      contentType = "application/x-sh"
      script = generateMacOSUninstaller(baseUrl, endpointId, agentId)
      break
    case "linux":
      filename = "uninstall-kuamini-agent.sh"
      contentType = "application/x-sh"
      script = generateLinuxUninstaller(baseUrl, endpointId, agentId)
      break
    case "windows":
      filename = "uninstall-kuamini-agent.ps1"
      contentType = "application/octet-stream"
      script = generateWindowsUninstaller(baseUrl, endpointId, agentId)
      break
    default:
      return NextResponse.json({ error: "Unsupported OS" }, { status: 400 })
  }

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}

function generateMacOSUninstaller(baseUrl: string, endpointId: string | null, agentId: string | null): string {
  const idParam = endpointId ? `endpoint_id=${endpointId}` : agentId ? `agent_id=${agentId}` : ""
  return `#!/bin/bash
# KuaminiThreatProtectAgent Uninstaller for macOS
# This script will stop and remove the Kuamini agent from your system

set -e

echo "=========================================="
echo "KuaminiThreatProtectAgent Uninstaller"
echo "=========================================="

# Check for root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

echo "[1/4] Stopping agent service..."
launchctl unload /Library/LaunchDaemons/com.kuamini.agent.plist 2>/dev/null || true

echo "[2/4] Removing agent files..."
rm -rf /usr/local/kuamini
rm -rf /etc/kuamini
rm -rf /var/log/kuamini
rm -f /Library/LaunchDaemons/com.kuamini.agent.plist

echo "[3/4] Deregistering from console..."
# Optional: call uninstall API if endpoint/agent ID is known
${idParam ? `curl -s -X POST "${baseUrl}/uninstall?${idParam}" || true` : "echo 'Skipping API deregistration (no endpoint/agent ID provided)'"}

echo "[4/4] Cleanup complete!"
echo ""
echo "=========================================="
echo "Uninstall Complete!"
echo "The Kuamini agent has been removed."
echo "=========================================="
`
}

function generateLinuxUninstaller(baseUrl: string, endpointId: string | null, agentId: string | null): string {
  const idParam = endpointId ? `endpoint_id=${endpointId}` : agentId ? `agent_id=${agentId}` : ""
  return `#!/bin/bash
# KuaminiThreatProtectAgent Uninstaller for Linux
# This script will stop and remove the Kuamini agent from your system

set -e

echo "=========================================="
echo "KuaminiThreatProtectAgent Uninstaller"
echo "=========================================="

# Check for root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

echo "[1/5] Stopping agent service..."
systemctl stop kuamini-agent 2>/dev/null || true

echo "[2/5] Disabling agent service..."
systemctl disable kuamini-agent 2>/dev/null || true

echo "[3/5] Removing agent files..."
rm -rf /opt/kuamini
rm -rf /etc/kuamini
rm -rf /var/log/kuamini
rm -f /etc/systemd/system/kuamini-agent.service

echo "[4/5] Reloading systemd..."
systemctl daemon-reload

echo "[5/5] Deregistering from console..."
${idParam ? `curl -s -X POST "${baseUrl}/uninstall?${idParam}" || true` : "echo 'Skipping API deregistration (no endpoint/agent ID provided)'"}

echo ""
echo "=========================================="
echo "Uninstall Complete!"
echo "The Kuamini agent has been removed."
echo "=========================================="
`
}

function generateWindowsUninstaller(baseUrl: string, endpointId: string | null, agentId: string | null): string {
  const idParam = endpointId ? `endpoint_id=${endpointId}` : agentId ? `agent_id=${agentId}` : ""
  return `# KuaminiThreatProtectAgent Uninstaller for Windows
# This script will stop and remove the Kuamini agent from your system

$ErrorActionPreference = "Stop"

Write-Host "=========================================="
Write-Host "KuaminiThreatProtectAgent Uninstaller"
Write-Host "=========================================="

# Check for admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Please run as Administrator"
    exit 1
}

Write-Host "[1/4] Stopping and removing scheduled task..."
try {
    Unregister-ScheduledTask -TaskName "KuaminiThreatProtectAgent" -Confirm:$false -ErrorAction SilentlyContinue
} catch {
    Write-Host "Task not found or already removed"
}

Write-Host "[2/4] Removing agent files..."
Remove-Item -Recurse -Force "C:\\Program Files\\Kuamini" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "C:\\ProgramData\\Kuamini" -ErrorAction SilentlyContinue

Write-Host "[3/4] Deregistering from console..."
${
  idParam
    ? `try {
    Invoke-RestMethod -Uri "${baseUrl}/uninstall?${idParam}" -Method Post -ErrorAction SilentlyContinue
} catch {
    Write-Host "API deregistration skipped"
}`
    : "Write-Host 'Skipping API deregistration (no endpoint/agent ID provided)'"
}

Write-Host "[4/4] Cleanup complete!"
Write-Host ""
Write-Host "=========================================="
Write-Host "Uninstall Complete!"
Write-Host "The Kuamini agent has been removed."
Write-Host "=========================================="
`
}
