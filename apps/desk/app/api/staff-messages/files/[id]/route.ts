import { NextResponse } from "next/server";

import { getObjectSignedUrl } from "@/lib/storage/s3";
import { assertUserCanAccessAreaFunction } from "@/lib/tenant/access";
import { getStaffMessageFileById } from "@/lib/staff-messages/storage";
import { getSessionUser } from "@/lib/tenant/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const denied = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "staff-messages"
  );
  if (denied) {
    return NextResponse.json({ error: denied }, { status: 403 });
  }

  const { id } = await context.params;
  const file = await getStaffMessageFileById(user.tenantId, user.id, id);

  if (!file) {
    return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
  }

  try {
    const signedUrl = await getObjectSignedUrl(file.storageKey, 300, {
      downloadFilename: file.filename,
    });
    return NextResponse.redirect(signedUrl);
  } catch {
    return NextResponse.json(
      { error: "Datei konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
