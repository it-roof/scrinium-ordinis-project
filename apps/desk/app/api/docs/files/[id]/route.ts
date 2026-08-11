import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getDocAssetById } from "@/lib/docs/storage";
import { getObjectSignedUrl } from "@/lib/storage/s3";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { id } = await context.params;
  const asset = await getDocAssetById(id);

  if (!asset) {
    return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
  }

  try {
    const signedUrl = await getObjectSignedUrl(asset.storageKey);
    return NextResponse.redirect(signedUrl);
  } catch {
    return NextResponse.json(
      { error: "Datei konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
