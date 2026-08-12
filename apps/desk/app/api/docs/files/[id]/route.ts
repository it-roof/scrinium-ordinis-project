import { NextResponse } from "next/server";

import {
  getDocAssetById,
  getDocModulesReferencingAsset,
} from "@/lib/docs/storage";
import { getObjectSignedUrl } from "@/lib/storage/s3";
import {
  assertUserCanAccessAnyContentModule,
  assertUserCanAccessAreaFunction,
} from "@/lib/tenant/access";
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
  const asset = await getDocAssetById(user.tenantId, id);

  if (!asset) {
    return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
  }

  const referencingModules = await getDocModulesReferencingAsset(
    user.tenantId,
    id
  );

  if (referencingModules.length > 0) {
    const denied = await assertUserCanAccessAnyContentModule(
      user.id,
      user.tenantId,
      referencingModules
    );
    if (denied) {
      return NextResponse.json({ error: denied }, { status: 403 });
    }
  } else {
    // Orphan / Draft-Upload: nur mit Docs-Funktion
    const denied = await assertUserCanAccessAreaFunction(
      user.id,
      user.tenantId,
      "docs"
    );
    if (denied) {
      return NextResponse.json({ error: denied }, { status: 403 });
    }
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
