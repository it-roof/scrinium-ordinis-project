import { NextResponse } from "next/server";

import { isAppModuleId } from "@/lib/modules";
import { listOpenStaffMessagesForRecipient } from "@/lib/staff-messages/storage";
import {
  assertUserCanAccessAreaFunction,
  assertUserCanAccessContentModule,
} from "@/lib/tenant/access";
import { getSessionUser } from "@/lib/tenant/session";

export async function GET(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const denied = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "inbox"
  );
  if (denied) {
    return NextResponse.json({ error: denied }, { status: 403 });
  }

  const moduleParam = new URL(request.url).searchParams.get("module") ?? "";
  if (!isAppModuleId(moduleParam)) {
    return NextResponse.json({ error: "Ungültiger Bereich." }, { status: 400 });
  }

  const moduleDenied = await assertUserCanAccessContentModule(
    user.id,
    user.tenantId,
    moduleParam
  );
  if (moduleDenied) {
    return NextResponse.json({ error: moduleDenied }, { status: 403 });
  }

  const received = await listOpenStaffMessagesForRecipient(
    user.tenantId,
    user.id,
    moduleParam
  );

  return NextResponse.json(
    { received },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
