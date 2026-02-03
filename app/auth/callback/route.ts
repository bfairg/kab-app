import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";
  const token = url.searchParams.get("token"); // claim token we carry through

  const response = NextResponse.redirect(new URL(next, url.origin));

  if (!code) {
    // No code present, just continue to next (keeping token if present)
    if (token) {
      const nextUrl = new URL(next, url.origin);
      nextUrl.searchParams.set("token", token);
      return NextResponse.redirect(nextUrl);
    }
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=auth`, url.origin));
  }

  // Preserve claim token onto the redirect
  if (token) {
    const nextUrl = new URL(next, url.origin);
    nextUrl.searchParams.set("token", token);
    return NextResponse.redirect(nextUrl);
  }

  return response;
}
