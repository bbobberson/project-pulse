import { NextRequest, NextResponse } from "next/server";
import { createServerClient, CookieOptions } from "@supabase/ssr";
import { cookies as nextCookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  // ✅ await the async cookie store (Next 15 requirement)
  const store = await nextCookies();

  // ✅ old helper expects getAll / setAll
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (all) =>
          all.forEach((c) =>
            store.set(c.name, c.value, c.options as CookieOptions)
          ),
      },
    }
  );

  const { data, error } =
    await supabase.auth.signInWithPassword({ email, password });

  console.log('supabase sign-in ►', { data, error });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  // attach session cookies & redirect to dashboard
  const res = NextResponse.redirect(new URL("/dashboard", req.url), {
    status: 302,
  });
  supabase.auth.setSession(data.session, { response: res });
  return res;
}