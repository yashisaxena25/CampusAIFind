import { NextRequest, NextResponse } from "next/server";
import { getFoundItemById, findUserById, updateFoundItemStatus } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getFoundItemById(id);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const user = await getCurrentUser();
  const isOwner = user?.id === row.user_id;
  const finder = await findUserById(row.user_id);

  const base = {
    id: row.id,
    title: row.title,
    category: row.category,
    color: row.color,
    foundLocation: row.found_location || row.foundLocation,
    foundDate: row.found_date || row.foundDate,
    foundTime: row.found_time || row.foundTime,
    status: row.status,
    image: row.image,
    summary: row.description?.slice(0, 140),
    isOwner,
    finderName: finder?.name,
  };

  if (isOwner) {
    Object.assign(base, {
      description: row.description,
      brand: row.brand,
      model: row.model,
      identifyingFeatures: row.identifying_features || row.identifyingFeatures,
      currentLocation: row.current_location || row.currentLocation,
      additionalDetails: row.additional_details || row.additionalDetails,
      contactPreference: row.contact_preference || row.contactPreference,
    });
  }

  return NextResponse.json({ item: base });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const row = await getFoundItemById(id);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (row.user_id !== user.id) return NextResponse.json({ error: "Not your report." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const action = body.action;

  if (action === "cancel") {
    await updateFoundItemStatus(id, "cancelled");
  } else if (action === "mark_returned") {
    await updateFoundItemStatus(id, "case_closed");
  } else {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
