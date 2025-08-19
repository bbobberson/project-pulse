import { NextRequest, NextResponse } from "next/server";
import { createServerClient, CookieOptions } from "@supabase/ssr";
import { cookies as nextCookies } from "next/headers";

export async function GET(req: NextRequest) {
  const store = await nextCookies();

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

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  // Get PM user data from database
  const { data: pmUser } = await supabase
    .from('pm_users')
    .select('*')
    .eq('id', user.id)
    .single();

  return NextResponse.json({ 
    user: { id: user.id, email: user.email }, 
    pmUser: pmUser || null 
  });
}