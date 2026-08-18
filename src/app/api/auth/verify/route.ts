import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail, verifyUser } from "@/lib/db";
import { signSession, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }
  const { email, otp } = parsed.data;

  const user = await findUserByEmail(email);
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  if (!user.otp_code || user.otp_code !== otp) {
    return NextResponse.json({ error: "That code is incorrect." }, { status: 400 });
  }
  if (user.otp_expires < Date.now()) {
    return NextResponse.json({ error: "That code has expired. Request a new one." }, { status: 400 });
  }

  await verifyUser(user.id);

  const token = signSession(user.id);
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
