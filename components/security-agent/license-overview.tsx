"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import type { Account, LicenseTier } from "@/lib/types/database"
import { formatDistanceToNow } from "date-fns"

interface LicenseOverviewProps {
  account: Account & { license_tier: LicenseTier }
}

export function LicenseOverview({ account }: LicenseOverviewProps) {
  const usedPercentage = account.total_licenses > 0 ? (account.used_licenses / account.total_licenses) * 100 : 0

  const availableLicenses = account.total_licenses - account.used_licenses - account.allocated_licenses

  const isExpiringSoon = account.license_expires_at
    ? new Date(account.license_expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : false

  const tierColors = {
    free: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    basic: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    pro: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    enterprise: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>License Overview</CardTitle>
          <CardDescription>Your current license usage</CardDescription>
        </div>
        <Badge className={tierColors[account.license_tier?.name as keyof typeof tierColors] || tierColors.free}>
          {account.license_tier?.name?.toUpperCase() || "FREE"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Licenses Used</span>
            <span className="font-medium">
              {account.used_licenses} / {account.total_licenses}
            </span>
          </div>
          <Progress value={usedPercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{availableLicenses}</p>
            <p className="text-xs text-muted-foreground">Available</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{account.used_licenses}</p>
            <p className="text-xs text-muted-foreground">In Use</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{account.allocated_licenses}</p>
            <p className="text-xs text-muted-foreground">Allocated</p>
          </div>
        </div>

        {account.license_expires_at && (
          <div className={`text-sm ${isExpiringSoon ? "text-destructive" : "text-muted-foreground"}`}>
            {isExpiringSoon ? "⚠️ " : ""}
            License expires {formatDistanceToNow(new Date(account.license_expires_at), { addSuffix: true })}
          </div>
        )}

        {account.license_tier && (
          <div className="text-xs text-muted-foreground border-t pt-4">
            <p>
              <strong>Support:</strong>{" "}
              {account.license_tier.support_type === "none"
                ? "No support"
                : account.license_tier.support_type === "email"
                  ? "Email support"
                  : "Email & Phone support"}
            </p>
            {account.license_tier.response_time && (
              <p>
                <strong>Response time:</strong> {account.license_tier.response_time}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
