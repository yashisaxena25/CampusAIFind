import { NextRequest, NextResponse } from "next/server";
import { getMatchById, updateMatchStatus, updateLostItemStatus, updateFoundItemStatus } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const match = await getMatchById(id);
  if (!match) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const isParty = match.lost_user_id === user.id || match.found_user_id === user.id;
  if (!isParty) return NextResponse.json({ error: "Not your case." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  const nextStatus: Record<string, string> = {
    confirm: "verified_match",
    reject: "rejected_match",
    dispute: "disputed",
  };
  const status = nextStatus[action];
  if (!status) return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  await updateMatchStatus(id, status);

  if (status === "verified_match") {
    await updateLostItemStatus(match.lost_item_id, "match_confirmed");
    await updateFoundItemStatus(match.found_item_id, "owner_contacted");
  }

  return NextResponse.json({ ok: true });
}
