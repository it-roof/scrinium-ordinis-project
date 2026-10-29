import { NextResponse } from "next/server";

import { getMatterFileById } from "@/lib/matters/files-storage";
import { getObjectSignedUrl } from "@/lib/storage/s3";
import { getSessionUser } from "@/lib/tenant/session";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { id } = await context.params;
  const file = await getMatterFileById(user.tenantId, id);
  if (!file) {
    return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
  }

  const forceDownload =
    new URL(request.url).searchParams.get("download") === "1";

  try {
    const signedUrl = await getObjectSignedUrl(file.storageKey, 300, {
      downloadFilename: forceDownload ? file.filename : undefined,
    });
    return NextResponse.redirect(signedUrl);
  } catch {
    return NextResponse.json(
      { error: "Datei konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
