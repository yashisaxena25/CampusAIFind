import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail, createOrUpdateUser } from "@/lib/db";
import { generateOtp } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/email";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }
  const { email } = parsed.data;

  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  if (user.is_verified || user.isVerified) {
    return NextResponse.json({ error: "This account is already verified." }, { status: 400 });
  }

  const otp = generateOtp();
  const otpExpires = Date.now() + 10 * 60 * 1000;

  await createOrUpdateUser({
    existingId: user.id,
    name: user.name,
    email: user.email,
    passwordHash: user.password_hash || user.passwordHash,
    role: user.role,
    otpCode: otp,
    otpExpires,
  });

  const emailRes = await sendOtpEmail(email, otp, user.name);
  if (!emailRes.success) {
    return NextResponse.json(
      { error: `Could not send OTP email: ${emailRes.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, message: "A new OTP code has been sent to your email address." });
}
