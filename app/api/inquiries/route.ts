import type { NextRequest } from "next/server";
import { validateInquiry } from "@/lib/inquiry";

export const runtime = "nodejs";

const windowMs = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; expires: number }>();

function respond(body: Record<string, unknown>, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  if (attempts.size > 2000) {
    for (const [ip, entry] of attempts) {
      if (entry.expires <= now) attempts.delete(ip);
    }
  }
  const previous = attempts.get(key);
  if (!previous || previous.expires <= now) {
    attempts.set(key, { count: 1, expires: now + windowMs });
    return false;
  }
  previous.count += 1;
  return previous.count > 5;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return respond({ error: "Requests must originate from this website." }, 403);
  }

  const length = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(length) || length > 12000) {
    return respond({ error: "Your message is too long." }, 413);
  }

  let input: unknown;
  try {
    const body = await request.text();
    if (body.length > 12000) return respond({ error: "Your message is too long." }, 413);
    input = JSON.parse(body);
  } catch {
    return respond({ error: "Please submit a valid form." }, 400);
  }

  if (input && typeof input === "object" && !Array.isArray(input) &&
      typeof (input as Record<string, unknown>).website === "string" &&
      (input as Record<string, unknown>).website) {
    // Honeypot: quietly accept bot submissions without sending email.
    return respond({ ok: true }, 200);
  }

  const checked = validateInquiry(input);
  if (!checked.ok) return respond({ error: checked.error }, 400);

  const apiKey = process.env.RESEND_API_KEY;
  const inbox = process.env.INQUIRY_TO_EMAIL;
  const from = process.env.INQUIRY_FROM_EMAIL;
  if (!apiKey || !inbox || !from) {
    return respond({ error: "Messages are not enabled yet. Please try again later." }, 503);
  }

  // Best-effort per-instance throttle; use a managed edge rate limit for production.
  const ip = request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooManyAttempts(ip)) {
    return respond({ error: "Too many messages. Please try again in 15 minutes." }, 429);
  }

  const inquiry = checked.data;
  const subject = inquiry.kind === "project"
    ? "Axiom Labs — new project inquiry"
    : "Axiom Labs — new career application";
  const message = [
    `Type: ${inquiry.kind}`,
    `Name: ${inquiry.name}`,
    `Email: ${inquiry.email}`,
    `Organization: ${inquiry.organization || "Not provided"}`,
    ...(inquiry.kind === "career" ? [`Track: ${inquiry.track}`] : []),
    "",
    inquiry.message,
    "",
    "Submitted from the Axiom Labs website. Consent to reply: yes.",
  ].join("\n");

  try {
    const delivery = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [inbox],
        reply_to: inquiry.email,
        subject,
        text: message,
      }),
      cache: "no-store",
    });
    if (!delivery.ok) {
      console.error("Inquiry email provider returned status", delivery.status);
      return respond({ error: "We couldn't deliver your message. Please try again later." }, 502);
    }
    return respond({ ok: true }, 200);
  } catch {
    console.error("Inquiry email provider was unavailable");
    return respond({ error: "We couldn't deliver your message. Please try again later." }, 502);
  }
}
