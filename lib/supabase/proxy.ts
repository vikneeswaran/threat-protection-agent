import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const pathname = request.nextUrl.pathname

  if (pathname.startsWith("/securityAgent/api/")) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const publicAuthPages = [
    "/securityAgent/auth/login",
    "/securityAgent/auth/register",
    "/securityAgent/auth/verify-email",
    "/securityAgent/auth/error",
    "/securityAgent/auth/callback",
  ]

  const setupPage = "/securityAgent/auth/setup"

  // Protect all /securityAgent routes except public auth pages
  if (
    pathname.startsWith("/securityAgent") &&
    !publicAuthPages.some((page) => pathname.startsWith(page)) &&
    pathname !== setupPage &&
    !user
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/securityAgent/auth/login"
    return NextResponse.redirect(url)
  }

  if ((pathname === "/securityAgent/auth/login" || pathname === "/securityAgent/auth/register") && user) {
    // Check if user has a profile before redirecting to dashboard
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle()

    const url = request.nextUrl.clone()
    if (profile) {
      url.pathname = "/securityAgent/dashboard"
    } else {
      url.pathname = "/securityAgent/auth/setup"
    }
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
