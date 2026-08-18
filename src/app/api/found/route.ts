import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { newId, getFoundItems, createFoundItem, getActiveLostItems, createMatch } from "@/lib/db";
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
  foundDate: z.string().min(1),
  foundTime: z.string().optional(),
  foundLocation: z.string().min(1),
  currentLocation: z.string().optional(),
  additionalDetails: z.string().optional(),
  contactPreference: z.string().default("platform"),
  image: z.string().optional(),
});

function toPublicFound(row: any) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    color: row.color,
    foundLocation: row.found_location || row.foundLocation,
    foundDate: row.found_date || row.foundDate,
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

  const rows = await getFoundItems(category, location, q);
  return NextResponse.json({ items: rows.map(toPublicFound) });
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
  const id = newId("found");

  const foundRecord = {
    id,
    user_id: user.id,
    title: d.title,
    category: d.category,
    description: d.description,
    color: d.color || null,
    brand: d.brand || null,
    model: d.model || null,
    identifying_features: d.identifyingFeatures || null,
    found_date: d.foundDate,
    found_time: d.foundTime || null,
    found_location: d.foundLocation,
    current_location: d.currentLocation || null,
    additional_details: d.additionalDetails || null,
    contact_preference: d.contactPreference,
    status: "active",
    image: d.image || null,
    created_at: Date.now(),
  };

  await createFoundItem(foundRecord);

  const lostItems = await getActiveLostItems();
  const foundRow = { ...d, id, found_location: d.foundLocation, found_date: d.foundDate, identifying_features: d.identifyingFeatures };
  const matches: any[] = [];

  for (const l of lostItems) {
    const result = scoreMatch(
      { ...l, lost_location: l.lost_location || l.lostLocation, lost_date: l.lost_date || l.lostDate },
      foundRow as any
    );
    if (result.overallScore >= MATCH_SURFACE_THRESHOLD) {
      await createMatch({
        id: newId("match"),
        lost_item_id: l.id,
        found_item_id: id,
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
      matches.push({ lostItemId: l.id, lostTitle: l.title, score: result.overallScore, reasons: result.reasons });
    }
  }
  matches.sort((a, b) => b.score - a.score);

  return NextResponse.json({ ok: true, id, matches });
}
