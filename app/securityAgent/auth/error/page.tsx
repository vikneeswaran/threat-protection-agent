import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, AlertTriangle } from "lucide-react"
import Link from "next/link"

const errorMessages: Record<string, string> = {
  profile_creation_failed: "Failed to create your profile. Please try setting up your account again.",
  account_creation_failed: "Failed to create your organization account. Please try again.",
  license_tier_not_found: "License tier not found. Please contact support.",
  default: "An unexpected error occurred during authentication.",
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>
}) {
  const params = await searchParams
  const errorKey = params?.message || params?.error || "default"
  const errorMessage = errorMessages[errorKey] || errorMessages.default

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2">
              <Shield className="h-10 w-10 text-primary" />
              <span className="text-2xl font-bold text-foreground">KuaminiThreatProtect</span>
            </div>
          </div>
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Authentication Error</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
              <div className="flex flex-col gap-2">
                {errorKey === "profile_creation_failed" && (
                  <Button asChild>
                    <Link href="/securityAgent/auth/setup">Complete Setup</Link>
                  </Button>
                )}
                <Button asChild variant={errorKey === "profile_creation_failed" ? "outline" : "default"}>
                  <Link href="/securityAgent/auth/login">Try again</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/securityAgent/auth/register">Create new account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
