import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_CONFIGURED } from "@/lib/config";

// Server-side Supabase client bound to the request cookies. Returns null when
// env isn't configured. Used in route handlers / server components.
export async function createSupabaseServerClient() {
  if (!SUPABASE_CONFIGURED) return null;
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from a server component — safe to ignore, middleware refreshes
          }
        },
      },
    },
  );
}

// Resolve the currently authenticated user (or null).
export async function getServerUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
