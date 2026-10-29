import type { ClientKind } from "@/lib/db/schema";
import { namesSimilar } from "@/lib/matters/collision";
import type { ClientListItem } from "@/lib/matters/types";

export const DEFAULT_CLIENT_NAME = "Neuer Mandant";
export const DEFAULT_MATTER_TITLE = "Neue Akte";

export type MatterIntakeDraft = {
  clientId: string;
  clientKind: ClientKind;
  clientName: string;
  clientFirstName: string;
  clientLastName: string;
  clientStreet: string;
  clientPostalCode: string;
  clientCity: string;
  opponentName: string;
  subject: string;
  title: string;
  legalArea: string;
  courtName: string;
  courtFileNumber: string;
  amountInDispute: string;
};

export function emptyIntakeDraft(): MatterIntakeDraft {
  return {
    clientId: "",
    clientKind: "company",
    clientName: "",
    clientFirstName: "",
    clientLastName: "",
    clientStreet: "",
    clientPostalCode: "",
    clientCity: "",
    opponentName: "",
    subject: "",
    title: "",
    legalArea: "",
    courtName: "",
    courtFileNumber: "",
    amountInDispute: "",
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseIntakeJson(raw: string): MatterIntakeDraft {
  const draft = emptyIntakeDraft();
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced?.[1]?.trim() ?? trimmed;
  const start = jsonText.indexOf("{");
  const end = jsonText.lastIndexOf("}");
  if (start < 0 || end <= start) return draft;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText.slice(start, end + 1));
  } catch {
    return draft;
  }
  if (!parsed || typeof parsed !== "object") return draft;
  const data = parsed as Record<string, unknown>;
  const client =
    data.client && typeof data.client === "object"
      ? (data.client as Record<string, unknown>)
      : data;

  const kindRaw = asString(client.kind).toLowerCase();
  draft.clientKind = kindRaw === "person" ? "person" : "company";
  draft.clientName = asString(client.name) || asString(client.clientName);
  draft.clientFirstName = asString(client.firstName);
  draft.clientLastName = asString(client.lastName);
  draft.clientStreet = asString(client.street);
  draft.clientPostalCode = asString(client.postalCode);
  draft.clientCity = asString(client.city);
  draft.opponentName = asString(data.opponentName) || asString(data.opponent);
  draft.subject = asString(data.subject);
  draft.title = asString(data.title);
  draft.legalArea = asString(data.legalArea);
  draft.courtName = asString(data.courtName);
  draft.courtFileNumber = asString(data.courtFileNumber);
  draft.amountInDispute = asString(data.amountInDispute);

  if (!draft.clientName && (draft.clientFirstName || draft.clientLastName)) {
    draft.clientName = [draft.clientFirstName, draft.clientLastName]
      .filter(Boolean)
      .join(" ");
    draft.clientKind = "person";
  }
  return draft;
}

export function matchExistingClient(
  draft: MatterIntakeDraft,
  clients: ClientListItem[]
): MatterIntakeDraft {
  const name = draft.clientName.trim();
  if (!name) return draft;
  const match = clients.find((client) => namesSimilar(client.name, name));
  if (!match) return draft;
  return {
    ...draft,
    clientId: match.id,
    clientKind: match.kind,
    clientName: match.name,
    clientFirstName: match.firstName || draft.clientFirstName,
    clientLastName: match.lastName || draft.clientLastName,
    clientStreet: match.street || draft.clientStreet,
    clientPostalCode: match.postalCode || draft.clientPostalCode,
    clientCity: match.city || draft.clientCity,
  };
}
