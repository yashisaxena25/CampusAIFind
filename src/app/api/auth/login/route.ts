import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail } from "@/lib/db";
import { verifyPassword, signSession, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await findUserByEmail(email);
  if (!user) return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });

  if (user.is_banned) {
    return NextResponse.json({ error: "This account has been suspended." }, { status: 403 });
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });

  const isVerified = Boolean(user.is_verified ?? user.isVerified);
  if (!isVerified) {
    return NextResponse.json({ error: "Please verify your email first.", needsVerification: true, email }, { status: 403 });
  }

  const token = signSession(user.id);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
