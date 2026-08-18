import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { newId, getLostItems, createLostItem, getActiveFoundItems, createMatch } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { scoreMatch, MATCH_SURFACE_THRESHOLD } from "@/lib/match";

export const runtime = "nodejs";

const schema = z.object({
  title: z.string().min(2),
  category: z.string().min(1),
  description: z.string().min(5),
  color: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  identifyingFeatures: z.string().optional(),
  lostDate: z.string().min(1),
  lostTime: z.string().optional(),
  lostLocation: z.string().min(1),
  additionalDetails: z.string().optional(),
  estimatedValue: z.coerce.number().optional(),
  rewardAmount: z.coerce.number().min(0).default(0),
  contactPreference: z.string().default("platform"),
  image: z.string().optional(),
});

function toPublicLost(row: any) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    color: row.color,
    lostLocation: row.lost_location || row.lostLocation,
    lostDate: row.lost_date || row.lostDate,
    rewardAmount: row.reward_amount ?? row.rewardAmount ?? 0,
    rewardStatus: row.reward_status || row.rewardStatus || "no_reward",
    status: row.status,
    image: row.image,
    summary: row.description?.slice(0, 90),
    createdAt: row.created_at || row.createdAt,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const location = searchParams.get("location");
  const q = searchParams.get("q");

  const rows = await getLostItems(category, location, q);
  return NextResponse.json({ items: rows.map(toPublicLost) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!user.isVerified) {
    return NextResponse.json({ error: "Please verify your college email first." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid report." }, { status: 400 });
  }
  const d = parsed.data;
  const id = newId("lost");
  const rewardStatus = d.rewardAmount > 0 ? "reward_offered" : "no_reward";

  const lostItemRecord = {
    id,
    user_id: user.id,
    title: d.title,
    category: d.category,
    description: d.description,
    color: d.color || null,
    brand: d.brand || null,
    model: d.model || null,
    identifying_features: d.identifyingFeatures || null,
    lost_date: d.lostDate,
    lost_time: d.lostTime || null,
    lost_location: d.lostLocation,
    additional_details: d.additionalDetails || null,
    estimated_value: d.estimatedValue || null,
    reward_amount: d.rewardAmount,
    reward_status: rewardStatus,
    contact_preference: d.contactPreference,
    status: "active",
    image: d.image || null,
    created_at: Date.now(),
  };

  await createLostItem(lostItemRecord);

  // Run matching engine against active found items
  const foundItems = await getActiveFoundItems();
  const lostRow = { ...d, id, lost_location: d.lostLocation, lost_date: d.lostDate, identifying_features: d.identifyingFeatures };
  let matchCount = 0;
  for (const f of foundItems) {
    const result = scoreMatch(lostRow as any, {
      ...f,
      found_location: f.found_location || f.foundLocation,
      found_date: f.found_date || f.foundDate,
    });
    if (result.overallScore >= MATCH_SURFACE_THRESHOLD) {
      await createMatch({
        id: newId("match"),
        lost_item_id: id,
        found_item_id: f.id,
        text_score: result.textScore,
        category_score: result.categoryScore,
        color_score: result.colorScore,
        brand_score: result.brandScore,
        location_score: result.locationScore,
        time_score: result.timeScore,
        overall_score: result.overallScore,
        reasons: JSON.stringify(result.reasons),
        status: result.status,
        created_at: Date.now(),
      });
      matchCount++;
    }
  }

  return NextResponse.json({ ok: true, id, matchCount });
}
