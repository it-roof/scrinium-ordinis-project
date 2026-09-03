import { NextResponse } from "next/server";

import { getStaffInboxNotifyPulse } from "@/lib/staff-messages/storage";
import { assertUserCanAccessAreaFunction } from "@/lib/tenant/access";
import { getSessionUser } from "@/lib/tenant/session";

export async function GET() {
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

  const pulse = await getStaffInboxNotifyPulse(user.tenantId, user.id);
  return NextResponse.json(pulse, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
