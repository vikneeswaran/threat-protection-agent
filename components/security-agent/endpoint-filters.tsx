"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Monitor } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useDebounce } from "@/hooks/use-debounce"

interface EndpointFiltersProps {
  stats: {
    total: number
    online: number
    offline: number
    disconnected: number
    windows: number
    macos: number
    linux: number
  }
  currentFilters: {
    status?: string
    os?: string
    search?: string
  }
}

export function EndpointFilters({ stats, currentFilters }: EndpointFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(currentFilters.search || "")
  const debouncedSearch = useDebounce(search, 300)
  const isInitialMount = useRef(true)
  const previousSearch = useRef(currentFilters.search || "")

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (debouncedSearch === previousSearch.current) {
      return
    }

    previousSearch.current = debouncedSearch

    const params = new URLSearchParams(searchParams.toString())
    if (debouncedSearch) {
      params.set("search", debouncedSearch)
    } else {
      params.delete("search")
    }
    router.push(`${pathname}?${params.toString()}`)
  }, [debouncedSearch, router, searchParams, pathname])

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Stats badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Monitor className="h-3 w-3" />
              {stats.total} Total
            </Badge>
            <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
              {stats.online} Online
            </Badge>
            <Badge
              variant="outline"
              className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
            >
              {stats.offline} Offline
            </Badge>
            <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
              {stats.disconnected} Disconnected
            </Badge>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search endpoints..."
                className="pl-8 w-full sm:w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={currentFilters.status || "all"} onValueChange={(value) => updateFilter("status", value)}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="disconnected">Disconnected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={currentFilters.os || "all"} onValueChange={(value) => updateFilter("os", value)}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="OS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All OS</SelectItem>
                <SelectItem value="windows">Windows ({stats.windows})</SelectItem>
                <SelectItem value="macos">macOS ({stats.macos})</SelectItem>
                <SelectItem value="linux">Linux ({stats.linux})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
