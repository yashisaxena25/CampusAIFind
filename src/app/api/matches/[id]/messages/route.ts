import { NextRequest, NextResponse } from "next/server";
import { newId, getMatchById, getMessagesByMatchId, createMessage } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

async function assertParty(matchId: string, userId: string) {
  const match = await getMatchById(matchId);
  if (!match) return null;
  if (match.lost_user_id !== userId && match.found_user_id !== userId) return null;
  return match;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const match = await assertParty(id, user.id);
  if (!match) return NextResponse.json({ error: "Not your case." }, { status: 403 });

  const rows = await getMessagesByMatchId(id);

  return NextResponse.json({
    messages: rows.map((r: any) => ({
      id: r.id,
      body: r.body,
      senderName: r.sender_name || r.senderName,
      isMe: r.sender_id === user.id,
      createdAt: r.created_at || r.createdAt,
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const match = await assertParty(id, user.id);
  if (!match) return NextResponse.json({ error: "Not your case." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const text = (body.body || "").toString().trim();
  if (!text) return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "Message is too long." }, { status: 400 });

  await createMessage({
    id: newId("msg"),
    match_id: id,
    sender_id: user.id,
    body: text,
    created_at: Date.now(),
  });

  return NextResponse.json({ ok: true });
}
