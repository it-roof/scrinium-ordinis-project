import { and, eq } from "drizzle-orm";

import { decryptSecret, encryptSecret } from "@/lib/crypto/secrets";
import { userSmtpSettings } from "@/lib/db/schema";
import { withTenantDb } from "@/lib/tenant/db";

import type {
  SmtpConnectionConfig,
  UserSmtpSettingsPublic,
} from "./types";

type SmtpRow = {
  host: string | null;
  port: number | null;
  username: string | null;
  passwordEncrypted: string | null;
  fromName: string | null;
  fromEmail: string | null;
  updatedAt: string;
};

function toPublic(row: SmtpRow): UserSmtpSettingsPublic {
  return {
    host: row.host ?? "",
    port: row.port,
    username: row.username ?? "",
    fromName: row.fromName ?? "",
    fromEmail: row.fromEmail ?? "",
    hasPassword: Boolean(row.passwordEncrypted),
    updatedAt: row.updatedAt,
  };
}

export async function getUserSmtpSettingsPublic(
  tenantId: string,
  userId: string
): Promise<UserSmtpSettingsPublic | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        host: userSmtpSettings.host,
        port: userSmtpSettings.port,
        username: userSmtpSettings.username,
        passwordEncrypted: userSmtpSettings.passwordEncrypted,
        fromName: userSmtpSettings.fromName,
        fromEmail: userSmtpSettings.fromEmail,
        updatedAt: userSmtpSettings.updatedAt,
      })
      .from(userSmtpSettings)
      .where(
        and(
          eq(userSmtpSettings.tenantId, tenantId),
          eq(userSmtpSettings.userId, userId)
        )
      )
      .limit(1);

    return row ? toPublic(row) : null;
  });
}

/** Für Versand — nur wenn alle nötigen Felder inkl. Passwort gesetzt sind. */
export async function getUserSmtpConnectionConfig(
  tenantId: string,
  userId: string
): Promise<SmtpConnectionConfig | null> {
  return withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        host: userSmtpSettings.host,
        port: userSmtpSettings.port,
        username: userSmtpSettings.username,
        passwordEncrypted: userSmtpSettings.passwordEncrypted,
        fromName: userSmtpSettings.fromName,
        fromEmail: userSmtpSettings.fromEmail,
      })
      .from(userSmtpSettings)
      .where(
        and(
          eq(userSmtpSettings.tenantId, tenantId),
          eq(userSmtpSettings.userId, userId)
        )
      )
      .limit(1);

    if (
      !row?.host?.trim() ||
      row.port == null ||
      !row.username?.trim() ||
      !row.passwordEncrypted ||
      !row.fromEmail?.trim()
    ) {
      return null;
    }

    return {
      host: row.host.trim(),
      port: row.port,
      username: row.username.trim(),
      password: decryptSecret(row.passwordEncrypted),
      fromName: row.fromName?.trim() || row.fromEmail.trim(),
      fromEmail: row.fromEmail.trim(),
    };
  });
}

export type SmtpUpsertValues = {
  host: string | null;
  port: number | null;
  username: string | null;
  passwordEncrypted: string | null;
  fromName: string | null;
  fromEmail: string | null;
};

export async function upsertUserSmtpSettings(
  tenantId: string,
  userId: string,
  input: SmtpUpsertValues
): Promise<UserSmtpSettingsPublic> {
  const now = new Date().toISOString();

  return withTenantDb(tenantId, async (tx) => {
    const [existing] = await tx
      .select({ id: userSmtpSettings.id })
      .from(userSmtpSettings)
      .where(
        and(
          eq(userSmtpSettings.tenantId, tenantId),
          eq(userSmtpSettings.userId, userId)
        )
      )
      .limit(1);

    const values = {
      host: input.host,
      port: input.port,
      username: input.username,
      passwordEncrypted: input.passwordEncrypted,
      fromName: input.fromName,
      fromEmail: input.fromEmail,
      updatedAt: now,
    };

    if (existing) {
      const [updated] = await tx
        .update(userSmtpSettings)
        .set(values)
        .where(eq(userSmtpSettings.id, existing.id))
        .returning({
          host: userSmtpSettings.host,
          port: userSmtpSettings.port,
          username: userSmtpSettings.username,
          passwordEncrypted: userSmtpSettings.passwordEncrypted,
          fromName: userSmtpSettings.fromName,
          fromEmail: userSmtpSettings.fromEmail,
          updatedAt: userSmtpSettings.updatedAt,
        });

      return toPublic(updated);
    }

    const [created] = await tx
      .insert(userSmtpSettings)
      .values({
        tenantId,
        userId,
        ...values,
      })
      .returning({
        host: userSmtpSettings.host,
        port: userSmtpSettings.port,
        username: userSmtpSettings.username,
        passwordEncrypted: userSmtpSettings.passwordEncrypted,
        fromName: userSmtpSettings.fromName,
        fromEmail: userSmtpSettings.fromEmail,
        updatedAt: userSmtpSettings.updatedAt,
      });

    return toPublic(created);
  });
}

export function encryptSmtpPassword(password: string): string {
  return encryptSecret(password);
}

export async function resolvePasswordEncrypted(
  tenantId: string,
  userId: string,
  newPassword: string | undefined
): Promise<{ passwordEncrypted: string | null }> {
  const trimmed = newPassword?.trim() ?? "";

  if (trimmed) {
    return { passwordEncrypted: encryptSmtpPassword(trimmed) };
  }

  const existing = await withTenantDb(tenantId, async (tx) => {
    const [row] = await tx
      .select({ passwordEncrypted: userSmtpSettings.passwordEncrypted })
      .from(userSmtpSettings)
      .where(
        and(
          eq(userSmtpSettings.tenantId, tenantId),
          eq(userSmtpSettings.userId, userId)
        )
      )
      .limit(1);
    return row ?? null;
  });

  return { passwordEncrypted: existing?.passwordEncrypted ?? null };
}
