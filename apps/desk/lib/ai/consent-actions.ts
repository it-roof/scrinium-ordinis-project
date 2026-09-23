"use server";

import { revalidatePath } from "next/cache";

import {
  getLatestAiConsent,
  recordAiConsentGranted,
  recordAiConsentRevoked,
  consentStatusView,
  type ConsentStatusView,
} from "@/lib/ai/consent";
import { AI_ERROR, userMessageForAiError } from "@/lib/ai/errors";
import { getClientById } from "@/lib/clients/storage";
import { assertUserCanAccessAreaFunction } from "@/lib/tenant/access";
import { requireSessionUser } from "@/lib/tenant/session";

export type AiConsentView = {
  status: ConsentStatusView;
  waiver43e: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
  evidence: string | null;
  createdAt: string | null;
};

async function requireClientsUser() {
  const user = await requireSessionUser();
  if (!user) {
    return { error: "Nicht angemeldet.", user: null };
  }
  const denied = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "clients"
  );
  if (denied) {
    return { error: denied, user: null };
  }
  return { error: null, user };
}

export async function getAiConsentForClient(
  clientId: string
): Promise<
  | { success: true; consent: AiConsentView }
  | { success: false; error: string }
> {
  const { user, error } = await requireClientsUser();
  if (!user) {
    return { success: false, error: error ?? "Nicht angemeldet." };
  }
  const client = await getClientById(user.tenantId, clientId);
  if (!client) {
    return { success: false, error: userMessageForAiError(AI_ERROR.FORBIDDEN) };
  }
  const latest = await getLatestAiConsent(user.tenantId, clientId);
  return {
    success: true,
    consent: {
      status: consentStatusView(latest),
      waiver43e: latest?.waiver43e ?? false,
      grantedAt: latest?.grantedAt ?? null,
      revokedAt: latest?.revokedAt ?? null,
      evidence: latest?.evidence ?? null,
      createdAt: latest?.createdAt ?? null,
    },
  };
}

export async function grantAiConsent(input: {
  clientId: string;
  waiver43e: boolean;
  evidence?: string;
}) {
  const { user, error } = await requireClientsUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }
  const client = await getClientById(user.tenantId, input.clientId);
  if (!client) {
    return {
      success: false as const,
      error: userMessageForAiError(AI_ERROR.FORBIDDEN),
    };
  }
  const row = await recordAiConsentGranted({
    tenantId: user.tenantId,
    clientId: input.clientId,
    userId: user.id,
    waiver43e: Boolean(input.waiver43e),
    evidence: input.evidence,
  });
  revalidatePath("/", "layout");
  return {
    success: true as const,
    consent: {
      status: consentStatusView(row) as ConsentStatusView,
      waiver43e: row.waiver43e,
      grantedAt: row.grantedAt,
      revokedAt: row.revokedAt,
      evidence: row.evidence,
      createdAt: row.createdAt,
    } satisfies AiConsentView,
  };
}

export async function revokeAiConsent(clientId: string) {
  const { user, error } = await requireClientsUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }
  const client = await getClientById(user.tenantId, clientId);
  if (!client) {
    return {
      success: false as const,
      error: userMessageForAiError(AI_ERROR.FORBIDDEN),
    };
  }
  const row = await recordAiConsentRevoked({
    tenantId: user.tenantId,
    clientId,
    userId: user.id,
  });
  revalidatePath("/", "layout");
  return {
    success: true as const,
    consent: {
      status: consentStatusView(row),
      waiver43e: row.waiver43e,
      grantedAt: row.grantedAt,
      revokedAt: row.revokedAt,
      evidence: row.evidence,
      createdAt: row.createdAt,
    } satisfies AiConsentView,
  };
}
