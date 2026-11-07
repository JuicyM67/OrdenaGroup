// WP-84 (D-069, port av SE WP-91): POST /api/admin/import/extract — samma AI-läsning som
// `/api/import/extract`, men för plattformsadmin åt ett valt företag
// (`businessId` i kroppen). Kräver admin med aal2 (tvåstegsverifiering);
// annars 404 som resten av /admin. Avbrytbart via `request.signal`.
import { NextResponse } from "next/server";

import type { ImportExtractResponse } from "@/lib/validation/import";
import { requireAdminForAction } from "@/server/admin/auth";
import { adminBusinessExists, adminExistingNames } from "@/server/admin/import";
import { extractForImport } from "@/server/import/extract";
import { isImportEnabled } from "@/server/import/runs";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: ImportExtractResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  if (!isImportEnabled()) {
    return json({ ok: false, code: "import.unavailable" }, 404);
  }
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return json({ ok: false, code: "unauthorized" }, 403);
  }

  let admin: { userId: string };
  try {
    admin = await requireAdminForAction();
  } catch {
    return json({ ok: false, code: "unauthorized" }, 404);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, code: "invalid_input" }, 400);
  }
  const businessId = body.businessId;
  if (typeof businessId !== "string" || !UUID.test(businessId)) {
    return json({ ok: false, code: "invalid_input" }, 400);
  }
  if (!(await adminBusinessExists(businessId))) {
    return json({ ok: false, code: "not_found" }, 404);
  }
  const rest = { ...body };
  delete rest.businessId;

  const result = await extractForImport(
    admin.userId,
    businessId,
    rest,
    request.signal,
    { existing: await adminExistingNames(businessId) },
  );
  return json(result);
}
