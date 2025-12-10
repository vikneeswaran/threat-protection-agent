"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import { useState, useEffect } from "react"
import { useDebounce } from "@/hooks/use-debounce"

interface ThreatFiltersProps {
  stats: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
    info: number
  }
  currentFilters: {
    severity?: string
    status?: string
    search?: string
  }
}

export function ThreatFilters({ stats, currentFilters }: ThreatFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(currentFilters.search || "")
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (debouncedSearch) {
      params.set("search", debouncedSearch)
    } else {
      params.delete("search")
    }
    router.push(`?${params.toString()}`)
  }, [debouncedSearch, router, searchParams])

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
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search threats by name or file path..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={currentFilters.severity || "all"} onValueChange={(value) => updateFilter("severity", value)}>
            <SelectTrigger className="w-full md:w-44">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical ({stats.critical})</SelectItem>
              <SelectItem value="high">High ({stats.high})</SelectItem>
              <SelectItem value="medium">Medium ({stats.medium})</SelectItem>
              <SelectItem value="low">Low ({stats.low})</SelectItem>
              <SelectItem value="info">Info ({stats.info})</SelectItem>
            </SelectContent>
          </Select>

          <Select value={currentFilters.status || "all"} onValueChange={(value) => updateFilter("status", value)}>
            <SelectTrigger className="w-full md:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="detected">Detected</SelectItem>
              <SelectItem value="quarantined">Quarantined</SelectItem>
              <SelectItem value="killed">Killed</SelectItem>
              <SelectItem value="allowed">Allowed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
