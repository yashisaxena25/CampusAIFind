import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail, createOrUpdateUser } from "@/lib/db";
import { hashPassword, generateOtp, isCollegeEmail } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/email";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["student", "faculty"]).default("student"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your details and try again." }, { status: 400 });
  }
  const { name, email, password, role } = parsed.data;

  if (!isCollegeEmail(email)) {
    return NextResponse.json(
      { error: "Please use your college email address to register." },
      { status: 400 }
    );
  }

  const existing = await findUserByEmail(email);
  if (existing && (existing.is_verified || existing.isVerified)) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const otp = generateOtp();
  const otpExpires = Date.now() + 10 * 60 * 1000;

  await createOrUpdateUser({
    existingId: existing?.id,
    name,
    email,
    passwordHash,
    role,
    otpCode: otp,
    otpExpires,
  });

  // Send real email OTP via Brevo API
  const emailRes = await sendOtpEmail(email, otp, name);

  if (!emailRes.success) {
    console.warn(`[campusfind] Fallback OTP for ${email}: ${otp} (Brevo note: ${emailRes.message})`);
  } else {
    console.log(`[campusfind] Successfully sent OTP email via Brevo to ${email}`);
  }

  return NextResponse.json({
    ok: true,
    email,
    message: emailRes.success ? "OTP code sent to your email address!" : "Account created. Please check OTP.",
    // If Brevo is not configured in dev, pass devOtp so offline local testing remains easy
    devOtp: process.env.BREVO_API_KEY ? undefined : otp,
  });
}
