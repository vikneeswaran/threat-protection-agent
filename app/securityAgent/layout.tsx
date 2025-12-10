import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "KuaminiThreatProtectAgent - Security Console",
  description: "Enterprise threat protection management console",
}

export default function SecurityAgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
