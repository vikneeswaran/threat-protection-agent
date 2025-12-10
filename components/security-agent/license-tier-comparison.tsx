"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { LicenseTier } from "@/lib/types/database"
import { Check, Star } from "lucide-react"

interface LicenseTierComparisonProps {
  tiers: LicenseTier[]
  currentTierId: string | null
}

const tierColors = {
  free: "border-gray-200 dark:border-gray-700",
  basic: "border-blue-200 dark:border-blue-700",
  pro: "border-purple-200 dark:border-purple-700",
  enterprise: "border-amber-200 dark:border-amber-700",
}

const tierBadgeColors = {
  free: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  basic: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  pro: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  enterprise: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
}

export function LicenseTierComparison({ tiers, currentTierId }: LicenseTierComparisonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Available Plans
        </CardTitle>
        <CardDescription>Compare license tiers and upgrade</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tiers.map((tier) => {
          const isCurrent = tier.id === currentTierId
          return (
            <div
              key={tier.id}
              className={`p-4 rounded-lg border-2 ${tierColors[tier.name as keyof typeof tierColors] || tierColors.free} ${isCurrent ? "bg-accent" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className={tierBadgeColors[tier.name as keyof typeof tierBadgeColors] || tierBadgeColors.free}>
                    {tier.name.toUpperCase()}
                  </Badge>
                  {isCurrent && (
                    <Badge variant="outline" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
                <span className="font-bold">
                  {tier.price_per_endpoint === 0 ? (
                    "Free"
                  ) : (
                    <>
                      ${tier.price_per_endpoint}
                      <span className="text-xs text-muted-foreground">/endpoint/mo</span>
                    </>
                  )}
                </span>
              </div>
              <div className="text-sm space-y-1 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-500" />
                  {tier.min_endpoints === tier.max_endpoints
                    ? `${tier.max_endpoints} endpoints`
                    : `${tier.min_endpoints.toLocaleString()} - ${tier.max_endpoints.toLocaleString()} endpoints`}
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-500" />
                  {tier.support_type === "none"
                    ? "No support"
                    : tier.support_type === "email"
                      ? "Email support"
                      : "Email & Phone support"}
                </div>
                {tier.response_time && (
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-500" />
                    {tier.response_time} response
                  </div>
                )}
                {tier.trial_days > 0 && (
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-500" />
                    {tier.trial_days} day trial
                  </div>
                )}
              </div>
              {!isCurrent && tier.name !== "free" && (
                <Button size="sm" variant="outline" className="mt-3 w-full bg-transparent">
                  {tier.price_per_endpoint > 0 ? "Upgrade" : "Switch"}
                </Button>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
