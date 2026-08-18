import { NextResponse } from "next/server";
import { getMatchesForUser } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const rows = await getMatchesForUser(user.id);

  const items = rows.map((r: any) => {
    let reasonsArr = [];
    try {
      reasonsArr = typeof r.reasons === "string" ? JSON.parse(r.reasons) : r.reasons;
    } catch {
      reasonsArr = [r.reasons];
    }

    return {
      id: r.id,
      lostItemId: r.lost_item_id || r.lostItemId,
      foundItemId: r.found_item_id || r.foundItemId,
      lostTitle: r.lost_title || r.lostTitle,
      foundTitle: r.found_title || r.foundTitle,
      lostImage: r.lost_image || r.lostImage,
      foundImage: r.found_image || r.foundImage,
      rewardAmount: r.reward_amount ?? r.rewardAmount ?? 0,
      overallScore: r.overall_score ?? r.overallScore,
      reasons: reasonsArr,
      status: r.status,
      perspective: r.lost_user_id === user.id ? "owner" : "finder",
      createdAt: r.created_at || r.createdAt,
    };
  });

  return NextResponse.json({ matches: items });
}
