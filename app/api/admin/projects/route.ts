import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { adminGuard, apiResponse, databaseError, readBody } from "@/lib/api-server";
import { dbQuery } from "@/lib/db";
import { validateProject } from "@/lib/inputs";

export async function POST(request: NextRequest) {
  const denied = adminGuard(request, true);
  if (denied) return denied;
  const body = await readBody(request);
  if (!body.ok) return body.response;
  const checked = validateProject(body.input);
  if (!checked.ok) return apiResponse({ detail: checked.error }, 400);
  const project = checked.data;
  try {
    const result = await dbQuery(
      `INSERT INTO projects (id,title,description,status,url,featured)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [randomUUID(), project.title, project.description || "", project.status || "active",
        project.url || "", project.featured ?? true],
    );
    return apiResponse({ project: result.rows[0] }, 201);
  } catch {
    return databaseError();
  }
}
