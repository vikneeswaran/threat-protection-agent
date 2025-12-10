"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface AuditLogsFiltersProps {
  currentFilters: {
    action?: string
    user?: string
    date?: string
  }
  users: Array<{ id: string; full_name: string | null; email: string }>
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

export function AuditLogsFilters({ currentFilters, users }: AuditLogsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={currentFilters.action || "all"} onValueChange={(value) => updateFilter("action", value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {Object.entries(actionLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={currentFilters.user || "all"} onValueChange={(value) => updateFilter("user", value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
