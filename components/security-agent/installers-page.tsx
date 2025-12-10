"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Download, Monitor, Apple, Terminal, Copy, CheckCircle, Info, Server } from "lucide-react"
import { toast } from "sonner"
import type { Profile, Account } from "@/lib/types/database"

interface InstallersPageProps {
  profile: Profile
  account: Account
}

export function InstallersPage({ profile, account }: InstallersPageProps) {
  const router = useRouter()
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)
  const [baseUrl, setBaseUrl] = useState("")

  useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  const registrationToken = Buffer.from(
    JSON.stringify({
      accountId: account.id,
      accountName: account.name,
      timestamp: Date.now(),
    }),
  ).toString("base64")

  const copyToClipboard = async (text: string, commandType: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedCommand(commandType)
    toast.success("Copied to clipboard!")
    setTimeout(() => setCopiedCommand(null), 2000)
  }

  const openScriptPage = (os: string) => {
    router.push(`/securityAgent/installers/script/${os}?token=${registrationToken}`)
  }

  const availableLicenses = account.total_licenses - account.used_licenses

  const installers = [
    {
      id: "windows",
      name: "Windows",
      icon: Monitor,
      version: "1.0.0",
      size: "~5 KB",
      requirements: "Windows 10/11, Server 2016+, PowerShell 5.1+",
      filename: "install-kuamini-agent.ps1",
      description:
        "PowerShell installer script that sets up the agent as a Windows Scheduled Task with automatic startup.",
    },
    {
      id: "macos",
      name: "macOS",
      icon: Apple,
      version: "1.0.0",
      size: "~4 KB",
      requirements: "macOS 11 (Big Sur) or later",
      filename: "install-kuamini-agent.sh",
      description: "Shell script that installs the agent as a LaunchDaemon for persistent protection.",
    },
    {
      id: "linux",
      name: "Linux",
      icon: Terminal,
      version: "1.0.0",
      size: "~4 KB",
      requirements: "Ubuntu 20.04+, RHEL 8+, Debian 10+, systemd",
      filename: "install-kuamini-agent.sh",
      description: "Shell script that installs the agent as a systemd service for continuous monitoring.",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">SecurityAgent Installers</h1>
        <p className="text-muted-foreground mt-1">Download and install KuaminiThreatProtectAgent on your endpoints</p>
      </div>

      <Alert variant={availableLicenses > 0 ? "default" : "destructive"}>
        <Info className="h-4 w-4" />
        <AlertTitle>License Status</AlertTitle>
        <AlertDescription>
          {availableLicenses > 0 ? (
            <>
              You have <strong>{availableLicenses}</strong> available license(s) out of{" "}
              <strong>{account.total_licenses}</strong> total. Each new endpoint installation will consume one license.
            </>
          ) : (
            <>
              You have no available licenses. Please upgrade your plan or allocate more licenses to install agents on
              new endpoints.
            </>
          )}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Installation Details
          </CardTitle>
          <CardDescription>
            Agents installed using these links will be automatically associated with your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Account</p>
              <p className="font-medium">{account.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Account ID</p>
              <p className="font-mono text-sm">{account.id.slice(0, 8)}...</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">License Tier</p>
              <Badge variant="secondary">{account.license_tier?.name || "Free"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="macos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          {installers.map((installer) => (
            <TabsTrigger key={installer.id} value={installer.id} className="flex items-center gap-2">
              <installer.icon className="h-4 w-4" />
              {installer.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {installers.map((installer) => (
          <TabsContent key={installer.id} value={installer.id}>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <installer.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        KuaminiThreatProtectAgent for {installer.name}
                        <Badge variant="outline">v{installer.version}</Badge>
                      </CardTitle>
                      <CardDescription>{installer.description}</CardDescription>
                    </div>
                  </div>
                  <Button size="lg" disabled={availableLicenses <= 0} onClick={() => openScriptPage(installer.id)}>
                    <Download className="h-4 w-4 mr-2" />
                    Get Installer Script
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Script Size</p>
                    <p className="font-medium">{installer.size}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Requirements</p>
                    <p className="font-medium">{installer.requirements}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Filename</p>
                    <p className="font-mono text-sm">{installer.filename}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Quick Installation Steps</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Click "Get Installer Script" button above</li>
                    <li>On the script page, click "Download Script" or "Copy Script"</li>
                    <li>Run the script with administrator/root privileges on your endpoint</li>
                    <li>The agent will automatically register with this account</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registration Token</CardTitle>
          <CardDescription>
            This token is unique to your account and is used to associate installed agents with your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted p-3 rounded-lg text-sm font-mono break-all">{registrationToken}</code>
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(registrationToken, "token")}>
              {copiedCommand === "token" ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Note: This token contains your account information and should be kept secure.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
