import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Ableitung eines 32-Byte-Schlüssels aus ENCRYPTION_KEY oder AUTH_SECRET.
 * ENCRYPTION_KEY bevorzugt — AUTH_SECRET nur Fallback für lokale Dev.
 */
function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY?.trim() || process.env.AUTH_SECRET?.trim();

  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY oder AUTH_SECRET muss für die Geheimnis-Verschlüsselung gesetzt sein."
    );
  }

  return createHash("sha256").update(raw).digest();
}

/** Format: base64(iv).base64(ciphertext).base64(authTag) */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    encrypted.toString("base64"),
    authTag.toString("base64"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 3) {
    throw new Error("Ungültiges Geheimnis-Format.");
  }

  const [ivB64, dataB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Ungültiges Geheimnis-Format.");
  }

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8"
  );
}
