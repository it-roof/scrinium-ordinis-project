import "server-only";

/** Stable error codes for AI gateway (no content in messages beyond these). */
export const AI_ERROR = {
  NO_CONSENT: "NO_CONSENT",
  FORBIDDEN: "FORBIDDEN",
  AI_ERROR: "AI_ERROR",
  AI_ACCESS_DENIED: "AI_ACCESS_DENIED",
  VALIDATION: "VALIDATION",
  RESIDUAL_PII: "RESIDUAL_PII",
  NOT_FOUND: "NOT_FOUND",
} as const;

export type AiErrorCode = (typeof AI_ERROR)[keyof typeof AI_ERROR];

export class AiGatewayError extends Error {
  readonly code: AiErrorCode;

  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.name = "AiGatewayError";
    this.code = code;
  }
}

export function userMessageForAiError(code: AiErrorCode): string {
  switch (code) {
    case AI_ERROR.NO_CONSENT:
      return "Keine KI-Einwilligung des Mandanten.";
    case AI_ERROR.FORBIDDEN:
      return "Nicht erlaubt.";
    case AI_ERROR.NOT_FOUND:
      return "Akte oder Mandant nicht gefunden.";
    case AI_ERROR.VALIDATION:
      return "Eingabe ungültig.";
    case AI_ERROR.RESIDUAL_PII:
      return "Noch unklare Namen in der Vorschau — bitte markieren oder als kein Personenbezug bestätigen.";
    case AI_ERROR.AI_ACCESS_DENIED:
      return "Kein Zugriff auf das KI-Modell (AWS-Berechtigung fehlt). Bitte IAM für Bedrock prüfen.";
    case AI_ERROR.AI_ERROR:
    default:
      return "Die KI-Analyse ist fehlgeschlagen. Bitte erneut versuchen.";
  }
}
