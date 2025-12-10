"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { AuditLog } from "@/lib/types/database"
import { format } from "date-fns"
import { ClipboardList, Eye } from "lucide-react"

interface AuditLogsListProps {
  logs: Array<
    AuditLog & {
      user: { full_name: string | null; email: string } | null
    }
  >
}

const actionLabels: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  create: "Create",
  update: "Update",
  delete: "Delete",
  policy_change: "Policy Change",
  policy_assign: "Policy Assign",
  policy_unassign: "Policy Unassign",
  threat_action: "Threat Action",
  license_allocate: "License Allocate",
  license_revoke: "License Revoke",
  user_create: "User Create",
  user_update: "User Update",
  user_delete: "User Delete",
  account_create: "Account Create",
  account_update: "Account Update",
  settings_change: "Settings Change",
}

const actionColors: Record<string, string> = {
  login: "bg-green-500/10 text-green-600 dark:text-green-400",
  logout: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  create: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  update: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  delete: "bg-red-500/10 text-red-600 dark:text-red-400",
  policy_change: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  threat_action: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  license_allocate: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  license_revoke: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  user_create: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  user_delete: "bg-red-500/10 text-red-600 dark:text-red-400",
  account_create: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  settings_change: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
}

export function AuditLogsList({ logs }: AuditLogsListProps) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Audit Logs</h3>
          <p className="text-muted-foreground text-center max-w-sm">No activity logs match your current filters.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Activity Log
        </CardTitle>
        <CardDescription>
          {logs.length} log entr{logs.length !== 1 ? "ies" : "y"} found
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <Badge variant="secondary" className={actionColors[log.action] || actionColors.create}>
                    {actionLabels[log.action] || log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{log.user?.full_name || "System"}</p>
                    {log.user?.email && <p className="text-xs text-muted-foreground">{log.user.email}</p>}
                  </div>
                </TableCell>
                <TableCell>
                  {log.entity_type ? (
                    <Badge variant="outline" className="capitalize">
                      {log.entity_type}
                    </Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm">{log.ip_address || "-"}</TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(log.created_at), "PPp")}</TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Audit Log Details</DialogTitle>
                        <DialogDescription>{format(new Date(log.created_at), "PPpp")}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Action</p>
                            <Badge variant="secondary" className={actionColors[log.action]}>
                              {actionLabels[log.action] || log.action}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">User</p>
                            <p className="font-medium">{log.user?.full_name || log.user?.email || "System"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Entity Type</p>
                            <p className="font-medium capitalize">{log.entity_type || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">IP Address</p>
                            <p className="font-mono text-sm">{log.ip_address || "N/A"}</p>
                          </div>
                        </div>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Details</p>
                            <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.user_agent && (
                          <div>
                            <p className="text-sm text-muted-foreground">User Agent</p>
                            <p className="text-xs font-mono bg-muted p-2 rounded">{log.user_agent}</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
