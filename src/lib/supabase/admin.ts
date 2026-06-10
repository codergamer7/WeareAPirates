import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. SERVER ONLY. Never import in client code.
// Used by /api/admin/* after the caller has been verified as an admin.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
