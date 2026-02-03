import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";
  const token = url.searchParams.get("token"); // your claim token

  const response = NextResponse.redirect(new URL(next, url.origin));

  if (!code) {
    // No code, just send them onward
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
        getAll: () => request.headers.get("cookie")?.split(";").map((c) => {
          const [name, ...rest] = c.trim().split("=");
          return { name, value: rest.join("=") };
        }) || [],
        setAll: (cookiesToSet) => {
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

  // Preserve claim token to the next page
  if (token) {
    const nextUrl = new URL(next, url.origin);
    nextUrl.searchParams.set("token", token);
    return NextResponse.redirect(nextUrl);
  }

  return response;
}
