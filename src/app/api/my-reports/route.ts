import { NextResponse } from "next/server";
import { getMyReports } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { lost, found, lostMap, foundMap } = await getMyReports(user.id);

  return NextResponse.json({
    lost: (lost || []).map((l: any) => ({
      id: l.id,
      title: l.title,
      category: l.category,
      lostLocation: l.lost_location || l.lostLocation,
      lostDate: l.lost_date || l.lostDate,
      status: l.status,
      rewardAmount: l.reward_amount ?? l.rewardAmount ?? 0,
      rewardStatus: l.reward_status || l.rewardStatus || "no_reward",
      image: l.image,
      matchCount: lostMap[l.id] || 0,
    })),
    found: (found || []).map((f: any) => ({
      id: f.id,
      title: f.title,
      category: f.category,
      foundLocation: f.found_location || f.foundLocation,
      foundDate: f.found_date || f.foundDate,
      status: f.status,
      image: f.image,
      matchCount: foundMap[f.id] || 0,
    })),
  });
}
