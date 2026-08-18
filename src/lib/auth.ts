import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { findUserById } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";
const SESSION_COOKIE = "campusfind_session";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  collegeId: string;
  isVerified: boolean;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signSession(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const row = await findUserById(payload.sub);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      collegeId: row.college_id || row.collegeId || "default-college",
      isVerified: Boolean(row.is_verified ?? row.isVerified),
    };
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// College-email allowlist check. Configure real domains via env in production.
export function isCollegeEmail(email: string) {
  if (!email || !email.includes("@")) return false;
  const envDomains = process.env.COLLEGE_EMAIL_DOMAINS;
  if (!envDomains || envDomains === "*") {
    return true;
  }
  const allowed = envDomains
    .split(",")
    .map((d) => d.trim().toLowerCase());
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return allowed.some((d) => domain.endsWith(d));
}
