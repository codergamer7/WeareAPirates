import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Verify the caller is a logged-in admin. Returns the admin client or null.
async function requireAdmin() {
  const user = await getServerUser();
  if (!user) return null;
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (data?.role !== "admin") return null;
  return { admin, callerId: user.id };
}

// List every profile (admin master control panel).
export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await ctx.admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
}

// Perform an admin action on a target user.
export async function POST(req: NextRequest) {
  const ctx = await requireAdmin();
  if (!ctx)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { userId, action, note } = body as {
    userId?: string;
    action?: string;
    note?: string;
  };
  if (!userId || !action)
    return NextResponse.json({ error: "Bad request" }, { status: 400 });

  // Don't let an admin lock themselves out.
  if (userId === ctx.callerId && ["suspend", "delete", "demote"].includes(action))
    return NextResponse.json(
      { error: "You can't apply that action to your own account." },
      { status: 400 },
    );

  const { admin } = ctx;
  let patch: Record<string, unknown> | null = null;

  switch (action) {
    case "approve":
      patch = {
        status: "active",
        approved_at: new Date().toISOString(),
        approved_by: ctx.callerId,
        suspension_note: null,
      };
      break;
    case "reactivate":
      patch = { status: "active", suspension_note: null };
      break;
    case "suspend":
      patch = {
        status: "suspended",
        suspension_note: note?.trim() || "Your account has been suspended.",
      };
      break;
    case "promote":
      patch = { role: "admin", status: "active" };
      break;
    case "demote":
      patch = { role: "user" };
      break;
    case "delete": {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const { error } = await admin.from("profiles").update(patch).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
