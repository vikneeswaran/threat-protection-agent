"use client"

import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, Shield, AlertCircle, CheckCircle } from "lucide-react"

interface ThreatStatsProps {
  stats: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
    info: number
    detected: number
    quarantined: number
    resolved: number
  }
}

export function ThreatStats({ stats }: ThreatStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.detected}</p>
              <p className="text-sm text-muted-foreground">Active Threats</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-orange-500/10">
              <AlertCircle className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.critical + stats.high}</p>
              <p className="text-sm text-muted-foreground">Critical & High</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-500/10">
              <Shield className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.quarantined}</p>
              <p className="text-sm text-muted-foreground">Quarantined</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.resolved}</p>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
