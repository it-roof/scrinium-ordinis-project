import { createHash, randomBytes } from "crypto";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function hashIntakeToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createIntakeToken(): {
  token: string;
  tokenHash: string;
  expiresAt: string;
} {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashIntakeToken(token),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  };
}

export function publicIntakeUrl(baseUrl: string, token: string) {
  return `${baseUrl.replace(/\/$/, "")}/aufnahme/${token}`;
}
