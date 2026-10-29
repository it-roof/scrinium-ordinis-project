import "server-only";

export const AI_ERROR = {
  AI_ERROR: "AI_ERROR",
  AI_ACCESS_DENIED: "AI_ACCESS_DENIED",
  VALIDATION: "VALIDATION",
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
    case AI_ERROR.VALIDATION:
      return "Eingabe ungültig.";
    case AI_ERROR.AI_ACCESS_DENIED:
      return "Kein Zugriff auf das KI-Modell. Bitte später erneut versuchen.";
    case AI_ERROR.AI_ERROR:
    default:
      return "Die Antwort ist fehlgeschlagen. Bitte erneut versuchen.";
  }
}
