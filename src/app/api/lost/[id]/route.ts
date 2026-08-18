import { NextRequest, NextResponse } from "next/server";
import { getLostItemById, findUserById, updateLostItemStatus } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getLostItemById(id);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const user = await getCurrentUser();
  const isOwner = user?.id === row.user_id;

  const owner = await findUserById(row.user_id);

  const base = {
    id: row.id,
    title: row.title,
    category: row.category,
    color: row.color,
    lostLocation: row.lost_location || row.lostLocation,
    lostDate: row.lost_date || row.lostDate,
    lostTime: row.lost_time || row.lostTime,
    rewardAmount: row.reward_amount ?? row.rewardAmount ?? 0,
    rewardStatus: row.reward_status || row.rewardStatus || "no_reward",
    status: row.status,
    image: row.image,
    summary: row.description?.slice(0, 140),
    isOwner,
    reporterName: owner?.name,
  };

  if (isOwner) {
    Object.assign(base, {
      description: row.description,
      brand: row.brand,
      model: row.model,
      identifyingFeatures: row.identifying_features || row.identifyingFeatures,
      additionalDetails: row.additional_details || row.additionalDetails,
      estimatedValue: row.estimated_value || row.estimatedValue,
      contactPreference: row.contact_preference || row.contactPreference,
    });
  }

  return NextResponse.json({ item: base });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const row = await getLostItemById(id);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (row.user_id !== user.id) return NextResponse.json({ error: "Not your report." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const action = body.action;

  if (action === "cancel") {
    await updateLostItemStatus(id, "cancelled");
  } else if (action === "mark_recovered") {
    const rewardAmount = row.reward_amount ?? row.rewardAmount ?? 0;
    await updateLostItemStatus(id, "case_closed", rewardAmount > 0 ? "reward_released" : undefined);
  } else {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
