"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Threat } from "@/lib/types/database"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

interface RecentThreatsTableProps {
  threats: Threat[]
}

const severityColors = {
  critical: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  low: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
}

const statusColors = {
  detected: "bg-red-500/10 text-red-600 dark:text-red-400",
  quarantined: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  killed: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  allowed: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  resolved: "bg-green-500/10 text-green-600 dark:text-green-400",
}

export function RecentThreatsTable({ threats }: RecentThreatsTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Threats</CardTitle>
          <CardDescription>Latest detected threats across all endpoints</CardDescription>
        </div>
        <Button variant="outline" asChild>
          <Link href="/securityAgent/threats">View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {threats.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No threats detected</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Threat</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {threats.map((threat) => (
                <TableRow key={threat.id}>
                  <TableCell className="font-medium">{threat.name}</TableCell>
                  <TableCell>{threat.endpoint?.hostname || "Unknown"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={severityColors[threat.severity]}>
                      {threat.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[threat.status]}>
                      {threat.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(threat.detected_at), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
