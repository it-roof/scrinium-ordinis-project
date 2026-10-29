/**
 * Produkt-Aktionskatalog — Zuordnung zum regulierten Akten-Chat.
 * Quelle der Wahrheit für Badges und Dev-UI. Siehe docs/ki-chat-konzept.md.
 *
 * Badges = Start-Werkzeuge. Abschluss (Öffnen, PDF, Senden) = Artefakt-Aktionen im Thread.
 */

export type ProductActionKind = "prompt" | "function";

/** Chat-Ort laut Konzept (nur noch regulierter Chat). */
export type ProductChatSlot = "matter";

export type ProductActionStatus = "live" | "planned";

export type ProductAction = {
  id: string;
  kind: ProductActionKind;
  label: string;
  /** Welche Chats diese Aktion zugeordnet bekommen. */
  chatSlots: readonly ProductChatSlot[];
  /** In v1 als Badge über dem Composer anzeigen. */
  badgeV1: boolean;
  status: ProductActionStatus;
};

/**
 * Eine gemeinsame Liste. Badges = filter badgeV1 + chatSlot.
 * Freier Dialog = der Chat selbst (Assistant-Reply), kein Badge.
 * Folgeaktionen am Artefakt: send-email / open / print — nicht badgeV1.
 */
export const PRODUCT_ACTIONS: readonly ProductAction[] = [
  {
    id: "analyze-case-facts",
    kind: "prompt",
    label: "Sachverhalt analysieren",
    chatSlots: ["matter"],
    badgeV1: true,
    status: "live",
  },
  {
    id: "counter-review",
    kind: "prompt",
    label: "Gegenprüfung",
    chatSlots: ["matter"],
    badgeV1: true,
    status: "live",
  },
  {
    id: "create-letter",
    kind: "prompt",
    label: "Schreiben erstellen",
    chatSlots: ["matter"],
    badgeV1: true,
    status: "live",
  },
  {
    id: "create-email-text",
    kind: "prompt",
    label: "E-Mail-Text erstellen",
    chatSlots: ["matter"],
    badgeV1: true,
    status: "live",
  },
  {
    id: "send-email",
    kind: "function",
    label: "E-Mail senden",
    chatSlots: ["matter"],
    badgeV1: false,
    status: "live",
  },
  {
    id: "open-save-letter",
    kind: "function",
    label: "Schreiben öffnen",
    chatSlots: ["matter"],
    badgeV1: false,
    status: "live",
  },
  {
    id: "print-download",
    kind: "function",
    label: "PDF / DOCX",
    chatSlots: ["matter"],
    badgeV1: false,
    status: "live",
  },
];

/** Badges für die Leiste über dem Composer (v1). */
export function productBadgesForChat(
  slot: ProductChatSlot
): ProductAction[] {
  return PRODUCT_ACTIONS.filter(
    (action) => action.badgeV1 && action.chatSlots.includes(slot)
  );
}
