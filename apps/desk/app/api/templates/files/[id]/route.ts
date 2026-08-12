import { NextResponse } from "next/server";

import { getObjectSignedUrl } from "@/lib/storage/s3";
import { assertUserCanAccessContentModule } from "@/lib/tenant/access";
import { getTemplateFileById } from "@/lib/templates/storage";
import { getSessionUser } from "@/lib/tenant/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { id } = await context.params;
  const file = await getTemplateFileById(user.tenantId, id);

  if (!file) {
    return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
  }

  const denied = await assertUserCanAccessContentModule(
    user.id,
    user.tenantId,
    file.module
  );
  if (denied) {
    return NextResponse.json({ error: denied }, { status: 403 });
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
