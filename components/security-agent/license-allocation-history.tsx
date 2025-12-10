"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { History, ArrowRight } from "lucide-react"

interface Allocation {
  id: string
  quantity: number
  allocated_at: string
  revoked_at: string | null
  to_account: { name: string } | null
  allocated_by_user: { full_name: string | null; email: string } | null
}

interface LicenseAllocationHistoryProps {
  allocations: Allocation[]
}

export function LicenseAllocationHistory({ allocations }: LicenseAllocationHistoryProps) {
  if (allocations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Allocation History
          </CardTitle>
          <CardDescription>License allocations to sub-accounts</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <History className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">No license allocations yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Allocation History
        </CardTitle>
        <CardDescription>Recent license allocations to sub-accounts</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>To Account</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((allocation) => (
              <TableRow key={allocation.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    {allocation.to_account?.name || "Unknown"}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">+{allocation.quantity}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={allocation.revoked_at ? "destructive" : "default"}>
                    {allocation.revoked_at ? "Revoked" : "Active"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(allocation.allocated_at), "PP")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
