import { redirect } from "next/navigation"

export default function SecurityAgentPage() {
  redirect("/securityAgent/auth/login")
}
