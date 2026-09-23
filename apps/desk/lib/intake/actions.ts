"use server";

import { revalidatePath } from "next/cache";

import { requireSessionUser } from "@/lib/tenant/session";
import { getUserAllowedFunctions } from "@/lib/tenant/modules";
import { getAppBaseUrl } from "@/lib/mail/system";
import { getTenantUiContext } from "@/lib/tenant/brand";
import { getUserSmtpConnectionConfig } from "@/lib/smtp/storage";
import { sendMailWithUserSmtp } from "@/lib/smtp/send";
import {
  createIntakeInvite,
  findOpenInviteByToken,
  getIntakeInviteDetail,
  listIntakeInvites,
  resolvePublicIntakeByToken,
  revokeIntakeInvite,
  submitIntakeForm,
} from "@/lib/intake/storage";
import { publicIntakeUrl } from "@/lib/intake/tokens";
import { buildIntakeInviteEmail } from "@/lib/intake/invite-email";
import {
  computeMissingItems,
  type IntakeConsents,
  type IntakePayload,
} from "@/lib/intake/types";

async function requireIntakeAccess() {
  const user = await requireSessionUser();
  if (!user) {
    return null;
  }
  const allowed = await getUserAllowedFunctions(user.id, user.tenantId);
  if (!allowed || !allowed.includes("client-intake")) {
    return null;
  }
  return user;
}

export async function listIntakeInvitesAction() {
  const user = await requireIntakeAccess();
  if (!user) return [];
  return listIntakeInvites(user.tenantId);
}

export async function getIntakeInviteDetailAction(inviteId: string) {
  const user = await requireIntakeAccess();
  if (!user) return null;
  return getIntakeInviteDetail(user.tenantId, inviteId);
}

export async function createIntakeInviteAction(input: {
  recipientEmail: string;
  recipientName?: string;
}): Promise<
  | { ok: true; inviteId: string; url: string }
  | { ok: false; error: string }
> {
  const user = await requireIntakeAccess();
  if (!user) {
    return { ok: false, error: "Keine Berechtigung." };
  }
  const email = input.recipientEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Bitte eine gültige E-Mail angeben." };
  }

  const { inviteId, token } = await createIntakeInvite({
    tenantId: user.tenantId,
    userId: user.id,
    recipientEmail: email,
    recipientName: input.recipientName,
  });

  revalidatePath("/aufnahmebogen");
  return {
    ok: true,
    inviteId,
    url: publicIntakeUrl(getAppBaseUrl(), token),
  };
}

export async function revokeIntakeInviteAction(
  inviteId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireIntakeAccess();
  if (!user) {
    return { ok: false, error: "Keine Berechtigung." };
  }
  const done = await revokeIntakeInvite(user.tenantId, inviteId);
  if (!done) {
    return { ok: false, error: "Einladung konnte nicht widerrufen werden." };
  }
  revalidatePath("/aufnahmebogen");
  revalidatePath(`/aufnahmebogen/${inviteId}`);
  return { ok: true };
}

export async function sendIntakeInviteMailAction(input: {
  inviteId: string;
  url: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireIntakeAccess();
  if (!user) {
    return { ok: false, error: "Keine Berechtigung." };
  }

  const detail = await getIntakeInviteDetail(user.tenantId, input.inviteId);
  if (!detail || detail.status !== "open") {
    return { ok: false, error: "Einladung nicht gefunden oder nicht offen." };
  }

  const config = await getUserSmtpConnectionConfig(user.tenantId, user.id);
  if (!config) {
    return {
      ok: false,
      error:
        "Kein SMTP eingerichtet. Bitte Link kopieren oder unter Einstellungen SMTP hinterlegen.",
    };
  }

  const brand = await getTenantUiContext(user.tenantId);
  const greeting = detail.recipientName.trim()
    ? `Guten Tag ${detail.recipientName.trim()}`
    : "Guten Tag";
  const mail = buildIntakeInviteEmail({
    tenantName: brand.tenantName,
    recipientGreeting: greeting,
    url: input.url,
  });

  try {
    await sendMailWithUserSmtp(config, {
      to: detail.recipientEmail,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "E-Mail konnte nicht gesendet werden." };
  }
}

/** Öffentlich: Einladung für Formular laden. */
export async function loadPublicIntakeAction(token: string) {
  const resolved = await resolvePublicIntakeByToken(token);

  if (resolved.kind === "open") {
    const brand = await getTenantUiContext(resolved.invite.tenantId);
    return {
      status: "open" as const,
      recipientEmail: resolved.invite.recipientEmail,
      recipientName: resolved.invite.recipientName,
      tenantName: brand.tenantName,
      brandLabel: brand.brandLabel,
    };
  }

  if (resolved.kind === "submitted") {
    const brand = await getTenantUiContext(resolved.tenantId);
    return {
      status: "submitted" as const,
      tenantName: brand.tenantName,
    };
  }

  let tenantName: string | null = null;
  if (resolved.tenantId) {
    const brand = await getTenantUiContext(resolved.tenantId);
    tenantName = brand.tenantName;
  }

  return {
    status: "unavailable" as const,
    reason: resolved.reason,
    tenantName,
  };
}

/** Öffentlich: Formular absenden. */
export async function submitPublicIntakeAction(input: {
  token: string;
  payload: IntakePayload;
  consents: IntakeConsents;
  signaturePng: string;
}) {
  if (!input.signaturePng.trim()) {
    return { ok: false as const, error: "Bitte unterschreiben." };
  }
  if (
    !input.consents.feeUnderstood ||
    !input.consents.privacyReceived ||
    !input.consents.dataProcessing
  ) {
    return {
      ok: false as const,
      error: "Bitte alle Bestätigungen am Ende anhaken.",
    };
  }

  const missingItems = computeMissingItems(input.payload);
  return submitIntakeForm({
    token: input.token,
    payload: input.payload,
    consents: {
      ...input.consents,
      signedAt: new Date().toISOString(),
    },
    signaturePng: input.signaturePng,
    missingItems,
  });
}
