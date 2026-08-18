import { NextResponse } from "next/server";
import { getAdminStats } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access only." }, { status: 403 });

  const stats = await getAdminStats();
  return NextResponse.json(stats);
}
