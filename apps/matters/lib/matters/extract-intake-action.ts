"use server";

import { askClaudeWithDocument } from "@/lib/ai/bedrock";
import { AiGatewayError, userMessageForAiError } from "@/lib/ai/errors";
import { practiceForDeskRole } from "@/lib/chat/practice";
import { extractableDocumentFormat } from "@/lib/matters/files-types";
import {
  emptyIntakeDraft,
  matchExistingClient,
  parseIntakeJson,
  type MatterIntakeDraft,
} from "@/lib/matters/intake";
import { listPracticeClients } from "@/lib/matters/storage";
import { requireTenantUser } from "@/lib/tenant/session";

const EXTRACT_SYSTEM = `Du liest ein deutsches Anwaltsdokument (Klage, Schreiben, Vertrag, Vollmacht).
Antworte NUR mit einem JSON-Objekt, ohne Markdown, ohne Kommentar:
{
  "client": {
    "kind": "company" | "person",
    "name": "",
    "firstName": "",
    "lastName": "",
    "street": "",
    "postalCode": "",
    "city": ""
  },
  "opponentName": "",
  "subject": "",
  "title": "",
  "legalArea": "",
  "courtName": "",
  "courtFileNumber": "",
  "amountInDispute": ""
}
client ist der Mandant der Kanzlei (Auftraggeber), nicht das Gericht.
Leere Felder als "". Keine erfundenen Daten.`;

export async function extractMatterIntakeAction(
  formData: FormData
): Promise<
  | { success: true; draft: MatterIntakeDraft }
  | { success: false; error: string }
> {
  const user = await requireTenantUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Bitte ein PDF oder Word-Dokument ablegen." };
  }

  const format = extractableDocumentFormat(file.name, file.type);
  if (!format) {
    return { success: true, draft: emptyIntakeDraft() };
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const text = await askClaudeWithDocument({
      system: EXTRACT_SYSTEM,
      userText:
        "Extrahiere Mandanten- und Aktendaten als JSON. Unsichere Felder leer lassen.",
      document: {
        format,
        name: format === "pdf" ? "document" : "brief",
        bytes,
      },
    });
    const practice = practiceForDeskRole(user.deskRole);
    const clients = await listPracticeClients({
      tenantId: user.tenantId,
      practice,
    });
    return {
      success: true,
      draft: matchExistingClient(parseIntakeJson(text), clients),
    };
  } catch (error) {
    if (error instanceof AiGatewayError) {
      return { success: false, error: userMessageForAiError(error.code) };
    }
    console.error("[extractMatterIntakeAction]", error);
    return {
      success: false,
      error: "Das Dokument konnte nicht gelesen werden.",
    };
  }
}
