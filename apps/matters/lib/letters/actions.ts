"use server";

import { askClaude } from "@/lib/ai/bedrock";
import { AiGatewayError, userMessageForAiError } from "@/lib/ai/errors";
import { practiceForDeskRole } from "@/lib/chat/practice";
import {
  appendOwnChatMessage,
  getOwnChat,
  setOwnChatLetterId,
} from "@/lib/chat/storage";
import type { ChatMessageRecord } from "@/lib/chat/types";
import { letterFilename } from "@/lib/letters/document-model";
import { buildLetterDocx } from "@/lib/letters/export-docx";
import { buildLetterPdf } from "@/lib/letters/export-pdf";
import {
  formatLetterPreview,
  parseCreateLetterOutput,
} from "@/lib/letters/parse";
import {
  CREATE_LETTER_MAX_TOKENS,
  buildCreateLetterSystemPrompt,
  buildCreateLetterUserMessage,
} from "@/lib/letters/prompt";
import {
  createLetterRow,
  getLetterById,
  listMatterLetters,
  updateLetterRow,
} from "@/lib/letters/storage";
import type {
  LetterDraftInput,
  LetterRecord,
  MatterLetterListItem,
} from "@/lib/letters/types";
import { getPracticeMatter } from "@/lib/matters/storage";
import { pseudonymize } from "@/lib/ai/pseudonymize";
import { requireTenantUser } from "@/lib/tenant/session";

type LetterActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function listMatterLettersAction(
  matterId: string
): Promise<LetterActionResult<MatterLetterListItem[]>> {
  const user = await requireTenantUser();
  if (!matterId.trim()) {
    return { success: false, error: "Akte nicht gefunden." };
  }
  const practice = practiceForDeskRole(user.deskRole);
  const matter = await getPracticeMatter({
    tenantId: user.tenantId,
    practice,
    matterId,
  });
  if (!matter) {
    return { success: false, error: "Akte nicht gefunden." };
  }
  try {
    const items = await listMatterLetters(user.tenantId, matterId, practice);
    return { success: true, data: items };
  } catch (error) {
    console.error("[listMatterLettersAction]", error);
    return { success: false, error: "Schreiben konnten nicht geladen werden." };
  }
}

export async function createLetterFromChatAction(
  chatId: string,
  sourceMessageId: string
): Promise<
  LetterActionResult<{ letter: LetterRecord; message: ChatMessageRecord }>
> {
  const user = await requireTenantUser();
  if (!chatId.trim() || chatId.startsWith("draft-") || !sourceMessageId.trim()) {
    return { success: false, error: "Chat nicht gefunden." };
  }

  const practice = practiceForDeskRole(user.deskRole);
  const chat = await getOwnChat({
    tenantId: user.tenantId,
    userId: user.id,
    practice,
    chatId,
  });
  if (!chat) {
    return { success: false, error: "Chat nicht gefunden." };
  }

  const source = chat.messages.find(
    (message) =>
      message.id === sourceMessageId &&
      message.role === "assistant" &&
      message.actionId !== "create-letter"
  );
  if (!source?.content.trim()) {
    return { success: false, error: "Keine Antwort zum Übernehmen." };
  }

  try {
    const prepared = pseudonymize(source.content);
    const raw = await askClaude({
      system: buildCreateLetterSystemPrompt(),
      userText: buildCreateLetterUserMessage(prepared.text),
      maxTokens: CREATE_LETTER_MAX_TOKENS,
    });
    if (!raw.trim()) {
      return { success: false, error: "Kein Schreiben-Entwurf erzeugt." };
    }

    const parsed = parseCreateLetterOutput(raw);
    const draft: LetterDraftInput = {
      title: parsed.title,
      salutation: parsed.salutation,
      body: parsed.body,
      closing: parsed.closing,
    };

    let letter: LetterRecord | null = null;
    if (chat.letterId) {
      letter = await updateLetterRow({
        tenantId: user.tenantId,
        letterId: chat.letterId,
        practice,
        draft,
      });
    }
    if (!letter) {
      letter = await createLetterRow({
        tenantId: user.tenantId,
        userId: user.id,
        practice,
        matterId: chat.matterId,
        draft,
      });
    }
    if (!letter) {
      return { success: false, error: "Schreiben konnte nicht gespeichert werden." };
    }

    await setOwnChatLetterId({
      tenantId: user.tenantId,
      userId: user.id,
      practice,
      chatId: chat.id,
      letterId: letter.id,
    });

    const message = await appendOwnChatMessage({
      tenantId: user.tenantId,
      userId: user.id,
      practice,
      chatId: chat.id,
      role: "assistant",
      content: formatLetterPreview(letter),
      actionId: "create-letter",
    });
    if (!message) {
      return { success: false, error: "Schreiben konnte nicht gespeichert werden." };
    }

    return { success: true, data: { letter, message } };
  } catch (error) {
    if (error instanceof AiGatewayError) {
      return { success: false, error: userMessageForAiError(error.code) };
    }
    console.error("[createLetterFromChatAction]", error);
    return { success: false, error: "Schreiben konnte nicht erstellt werden." };
  }
}

export async function updateLetterAction(
  letterId: string,
  draft: LetterDraftInput
): Promise<LetterActionResult<LetterRecord>> {
  const user = await requireTenantUser();
  if (!letterId.trim()) {
    return { success: false, error: "Schreiben nicht gefunden." };
  }
  if (!draft.body.trim()) {
    return { success: false, error: "Bitte einen Text angeben." };
  }
  try {
    const letter = await updateLetterRow({
      tenantId: user.tenantId,
      letterId,
      practice: practiceForDeskRole(user.deskRole),
      draft,
    });
    if (!letter) {
      return { success: false, error: "Schreiben nicht gefunden." };
    }
    return { success: true, data: letter };
  } catch (error) {
    console.error("[updateLetterAction]", error);
    return { success: false, error: "Schreiben konnte nicht gespeichert werden." };
  }
}

export async function exportLetterAction(
  letterId: string,
  format: "pdf" | "docx"
): Promise<
  LetterActionResult<{ filename: string; mimeType: string; base64: string }>
> {
  const user = await requireTenantUser();
  if (!letterId.trim()) {
    return { success: false, error: "Schreiben nicht gefunden." };
  }
  const letter = await getLetterById(user.tenantId, letterId);
  if (!letter) {
    return { success: false, error: "Schreiben nicht gefunden." };
  }

  try {
    const model = {
      title: letter.title,
      subject: letter.subject,
      salutation: letter.salutation,
      body: letter.body,
      closing: letter.closing,
    };
    const buffer =
      format === "pdf"
        ? await buildLetterPdf(model)
        : Buffer.from(await buildLetterDocx(model));
    return {
      success: true,
      data: {
        filename: letterFilename(letter.title, format),
        mimeType:
          format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        base64: buffer.toString("base64"),
      },
    };
  } catch (error) {
    console.error("[exportLetterAction]", error);
    return { success: false, error: "Export fehlgeschlagen." };
  }
}
