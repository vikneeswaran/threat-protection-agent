"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Policy, UserRole } from "@/lib/types/database"
import { formatDistanceToNow } from "date-fns"
import { MoreHorizontal, FileText, Edit, Trash2, Copy, Eye, Monitor } from "lucide-react"
import Link from "next/link"

interface PoliciesListProps {
  policies: Array<
    Policy & {
      created_by_user?: { full_name: string | null; email: string } | null
    }
  >
  policyUsage: Record<string, number>
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

const policyTypeColors: Record<string, string> = {
  real_time_protection: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  scheduled_scan: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  exclusions: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  threat_actions: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  network_protection: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  device_control: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
}

export function PoliciesList({ policies, policyUsage, userRole }: PoliciesListProps) {
  const canManage = ["super_admin", "admin"].includes(userRole)

  if (policies.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Policies</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            Create policies to define how threats are handled on your endpoints.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Policies</CardTitle>
        <CardDescription>
          {policies.length} polic{policies.length !== 1 ? "ies" : "y"} configured
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Policy Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Endpoints</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.map((policy) => (
              <TableRow key={policy.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{policy.name}</p>
                    {policy.description && (
                      <p className="text-xs text-muted-foreground max-w-[200px] truncate">{policy.description}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={policyTypeColors[policy.type]}>
                    {policyTypeLabels[policy.type] || policy.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    <Monitor className="h-3 w-3 mr-1" />
                    {policyUsage[policy.id] || 0}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Badge variant={policy.is_active ? "default" : "secondary"}>
                      {policy.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {policy.is_default && (
                      <Badge variant="outline" className="bg-primary/10">
                        Default
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {policy.created_by_user?.full_name || policy.created_by_user?.email || "System"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDistanceToNow(new Date(policy.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/securityAgent/policies/${policy.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      {canManage && (
                        <>
                          <DropdownMenuItem asChild>
                            <Link href={`/securityAgent/policies/${policy.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Policy
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Policy
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
