import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { SecurityHeader } from "@/components/security-agent/header"
import { PolicyDetails } from "@/components/security-agent/policy-details"
import { PolicyEndpoints } from "@/components/security-agent/policy-endpoints"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/securityAgent/auth/login")
  }

  // Get policy details
  const { data: policy } = await supabase
    .from("policies")
    .select(`
      *,
      created_by_user:profiles!policies_created_by_fkey(full_name, email)
    `)
    .eq("id", id)
    .single()

  if (!policy) {
    notFound()
  }

  // Get assigned endpoints
  const { data: assignedEndpoints } = await supabase
    .from("endpoint_policies")
    .select(`
      *,
      endpoint:endpoints(*)
    `)
    .eq("policy_id", id)

  // Get user profile for role check
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  return (
    <>
      <SecurityHeader title={policy.name} subtitle="Policy details and configuration" />

      <main className="flex-1 space-y-6 p-4 md:p-6">
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Configuration</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints ({assignedEndpoints?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6">
            <PolicyDetails policy={policy} userRole={profile?.role || "viewer"} />
          </TabsContent>

          <TabsContent value="endpoints" className="mt-6">
            <PolicyEndpoints
              assignedEndpoints={assignedEndpoints || []}
              policyId={id}
              userRole={profile?.role || "viewer"}
            />
          </TabsContent>
        </Tabs>
      </main>
    </>
  )
}
