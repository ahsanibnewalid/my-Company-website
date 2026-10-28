import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const allowed = isAdminRequest(request);
  return NextResponse.json(
    { ok: allowed },
    { status: allowed ? 200 : 401, headers: { "Cache-Control": "no-store" } },
  );
}
