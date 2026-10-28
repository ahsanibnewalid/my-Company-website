import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isSameOrigin, sessionCookieOptions } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ detail: "Invalid origin." }, { status: 403 });
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(ADMIN_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
