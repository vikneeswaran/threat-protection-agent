"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface EndpointStatusChartProps {
  data: {
    online: number
    offline: number
    disconnected: number
  }
}

export function EndpointStatusChart({ data }: EndpointStatusChartProps) {
  const chartData = [
    { name: "Online", value: data.online, color: "#22c55e" },
    { name: "Offline", value: data.offline, color: "#eab308" },
    { name: "Disconnected", value: data.disconnected, color: "#ef4444" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Endpoint Status</CardTitle>
        <CardDescription>Current status of all endpoints</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={100} />
            <Tooltip />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
