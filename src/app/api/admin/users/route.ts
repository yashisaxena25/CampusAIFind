import { NextRequest, NextResponse } from "next/server";
import { getAdminUsers, updateAdminUserStatus } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access only." }, { status: 403 });

  const users = await getAdminUsers();
  return NextResponse.json({ users });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access only." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { userId, action } = body as { userId: string; action: "ban" | "unban" };
  if (userId === admin.id) {
    return NextResponse.json({ error: "You can't act on your own account." }, { status: 400 });
  }

  if (action === "ban" || action === "unban") {
    await updateAdminUserStatus(userId, action);
  } else {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
