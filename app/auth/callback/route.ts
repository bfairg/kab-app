import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";
  const token = url.searchParams.get("token");

  // This is the response we will return (and attach cookies to)
  const nextUrl = new URL(next, url.origin);
  if (token) nextUrl.searchParams.set("token", token);
  const response = NextResponse.redirect(nextUrl);

  if (!code) {
    return response;
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errUrl = new URL("/login", url.origin);
    errUrl.searchParams.set("error", "auth");
    return NextResponse.redirect(errUrl);
  }

  return response;
}
