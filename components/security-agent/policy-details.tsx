"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type { Policy, UserRole } from "@/lib/types/database"
import { format } from "date-fns"
import { FileText, Edit, Settings, Clock, User } from "lucide-react"
import Link from "next/link"

interface PolicyDetailsProps {
  policy: Policy & {
    created_by_user?: { full_name: string | null; email: string } | null
  }
  userRole: UserRole
}

const policyTypeLabels: Record<string, string> = {
  real_time_protection: "Real-time Protection",
  scheduled_scan: "Scheduled Scan",
  exclusions: "Exclusions",
  threat_actions: "Threat Actions",
  network_protection: "Network Protection",
  device_control: "Device Control",
}

export function PolicyDetails({ policy, userRole }: PolicyDetailsProps) {
  const canManage = ["super_admin", "admin"].includes(userRole)

  const renderConfig = () => {
    const config = policy.config as Record<string, unknown>

    switch (policy.type) {
      case "real_time_protection":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Real-time Protection Enabled</Label>
              <Switch checked={config.enabled as boolean} disabled />
            </div>
            <div className="flex items-center justify-between">
              <Label>Scan on File Access</Label>
              <Switch checked={config.scan_on_access as boolean} disabled />
            </div>
            <div className="flex items-center justify-between">
              <Label>Scan on File Write</Label>
              <Switch checked={config.scan_on_write as boolean} disabled />
            </div>
          </div>
        )

      case "scheduled_scan":
        return (
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Schedule</span>
              <span className="font-medium capitalize">{config.schedule as string}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium">{config.time as string}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Scan Type</span>
              <span className="font-medium capitalize">{config.scan_type as string}</span>
            </div>
          </div>
        )

      case "threat_actions":
        return (
          <div className="space-y-4">
            {["critical", "high", "medium", "low", "info"].map((severity) => (
              <div key={severity} className="flex justify-between items-center">
                <Badge
                  variant="outline"
                  className={
                    severity === "critical"
                      ? "bg-red-500/10 text-red-600"
                      : severity === "high"
                        ? "bg-orange-500/10 text-orange-600"
                        : severity === "medium"
                          ? "bg-yellow-500/10 text-yellow-600"
                          : severity === "low"
                            ? "bg-green-500/10 text-green-600"
                            : "bg-blue-500/10 text-blue-600"
                  }
                >
                  {severity}
                </Badge>
                <span className="font-medium capitalize">{(config as Record<string, string>)[severity]}</span>
              </div>
            ))}
          </div>
        )

      case "exclusions":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Excluded Paths</Label>
              <div className="mt-1">
                {((config.paths as string[]) || []).length > 0 ? (
                  <ul className="text-sm space-y-1">
                    {(config.paths as string[]).map((path, i) => (
                      <li key={i} className="font-mono bg-muted px-2 py-1 rounded">
                        {path}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No paths excluded</p>
                )}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Excluded Extensions</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {((config.extensions as string[]) || []).length > 0 ? (
                  (config.extensions as string[]).map((ext, i) => (
                    <Badge key={i} variant="secondary">
                      {ext}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No extensions excluded</p>
                )}
              </div>
            </div>
          </div>
        )

      case "network_protection":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Network Protection Enabled</Label>
              <Switch checked={config.enabled as boolean} disabled />
            </div>
            <div className="flex items-center justify-between">
              <Label>Block Malicious Sites</Label>
              <Switch checked={config.block_malicious as boolean} disabled />
            </div>
          </div>
        )

      case "device_control":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>USB Devices Enabled</Label>
              <Switch checked={config.usb_enabled as boolean} disabled />
            </div>
            <div className="flex items-center justify-between">
              <Label>Allow Read Access</Label>
              <Switch checked={config.allow_read as boolean} disabled />
            </div>
            <div className="flex items-center justify-between">
              <Label>Allow Write Access</Label>
              <Switch checked={config.allow_write as boolean} disabled />
            </div>
          </div>
        )

      default:
        return <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">{JSON.stringify(config, null, 2)}</pre>
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration
            </CardTitle>
            <CardDescription>{policyTypeLabels[policy.type]} settings</CardDescription>
          </div>
          {canManage && (
            <Button asChild>
              <Link href={`/securityAgent/policies/${policy.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Policy
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>{renderConfig()}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Policy Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <Badge variant="outline">{policyTypeLabels[policy.type]}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={policy.is_active ? "default" : "secondary"}>
              {policy.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Default Policy</span>
            <span>{policy.is_default ? "Yes" : "No"}</span>
          </div>
          {policy.description && (
            <div>
              <span className="text-muted-foreground">Description</span>
              <p className="text-sm mt-1">{policy.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Created By</span>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{policy.created_by_user?.full_name || policy.created_by_user?.email || "System"}</span>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span className="text-sm">{format(new Date(policy.created_at), "PPpp")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Updated</span>
            <span className="text-sm">{format(new Date(policy.updated_at), "PPpp")}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
