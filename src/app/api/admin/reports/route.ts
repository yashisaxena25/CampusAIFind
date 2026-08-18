import { NextRequest, NextResponse } from "next/server";
import { getAdminReports, updateAdminReport } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access only." }, { status: 403 });

  const reports = await getAdminReports();
  return NextResponse.json(reports);
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access only." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { itemType, id, action } = body as { itemType: "lost" | "found"; id: string; action: string };

  await updateAdminReport(itemType, id, action);

  return NextResponse.json({ ok: true });
}
