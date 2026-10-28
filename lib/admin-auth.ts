import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextRequest } from "next/server";

const scrypt = promisify(scryptCallback);
export const ADMIN_COOKIE = "axiom_admin_session";
export const SESSION_SECONDS = 12 * 60 * 60;

export async function hashAdminPassword(password: string, salt = randomBytes(24)): Promise<string> {
  if (password.length < 14 || password.length > 512) {
    throw new Error("Administrator passwords must contain 14–512 characters.");
  }
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyAdminPassword(password: string, stored: string): Promise<boolean> {
  if (!password || password.length > 512) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "base64url");
  const expected = Buffer.from(parts[2], "base64url");
  if (salt.length < 16 || expected.length !== 64) return false;
  const computed = await scrypt(password, salt, expected.length) as Buffer;
  return timingSafeEqual(computed, expected);
}

function settings() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() || "";
  const passwordHash = process.env.ADMIN_PASSWORD_HASH || "";
  const sessionSecret = process.env.SESSION_SECRET || "";
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    passwordHash.startsWith("scrypt$") && sessionSecret.length >= 32 &&
    !sessionSecret.includes("replace-me");
  return { email, passwordHash, sessionSecret, valid };
}

export function adminConfigured(): boolean {
  return settings().valid;
}

export async function authenticateAdmin(email: string, password: string): Promise<boolean> {
  const config = settings();
  if (!config.valid) return false;
  const passwordMatches = await verifyAdminPassword(password, config.passwordHash);
  return email.trim().toLowerCase() === config.email && passwordMatches;
}

function hmac(value: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(value).digest();
}

function passwordVersion(stored: string): string {
  return createHash("sha256").update(stored).digest("base64url").slice(0, 20);
}

export function makeAdminSession(now = Date.now()): string {
  const config = settings();
  if (!config.valid) throw new Error("Administrator is not configured.");
  const payload = Buffer.from(JSON.stringify({
    exp: Math.floor(now / 1000) + SESSION_SECONDS,
    version: passwordVersion(config.passwordHash),
    nonce: randomBytes(16).toString("base64url"),
  })).toString("base64url");
  return `${payload}.${hmac(payload, config.sessionSecret).toString("base64url")}`;
}

export function validAdminSession(session: string | undefined, now = Date.now()): boolean {
  const config = settings();
  if (!config.valid || !session || session.length > 1024) return false;
  const parts = session.split(".");
  if (parts.length !== 2) return false;
  const expected = hmac(parts[0], config.sessionSecret);
  const received = Buffer.from(parts[1], "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as {
      exp?: number; version?: string;
    };
    return typeof payload.exp === "number" &&
      payload.exp > Math.floor(now / 1000) &&
      payload.exp <= Math.floor(now / 1000) + SESSION_SECONDS &&
      payload.version === passwordVersion(config.passwordHash);
  } catch {
    return false;
  }
}

export function isAdminRequest(request: NextRequest): boolean {
  return validAdminSession(request.cookies.get(ADMIN_COOKIE)?.value);
}

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return (!origin || origin === request.nextUrl.origin) && fetchSite !== "cross-site";
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_SECONDS,
  };
}
