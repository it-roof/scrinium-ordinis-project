import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  clientIntakeInvites,
  clientIntakeSubmissions,
  clients,
  type ClientIntakeInviteStatus,
  type ContentModule,
} from "@/lib/db/schema";
import {
  createIntakeToken,
  hashIntakeToken,
} from "@/lib/intake/tokens";
import type {
  IntakeConsents,
  IntakePayload,
  IntakePartyKind,
} from "@/lib/intake/types";
import { withTenantDb } from "@/lib/tenant/db";

export type IntakeInviteListItem = {
  id: string;
  recipientEmail: string;
  recipientName: string;
  status: ClientIntakeInviteStatus;
  expiresAt: string;
  submittedAt: string | null;
  createdAt: string;
  hasSubmission: boolean;
};

export type IntakeInviteDetail = IntakeInviteListItem & {
  module: ContentModule;
  submission: {
    id: string;
    clientId: string | null;
    partyKind: IntakePartyKind;
    payload: IntakePayload;
    missingItems: string[];
    signaturePng: string | null;
    consents: IntakeConsents;
    createdAt: string;
  } | null;
};

export async function listIntakeInvites(
  tenantId: string
): Promise<IntakeInviteListItem[]> {
  return withTenantDb(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: clientIntakeInvites.id,
        recipientEmail: clientIntakeInvites.recipientEmail,
        recipientName: clientIntakeInvites.recipientName,
        status: clientIntakeInvites.status,
        expiresAt: clientIntakeInvites.expiresAt,
        submittedAt: clientIntakeInvites.submittedAt,
        createdAt: clientIntakeInvites.createdAt,
        submissionId: clientIntakeSubmissions.id,
      })
      .from(clientIntakeInvites)
      .leftJoin(
        clientIntakeSubmissions,
        eq(clientIntakeSubmissions.inviteId, clientIntakeInvites.id)
      )
      .where(eq(clientIntakeInvites.tenantId, tenantId))
      .orderBy(desc(clientIntakeInvites.createdAt));

    return rows.map((row) => ({
      id: row.id,
      recipientEmail: row.recipientEmail,
      recipientName: row.recipientName,
      status: row.status,
      expiresAt: row.expiresAt,
      submittedAt: row.submittedAt,
      createdAt: row.createdAt,
      hasSubmission: Boolean(row.submissionId),
    }));
  });
}

export async function getIntakeInviteDetail(
  tenantId: string,
  inviteId: string
): Promise<IntakeInviteDetail | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [invite] = await tx
      .select()
      .from(clientIntakeInvites)
      .where(
        and(
          eq(clientIntakeInvites.id, inviteId),
          eq(clientIntakeInvites.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!invite) return null;

    const [submission] = await tx
      .select()
      .from(clientIntakeSubmissions)
      .where(eq(clientIntakeSubmissions.inviteId, invite.id))
      .limit(1);

    return {
      id: invite.id,
      recipientEmail: invite.recipientEmail,
      recipientName: invite.recipientName,
      status: invite.status,
      expiresAt: invite.expiresAt,
      submittedAt: invite.submittedAt,
      createdAt: invite.createdAt,
      hasSubmission: Boolean(submission),
      module: invite.module as ContentModule,
      submission: submission
        ? {
            id: submission.id,
            clientId: submission.clientId,
            partyKind: submission.partyKind as IntakePartyKind,
            payload: submission.payload as IntakePayload,
            missingItems: (submission.missingItems as string[]) ?? [],
            signaturePng: submission.signaturePng,
            consents: submission.consents as IntakeConsents,
            createdAt: submission.createdAt,
          }
        : null,
    };
  });
}

export async function createIntakeInvite(input: {
  tenantId: string;
  userId: string;
  module?: ContentModule;
  recipientEmail: string;
  recipientName?: string;
}): Promise<{ inviteId: string; token: string; expiresAt: string }> {
  const email = input.recipientEmail.trim().toLowerCase();
  const { token, tokenHash, expiresAt } = createIntakeToken();

  const inviteId = await withTenantDb(input.tenantId, async (tx) => {
    const [row] = await tx
      .insert(clientIntakeInvites)
      .values({
        tenantId: input.tenantId,
        module: input.module ?? "legal",
        tokenHash,
        recipientEmail: email,
        recipientName: input.recipientName?.trim() ?? "",
        createdBy: input.userId,
        status: "open",
        expiresAt,
      })
      .returning({ id: clientIntakeInvites.id });

    return row!.id;
  });

  return { inviteId, token, expiresAt };
}

export async function revokeIntakeInvite(
  tenantId: string,
  inviteId: string
): Promise<boolean> {
  return withTenantDb(tenantId, async (tx) => {
    const updated = await tx
      .update(clientIntakeInvites)
      .set({ status: "revoked" })
      .where(
        and(
          eq(clientIntakeInvites.id, inviteId),
          eq(clientIntakeInvites.tenantId, tenantId),
          eq(clientIntakeInvites.status, "open")
        )
      )
      .returning({ id: clientIntakeInvites.id });
    return updated.length > 0;
  });
}

/** Token-Lookup ohne Session — Tabellen-Owner umgeht RLS. */
export async function findOpenInviteByToken(token: string) {
  const resolved = await resolvePublicIntakeByToken(token);
  return resolved.kind === "open" ? resolved.invite : null;
}

export type PublicIntakeResolve =
  | {
      kind: "open";
      invite: typeof clientIntakeInvites.$inferSelect;
    }
  | {
      kind: "submitted";
      tenantId: string;
    }
  | {
      kind: "unavailable";
      reason: "expired" | "revoked" | "invalid";
      tenantId: string | null;
    };

/** Öffentlicher Token-Status inkl. bereits ausgefüllt / abgelaufen. */
export async function resolvePublicIntakeByToken(
  token: string
): Promise<PublicIntakeResolve> {
  const tokenHash = hashIntakeToken(token);
  const now = new Date().toISOString();

  const [invite] = await db
    .select()
    .from(clientIntakeInvites)
    .where(eq(clientIntakeInvites.tokenHash, tokenHash))
    .limit(1);

  if (!invite) {
    return { kind: "unavailable", reason: "invalid", tenantId: null };
  }

  if (invite.status === "submitted") {
    return { kind: "submitted", tenantId: invite.tenantId };
  }

  if (invite.status === "revoked") {
    return {
      kind: "unavailable",
      reason: "revoked",
      tenantId: invite.tenantId,
    };
  }

  if (invite.status === "expired" || invite.expiresAt < now) {
    if (invite.status === "open" && invite.expiresAt < now) {
      await withTenantDb(invite.tenantId, async (tx) => {
        await tx
          .update(clientIntakeInvites)
          .set({ status: "expired" })
          .where(eq(clientIntakeInvites.id, invite.id));
      });
    }
    return {
      kind: "unavailable",
      reason: "expired",
      tenantId: invite.tenantId,
    };
  }

  if (invite.status !== "open") {
    return {
      kind: "unavailable",
      reason: "invalid",
      tenantId: invite.tenantId,
    };
  }

  return { kind: "open", invite };
}

export async function submitIntakeForm(input: {
  token: string;
  payload: IntakePayload;
  consents: IntakeConsents;
  signaturePng: string;
  missingItems: string[];
}): Promise<{ ok: true; submissionId: string } | { ok: false; error: string }> {
  const invite = await findOpenInviteByToken(input.token);
  if (!invite) {
    return { ok: false, error: "Link ungültig oder abgelaufen." };
  }

  const payload = input.payload;
  const email = payload.email.trim().toLowerCase() || invite.recipientEmail;

  try {
    const submissionId = await withTenantDb(invite.tenantId, async (tx) => {
      const [existing] = await tx
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.tenantId, invite.tenantId),
            eq(clients.module, invite.module),
            sql`lower(${clients.email}) = ${email}`
          )
        )
        .limit(1);

      let clientId = existing?.id ?? null;

      if (!clientId) {
        const isCompany = payload.partyKind === "company";
        const displayName = isCompany
          ? payload.companyName.trim() ||
            `${payload.firstName} ${payload.lastName}`.trim()
          : `${payload.firstName} ${payload.lastName}`.trim();

        const [created] = await tx
          .insert(clients)
          .values({
            tenantId: invite.tenantId,
            module: invite.module,
            kind: payload.partyKind,
            name: displayName || email,
            firstName: payload.firstName.trim(),
            lastName: payload.lastName.trim(),
            street: payload.street.trim(),
            postalCode: payload.postalCode.trim(),
            city: payload.city.trim(),
            email,
            phone: payload.phone.trim(),
            mobile: payload.mobile.trim(),
            createdBy: invite.createdBy,
          })
          .returning({ id: clients.id });
        clientId = created!.id;
      }

      const [submission] = await tx
        .insert(clientIntakeSubmissions)
        .values({
          tenantId: invite.tenantId,
          inviteId: invite.id,
          clientId,
          partyKind: payload.partyKind,
          payload,
          missingItems: input.missingItems,
          signaturePng: input.signaturePng,
          consents: input.consents,
        })
        .returning({ id: clientIntakeSubmissions.id });

      await tx
        .update(clientIntakeInvites)
        .set({
          status: "submitted",
          submittedAt: new Date().toISOString(),
        })
        .where(eq(clientIntakeInvites.id, invite.id));

      return submission!.id;
    });

    return { ok: true, submissionId };
  } catch {
    return { ok: false, error: "Absenden fehlgeschlagen. Bitte erneut versuchen." };
  }
}
