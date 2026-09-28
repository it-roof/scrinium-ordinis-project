"use server";

import { revalidatePath } from "next/cache";

import {
  getAiJobStatus,
  previewCaseFactsAnalysis,
  startCaseFactsAnalysisJob,
} from "@/lib/ai/actions";
import {
  appendMatterAiChatMessages,
  createMatterAiChat,
  getMatterAiChatDetail,
  listMatterAiChats,
  setMatterAiChatLetterId,
  type MatterAiChatDetail,
  type MatterAiChatListItem,
  type MatterAiChatMessageRecord,
} from "@/lib/ai/matter-chat/storage";
import {
  pickLastAnalysisResult,
  pickLastEmailDraft,
  pickLastEmailSource,
  pickLastLetterSource,
} from "@/lib/ai/matter-chat/helpers";
import { AI_FACTS_MAX_CHARS } from "@/lib/ai/limits";
import { practiceBasePath } from "@/lib/area/paths";
import type { PseudonymGatePolicy } from "@/lib/ai/gate-policy";
import {
  CREATE_LETTER_TASK,
  parseCreateLetterOutput,
} from "@/lib/ai/prompts/create-letter";
import {
  CREATE_EMAIL_TEXT_TASK,
  listOpenDoubleBracePlaceholders,
  parseCreateEmailTextOutput,
} from "@/lib/ai/prompts/create-email-text";
import { COUNTER_REVIEW_TASK } from "@/lib/ai/prompts/counter-review";
import { createLetterRow } from "@/lib/letters/storage";
import { sendMailWithUserSmtp } from "@/lib/smtp/send";
import { getUserSmtpConnectionConfig } from "@/lib/smtp/storage";
import type { PracticeId } from "@/lib/modules";
import { isAppModuleId } from "@/lib/modules";
import { getMatterById } from "@/lib/matters/storage";
import { assertUserCanAccessAreaFunction } from "@/lib/tenant/access";
import { getUserEffectiveModules } from "@/lib/tenant/modules";
import { requireSessionUser } from "@/lib/tenant/session";

export type MatterChatActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Sachverhalt / Analyse-Ergebnis — länger als Freier-Chat-Turns. */
const MATTER_CHAT_CONTENT_MAX = AI_FACTS_MAX_CHARS;

async function requireAktenChatContext(practice: PracticeId) {
  const user = await requireSessionUser();
  if (!user) {
    return { ok: false as const, error: "Bitte anmelden." };
  }
  const denied = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "akten-chat"
  );
  if (denied) {
    return { ok: false as const, error: denied };
  }
  const modules = await getUserEffectiveModules(user.id, user.tenantId);
  if (!modules.includes(practice)) {
    return { ok: false as const, error: "Kein Zugriff auf diesen Bereich." };
  }
  return { ok: true as const, user };
}

async function requireAktenChatAndAnalysis(practice: PracticeId) {
  const gate = await requireAktenChatContext(practice);
  if (!gate.ok) return gate;
  const denied = await assertUserCanAccessAreaFunction(
    gate.user.id,
    gate.user.tenantId,
    "case-facts-analysis"
  );
  if (denied) {
    return { ok: false as const, error: denied };
  }
  return gate;
}

async function requireAktenChatAnalysisAndLetters(practice: PracticeId) {
  const gate = await requireAktenChatAndAnalysis(practice);
  if (!gate.ok) return gate;
  const denied = await assertUserCanAccessAreaFunction(
    gate.user.id,
    gate.user.tenantId,
    "letters"
  );
  if (denied) {
    return { ok: false as const, error: denied };
  }
  return gate;
}

function revalidateChat(
  practice: PracticeId,
  matterId: string,
  chatId: string
) {
  const base = practiceBasePath(practice);
  revalidatePath(`${base}/akten-chat/${matterId}`);
  revalidatePath(`${base}/akten-chat/${matterId}/${chatId}`);
}

export async function listMatterChatsAction(params: {
  matterId: string;
  practice: PracticeId;
}): Promise<MatterChatActionResult<MatterAiChatListItem[]>> {
  const gate = await requireAktenChatContext(params.practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const matter = await getMatterById(gate.user.tenantId, params.matterId);
  if (!matter || matter.module !== params.practice) {
    return { success: false, error: "Akte nicht gefunden." };
  }

  const chats = await listMatterAiChats(
    gate.user.tenantId,
    params.matterId,
    params.practice
  );
  return { success: true, data: chats };
}

export async function createMatterChatAction(params: {
  matterId: string;
  practice: PracticeId;
  title?: string;
}): Promise<MatterChatActionResult<{ chatId: string; href: string }>> {
  const gate = await requireAktenChatContext(params.practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const matter = await getMatterById(gate.user.tenantId, params.matterId);
  if (!matter || matter.module !== params.practice) {
    return { success: false, error: "Akte nicht gefunden." };
  }

  const chat = await createMatterAiChat({
    tenantId: gate.user.tenantId,
    userId: gate.user.id,
    matterId: params.matterId,
    module: params.practice,
    title: params.title,
  });

  if (!chat) {
    return { success: false, error: "Chat konnte nicht angelegt werden." };
  }

  const base = practiceBasePath(params.practice);
  const href = `${base}/akten-chat/${params.matterId}/${chat.id}`;
  revalidatePath(`${base}/akten-chat/${params.matterId}`);
  return { success: true, data: { chatId: chat.id, href } };
}

export async function getMatterChatAction(params: {
  chatId: string;
  practice: PracticeId;
}): Promise<MatterChatActionResult<MatterAiChatDetail>> {
  const gate = await requireAktenChatContext(params.practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const detail = await getMatterAiChatDetail({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
  });
  if (!detail) {
    return { success: false, error: "Chat nicht gefunden." };
  }

  const matter = await getMatterById(gate.user.tenantId, detail.matterId);
  if (!matter || matter.module !== params.practice) {
    return { success: false, error: "Akte nicht gefunden." };
  }

  return { success: true, data: detail };
}

/** Nutzer-Nachricht speichern (kein automatischer Assistant-Reply). */
export async function appendMatterChatUserMessageAction(params: {
  chatId: string;
  practice: PracticeId;
  message: string;
  actionId?: string | null;
}): Promise<
  MatterChatActionResult<{ messages: MatterAiChatMessageRecord[] }>
> {
  const gate = await requireAktenChatContext(params.practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const text = params.message.trim();
  if (!text) {
    return { success: false, error: "Nachricht fehlt." };
  }
  if (text.length > MATTER_CHAT_CONTENT_MAX) {
    return {
      success: false,
      error: `Maximal ${MATTER_CHAT_CONTENT_MAX} Zeichen.`,
    };
  }

  const detail = await getMatterAiChatDetail({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
  });
  if (!detail) {
    return { success: false, error: "Chat nicht gefunden." };
  }

  const inserted = await appendMatterAiChatMessages({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
    messages: [
      {
        role: "user",
        content: text,
        actionId: params.actionId ?? null,
      },
    ],
  });

  if (!inserted) {
    return { success: false, error: "Speichern fehlgeschlagen." };
  }

  revalidateChat(params.practice, detail.matterId, params.chatId);
  return { success: true, data: { messages: inserted } };
}

/**
 * Word/PDF anhängen: Text extrahieren (Datei wird nicht gespeichert) und
 * als User-Nachricht im Akten-Chat ablegen.
 */
export async function appendMatterChatDocumentAction(
  formData: FormData
): Promise<
  MatterChatActionResult<{
    messages: MatterAiChatMessageRecord[];
    truncated: boolean;
    filename: string;
  }>
> {
  const chatId = String(formData.get("chatId") ?? "").trim();
  const practiceRaw = String(formData.get("practice") ?? "").trim();
  const note = String(formData.get("note") ?? "");
  const file = formData.get("file");

  if (!chatId) {
    return { success: false, error: "Chat fehlt." };
  }
  if (!isAppModuleId(practiceRaw)) {
    return { success: false, error: "Bereich ungültig." };
  }
  const practice = practiceRaw;

  const gate = await requireAktenChatContext(practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  if (!(file instanceof File)) {
    return { success: false, error: "Bitte eine Datei auswählen." };
  }

  const detail = await getMatterAiChatDetail({
    tenantId: gate.user.tenantId,
    chatId,
    module: practice,
  });
  if (!detail) {
    return { success: false, error: "Chat nicht gefunden." };
  }

  try {
    const { extractContractTextFromBuffer } = await import(
      "@/lib/ai/contract-extract-server"
    );
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractContractTextFromBuffer({
      buffer,
      filename: file.name,
      mimeType: file.type || "",
    });
    if (!result.ok) {
      return { success: false, error: result.error };
    }

    const noteTrimmed = note.trim();
    const body = noteTrimmed
      ? `${noteTrimmed}\n\n${result.text}`
      : result.text;
    const content = `Anhang: ${result.filename}\n\n${body}`;
    if (content.length > MATTER_CHAT_CONTENT_MAX) {
      return {
        success: false,
        error: `Maximal ${MATTER_CHAT_CONTENT_MAX} Zeichen (Text aus Datei zu lang).`,
      };
    }

    const inserted = await appendMatterAiChatMessages({
      tenantId: gate.user.tenantId,
      chatId,
      module: practice,
      messages: [{ role: "user", content, actionId: null }],
    });
    if (!inserted) {
      return { success: false, error: "Speichern fehlgeschlagen." };
    }

    revalidateChat(practice, detail.matterId, chatId);
    return {
      success: true,
      data: {
        messages: inserted,
        truncated: result.truncated,
        filename: result.filename,
      },
    };
  } catch {
    console.error("[ai/matter-chat]", "DOCUMENT_EXTRACT_FAILED");
    return { success: false, error: "Datei konnte nicht gelesen werden." };
  }
}

export type AktenChatAnalysisPreview = {
  facts: string;
  pseudonymizedText: string;
  residuals: string[];
  gatePolicy: PseudonymGatePolicy;
  messages: MatterAiChatMessageRecord[];
};

/**
 * Sachverhalt analysieren — Schritt 1: Pseudonym-Vorschau + Chat-Einträge.
 */
export async function previewAktenChatCaseFactsAction(params: {
  chatId: string;
  practice: PracticeId;
  matterId: string;
  facts: string;
  /** Wenn true: facts bereits als User-Message gespeichert. */
  factsAlreadySaved?: boolean;
}): Promise<MatterChatActionResult<AktenChatAnalysisPreview>> {
  const gate = await requireAktenChatAndAnalysis(params.practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const facts = params.facts.trim();
  if (!facts) {
    return { success: false, error: "Bitte einen Sachverhalt eingeben." };
  }
  if (facts.length > AI_FACTS_MAX_CHARS) {
    return {
      success: false,
      error: `Maximal ${AI_FACTS_MAX_CHARS} Zeichen.`,
    };
  }

  const detail = await getMatterAiChatDetail({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
  });
  if (!detail || detail.matterId !== params.matterId) {
    return { success: false, error: "Chat nicht gefunden." };
  }

  const preview = await previewCaseFactsAnalysis({
    matterId: params.matterId,
    facts,
  });
  if (!preview.success) {
    return { success: false, error: preview.error };
  }

  const toInsert: Array<{
    role: MatterAiChatMessageRecord["role"];
    content: string;
    actionId?: string | null;
  }> = [];

  if (!params.factsAlreadySaved) {
    toInsert.push({
      role: "user",
      content: facts,
      actionId: null,
    });
  }

  toInsert.push({
    role: "user",
    content: "Sachverhalt analysieren",
    actionId: "analyze-case-facts",
  });

  const residualNote =
    preview.residuals.length > 0
      ? `\n\nUnklare Stellen (${preview.residuals.length}): bitte markieren oder als kein Personenbezug bestätigen, dann Analyse starten.`
      : "\n\nVorschau geprüft — Analyse kann gestartet werden.";

  toInsert.push({
    role: "assistant",
    content: `Pseudonymisierte Vorschau (Auszug):\n\n${preview.pseudonymizedText.slice(0, 2500)}${preview.pseudonymizedText.length > 2500 ? "…" : ""}${residualNote}`,
    actionId: "analyze-case-facts",
  });

  const inserted = await appendMatterAiChatMessages({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
    messages: toInsert,
  });

  if (!inserted) {
    return { success: false, error: "Speichern fehlgeschlagen." };
  }

  revalidateChat(params.practice, detail.matterId, params.chatId);

  return {
    success: true,
    data: {
      facts,
      pseudonymizedText: preview.pseudonymizedText,
      residuals: preview.residuals,
      gatePolicy: preview.gatePolicy,
      messages: inserted,
    },
  };
}

/**
 * Sachverhalt analysieren — Schritt 2: Job starten.
 */
export async function startAktenChatCaseFactsJobAction(params: {
  chatId: string;
  practice: PracticeId;
  matterId: string;
  facts: string;
  manualMarks?: string[];
  dismissedResiduals?: string[];
}): Promise<
  MatterChatActionResult<{
    jobId: string;
    messages: MatterAiChatMessageRecord[];
  }>
> {
  const gate = await requireAktenChatAndAnalysis(params.practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const detail = await getMatterAiChatDetail({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
  });
  if (!detail || detail.matterId !== params.matterId) {
    return { success: false, error: "Chat nicht gefunden." };
  }

  const started = await startCaseFactsAnalysisJob({
    matterId: params.matterId,
    facts: params.facts,
    manualMarks: params.manualMarks,
    dismissedResiduals: params.dismissedResiduals,
    previewConfirmed: true,
  });

  if (!started.success) {
    return { success: false, error: started.error };
  }

  const inserted = await appendMatterAiChatMessages({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
    messages: [
      {
        role: "assistant",
        content:
          "Analyse läuft… Das kann einige Minuten dauern. Das Ergebnis erscheint hier im Chat.",
        actionId: "analyze-case-facts",
      },
    ],
  });

  if (!inserted) {
    return { success: false, error: "Speichern fehlgeschlagen." };
  }

  revalidateChat(params.practice, detail.matterId, params.chatId);
  return {
    success: true,
    data: { jobId: started.jobId, messages: inserted },
  };
}

/**
 * Job abschließen: Entwurf in den Chat schreiben.
 */
export async function finishAktenChatCaseFactsJobAction(params: {
  chatId: string;
  practice: PracticeId;
  matterId: string;
  jobId: string;
  /** Message actionId for the result (default: analyze-case-facts). */
  actionId?: string;
}): Promise<
  MatterChatActionResult<{
    messages: MatterAiChatMessageRecord[];
    status: "succeeded" | "failed" | "pending" | "running";
  }>
> {
  const gate = await requireAktenChatAndAnalysis(params.practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const actionId = params.actionId ?? "analyze-case-facts";

  const detail = await getMatterAiChatDetail({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
  });
  if (!detail || detail.matterId !== params.matterId) {
    return { success: false, error: "Chat nicht gefunden." };
  }

  const status = await getAiJobStatus(params.jobId);
  if (!status.success) {
    return { success: false, error: status.error };
  }

  if (status.job.status === "pending" || status.job.status === "running") {
    return {
      success: true,
      data: { messages: [], status: status.job.status },
    };
  }

  if (status.job.status === "failed") {
    const inserted = await appendMatterAiChatMessages({
      tenantId: gate.user.tenantId,
      chatId: params.chatId,
      module: params.practice,
      messages: [
        {
          role: "assistant",
          content:
            status.errorMessage ??
            "Die KI-Aktion ist fehlgeschlagen. Bitte erneut versuchen.",
          actionId,
        },
      ],
    });
    revalidateChat(params.practice, detail.matterId, params.chatId);
    return {
      success: true,
      data: {
        messages: inserted ?? [],
        status: "failed",
      },
    };
  }

  const draftContent = status.draft?.content?.trim() ?? "";
  if (!draftContent) {
    return {
      success: false,
      error: "Aktion ohne Entwurf abgeschlossen.",
    };
  }

  const inserted = await appendMatterAiChatMessages({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
    messages: [
      {
        role: "assistant",
        content: draftContent.slice(0, MATTER_CHAT_CONTENT_MAX),
        actionId,
      },
    ],
  });

  if (!inserted) {
    return { success: false, error: "Speichern fehlgeschlagen." };
  }

  revalidateChat(params.practice, detail.matterId, params.chatId);
  return {
    success: true,
    data: { messages: inserted, status: "succeeded" },
  };
}

/**
 * Gegenprüfung — Schritt 1: Pseudonym-Vorschau auf den letzten Analyse-Entwurf.
 */
export async function previewAktenChatCounterReviewAction(params: {
  chatId: string;
  practice: PracticeId;
  matterId: string;
}): Promise<MatterChatActionResult<AktenChatAnalysisPreview>> {
  const gate = await requireAktenChatAndAnalysis(params.practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const detail = await getMatterAiChatDetail({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
  });
  if (!detail || detail.matterId !== params.matterId) {
    return { success: false, error: "Chat nicht gefunden." };
  }

  const analysis = pickLastAnalysisResult(detail.messages);
  if (!analysis) {
    return {
      success: false,
      error: "Zuerst „Sachverhalt analysieren“ ausführen.",
    };
  }

  const facts = analysis.content.trim();
  if (facts.length > AI_FACTS_MAX_CHARS) {
    return {
      success: false,
      error: `Maximal ${AI_FACTS_MAX_CHARS} Zeichen.`,
    };
  }

  const preview = await previewCaseFactsAnalysis({
    matterId: params.matterId,
    facts,
  });
  if (!preview.success) {
    return { success: false, error: preview.error };
  }

  const residualNote =
    preview.residuals.length > 0
      ? `\n\nUnklare Stellen (${preview.residuals.length}): bitte markieren oder als kein Personenbezug bestätigen, dann Gegenprüfung starten.`
      : "\n\nVorschau geprüft — Gegenprüfung kann gestartet werden.";

  const inserted = await appendMatterAiChatMessages({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
    messages: [
      {
        role: "user",
        content: "Gegenprüfung",
        actionId: "counter-review",
      },
      {
        role: "assistant",
        content: `Pseudonymisierte Vorschau (Gegenprüfung, Auszug):\n\n${preview.pseudonymizedText.slice(0, 2500)}${preview.pseudonymizedText.length > 2500 ? "…" : ""}${residualNote}`,
        actionId: "counter-review",
      },
    ],
  });

  if (!inserted) {
    return { success: false, error: "Speichern fehlgeschlagen." };
  }

  revalidateChat(params.practice, detail.matterId, params.chatId);

  return {
    success: true,
    data: {
      facts,
      pseudonymizedText: preview.pseudonymizedText,
      residuals: preview.residuals,
      gatePolicy: preview.gatePolicy,
      messages: inserted,
    },
  };
}

/**
 * Gegenprüfung — Schritt 2: Job starten.
 */
export async function startAktenChatCounterReviewJobAction(params: {
  chatId: string;
  practice: PracticeId;
  matterId: string;
  facts: string;
  manualMarks?: string[];
  dismissedResiduals?: string[];
}): Promise<
  MatterChatActionResult<{
    jobId: string;
    messages: MatterAiChatMessageRecord[];
  }>
> {
  const gate = await requireAktenChatAndAnalysis(params.practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const detail = await getMatterAiChatDetail({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
  });
  if (!detail || detail.matterId !== params.matterId) {
    return { success: false, error: "Chat nicht gefunden." };
  }

  const started = await startCaseFactsAnalysisJob({
    matterId: params.matterId,
    facts: params.facts,
    manualMarks: params.manualMarks,
    dismissedResiduals: params.dismissedResiduals,
    previewConfirmed: true,
    task: COUNTER_REVIEW_TASK,
  });

  if (!started.success) {
    return { success: false, error: started.error };
  }

  const inserted = await appendMatterAiChatMessages({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
    messages: [
      {
        role: "assistant",
        content:
          "Gegenprüfung läuft… Das kann einige Minuten dauern. Das Ergebnis erscheint hier im Chat.",
        actionId: "counter-review",
      },
    ],
  });

  if (!inserted) {
    return { success: false, error: "Speichern fehlgeschlagen." };
  }

  revalidateChat(params.practice, detail.matterId, params.chatId);
  return {
    success: true,
    data: { jobId: started.jobId, messages: inserted },
  };
}

/**
 * Schreiben erstellen — Schritt 1: Pseudonym-Vorschau auf Analyse/Gegenprüfung.
 */
export async function previewAktenChatCreateLetterAction(params: {
  chatId: string;
  practice: PracticeId;
  matterId: string;
}): Promise<MatterChatActionResult<AktenChatAnalysisPreview>> {
  const gate = await requireAktenChatAnalysisAndLetters(params.practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const detail = await getMatterAiChatDetail({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
  });
  if (!detail || detail.matterId !== params.matterId) {
    return { success: false, error: "Chat nicht gefunden." };
  }

  const source = pickLastLetterSource(detail.messages);
  if (!source) {
    return {
      success: false,
      error: "Zuerst Analyse (optional Gegenprüfung) ausführen.",
    };
  }

  const facts = source.content.trim();
  if (facts.length > AI_FACTS_MAX_CHARS) {
    return {
      success: false,
      error: `Maximal ${AI_FACTS_MAX_CHARS} Zeichen.`,
    };
  }

  const preview = await previewCaseFactsAnalysis({
    matterId: params.matterId,
    facts,
  });
  if (!preview.success) {
    return { success: false, error: preview.error };
  }

  const residualNote =
    preview.residuals.length > 0
      ? `\n\nUnklare Stellen (${preview.residuals.length}): bitte markieren oder als kein Personenbezug bestätigen, dann Schreiben erstellen.`
      : "\n\nVorschau geprüft — Schreiben kann erstellt werden.";

  const inserted = await appendMatterAiChatMessages({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
    messages: [
      {
        role: "user",
        content: "Schreiben erstellen",
        actionId: "create-letter",
      },
      {
        role: "assistant",
        content: `Pseudonymisierte Vorschau (Schreiben, Auszug):\n\n${preview.pseudonymizedText.slice(0, 2500)}${preview.pseudonymizedText.length > 2500 ? "…" : ""}${residualNote}`,
        actionId: "create-letter",
      },
    ],
  });

  if (!inserted) {
    return { success: false, error: "Speichern fehlgeschlagen." };
  }

  revalidateChat(params.practice, detail.matterId, params.chatId);

  return {
    success: true,
    data: {
      facts,
      pseudonymizedText: preview.pseudonymizedText,
      residuals: preview.residuals,
      gatePolicy: preview.gatePolicy,
      messages: inserted,
    },
  };
}

/**
 * Schreiben erstellen — Schritt 2: Job starten.
 */
export async function startAktenChatCreateLetterJobAction(params: {
  chatId: string;
  practice: PracticeId;
  matterId: string;
  facts: string;
  manualMarks?: string[];
  dismissedResiduals?: string[];
}): Promise<
  MatterChatActionResult<{
    jobId: string;
    messages: MatterAiChatMessageRecord[];
  }>
> {
  const gate = await requireAktenChatAnalysisAndLetters(params.practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const detail = await getMatterAiChatDetail({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
  });
  if (!detail || detail.matterId !== params.matterId) {
    return { success: false, error: "Chat nicht gefunden." };
  }

  const started = await startCaseFactsAnalysisJob({
    matterId: params.matterId,
    facts: params.facts,
    manualMarks: params.manualMarks,
    dismissedResiduals: params.dismissedResiduals,
    previewConfirmed: true,
    task: CREATE_LETTER_TASK,
  });

  if (!started.success) {
    return { success: false, error: started.error };
  }

  const inserted = await appendMatterAiChatMessages({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
    messages: [
      {
        role: "assistant",
        content:
          "Schreiben wird erstellt… Das Ergebnis wird als neues Letter gespeichert und erscheint hier.",
        actionId: "create-letter",
      },
    ],
  });

  if (!inserted) {
    return { success: false, error: "Speichern fehlgeschlagen." };
  }

  revalidateChat(params.practice, detail.matterId, params.chatId);
  return {
    success: true,
    data: { jobId: started.jobId, messages: inserted },
  };
}

/**
 * Schreiben erstellen — Schritt 3: Letter anlegen + Chat-Link.
 */
export async function finishAktenChatCreateLetterJobAction(params: {
  chatId: string;
  practice: PracticeId;
  matterId: string;
  jobId: string;
}): Promise<
  MatterChatActionResult<{
    messages: MatterAiChatMessageRecord[];
    status: "succeeded" | "failed" | "pending" | "running";
    letterId?: string;
    letterHref?: string;
  }>
> {
  const gate = await requireAktenChatAnalysisAndLetters(params.practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const detail = await getMatterAiChatDetail({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
  });
  if (!detail || detail.matterId !== params.matterId) {
    return { success: false, error: "Chat nicht gefunden." };
  }

  const status = await getAiJobStatus(params.jobId);
  if (!status.success) {
    return { success: false, error: status.error };
  }

  if (status.job.status === "pending" || status.job.status === "running") {
    return {
      success: true,
      data: { messages: [], status: status.job.status },
    };
  }

  if (status.job.status === "failed") {
    const inserted = await appendMatterAiChatMessages({
      tenantId: gate.user.tenantId,
      chatId: params.chatId,
      module: params.practice,
      messages: [
        {
          role: "assistant",
          content:
            status.errorMessage ??
            "Schreiben konnte nicht erstellt werden. Bitte erneut versuchen.",
          actionId: "create-letter",
        },
      ],
    });
    revalidateChat(params.practice, detail.matterId, params.chatId);
    return {
      success: true,
      data: { messages: inserted ?? [], status: "failed" },
    };
  }

  const draftContent = status.draft?.content?.trim() ?? "";
  if (!draftContent) {
    return { success: false, error: "Kein Schreiben-Entwurf erzeugt." };
  }

  const parsed = parseCreateLetterOutput(draftContent);
  const letter = await createLetterRow(gate.user.tenantId, gate.user.id, {
    title: parsed.title || "Schreiben",
    kind: "schreiben",
    subject: "",
    salutation: parsed.salutation,
    body: parsed.body,
    closing: parsed.closing,
    module: params.practice,
    matterId: params.matterId,
  });

  if (!letter) {
    return { success: false, error: "Letter konnte nicht gespeichert werden." };
  }

  await setMatterAiChatLetterId({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
    letterId: letter.id,
  });

  const letterHref = `${practiceBasePath(params.practice)}/schreiben/${letter.id}/bearbeiten`;
  const inserted = await appendMatterAiChatMessages({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
    messages: [
      {
        role: "assistant",
        content: `Neues Schreiben angelegt: „${letter.title}“.\n\nÖffnen: ${letterHref}\n\n---\n\n${parsed.salutation ? `${parsed.salutation}\n\n` : ""}${parsed.body}${parsed.closing ? `\n\n${parsed.closing}` : ""}`,
        actionId: "create-letter",
      },
    ],
  });

  if (!inserted) {
    return { success: false, error: "Speichern fehlgeschlagen." };
  }

  revalidateChat(params.practice, detail.matterId, params.chatId);
  revalidatePath(`${practiceBasePath(params.practice)}/schreiben`);

  return {
    success: true,
    data: {
      messages: inserted,
      status: "succeeded",
      letterId: letter.id,
      letterHref,
    },
  };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * E-Mail-Text erstellen — Schritt 1: Pseudonym-Vorschau.
 */
export async function previewAktenChatCreateEmailTextAction(params: {
  chatId: string;
  practice: PracticeId;
  matterId: string;
}): Promise<MatterChatActionResult<AktenChatAnalysisPreview>> {
  const gate = await requireAktenChatAndAnalysis(params.practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const detail = await getMatterAiChatDetail({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
  });
  if (!detail || detail.matterId !== params.matterId) {
    return { success: false, error: "Chat nicht gefunden." };
  }

  const source = pickLastEmailSource(detail.messages);
  if (!source) {
    return {
      success: false,
      error: "Zuerst Analyse oder Schreiben erstellen.",
    };
  }

  const facts = source.content.trim();
  if (facts.length > AI_FACTS_MAX_CHARS) {
    return {
      success: false,
      error: `Maximal ${AI_FACTS_MAX_CHARS} Zeichen.`,
    };
  }

  const preview = await previewCaseFactsAnalysis({
    matterId: params.matterId,
    facts,
  });
  if (!preview.success) {
    return { success: false, error: preview.error };
  }

  const residualNote =
    preview.residuals.length > 0
      ? `\n\nUnklare Stellen (${preview.residuals.length}): bitte markieren oder als kein Personenbezug bestätigen, dann E-Mail-Text erstellen.`
      : "\n\nVorschau geprüft — E-Mail-Text kann erstellt werden.";

  const inserted = await appendMatterAiChatMessages({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
    messages: [
      {
        role: "user",
        content: "E-Mail-Text erstellen",
        actionId: "create-email-text",
      },
      {
        role: "assistant",
        content: `Pseudonymisierte Vorschau (E-Mail, Auszug):\n\n${preview.pseudonymizedText.slice(0, 2500)}${preview.pseudonymizedText.length > 2500 ? "…" : ""}${residualNote}`,
        actionId: "create-email-text",
      },
    ],
  });

  if (!inserted) {
    return { success: false, error: "Speichern fehlgeschlagen." };
  }

  revalidateChat(params.practice, detail.matterId, params.chatId);

  return {
    success: true,
    data: {
      facts,
      pseudonymizedText: preview.pseudonymizedText,
      residuals: preview.residuals,
      gatePolicy: preview.gatePolicy,
      messages: inserted,
    },
  };
}

/**
 * E-Mail-Text erstellen — Schritt 2: Job starten.
 */
export async function startAktenChatCreateEmailTextJobAction(params: {
  chatId: string;
  practice: PracticeId;
  matterId: string;
  facts: string;
  manualMarks?: string[];
  dismissedResiduals?: string[];
}): Promise<
  MatterChatActionResult<{
    jobId: string;
    messages: MatterAiChatMessageRecord[];
  }>
> {
  const gate = await requireAktenChatAndAnalysis(params.practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const detail = await getMatterAiChatDetail({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
  });
  if (!detail || detail.matterId !== params.matterId) {
    return { success: false, error: "Chat nicht gefunden." };
  }

  const started = await startCaseFactsAnalysisJob({
    matterId: params.matterId,
    facts: params.facts,
    manualMarks: params.manualMarks,
    dismissedResiduals: params.dismissedResiduals,
    previewConfirmed: true,
    task: CREATE_EMAIL_TEXT_TASK,
  });

  if (!started.success) {
    return { success: false, error: started.error };
  }

  const inserted = await appendMatterAiChatMessages({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
    messages: [
      {
        role: "assistant",
        content: "E-Mail-Text wird erstellt…",
        actionId: "create-email-text",
      },
    ],
  });

  if (!inserted) {
    return { success: false, error: "Speichern fehlgeschlagen." };
  }

  revalidateChat(params.practice, detail.matterId, params.chatId);
  return {
    success: true,
    data: { jobId: started.jobId, messages: inserted },
  };
}

/**
 * E-Mail-Text erstellen — Schritt 3: Entwurf in den Chat.
 */
export async function finishAktenChatCreateEmailTextJobAction(params: {
  chatId: string;
  practice: PracticeId;
  matterId: string;
  jobId: string;
}): Promise<
  MatterChatActionResult<{
    messages: MatterAiChatMessageRecord[];
    status: "succeeded" | "failed" | "pending" | "running";
  }>
> {
  const gate = await requireAktenChatAndAnalysis(params.practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const detail = await getMatterAiChatDetail({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
  });
  if (!detail || detail.matterId !== params.matterId) {
    return { success: false, error: "Chat nicht gefunden." };
  }

  const status = await getAiJobStatus(params.jobId);
  if (!status.success) {
    return { success: false, error: status.error };
  }

  if (status.job.status === "pending" || status.job.status === "running") {
    return {
      success: true,
      data: { messages: [], status: status.job.status },
    };
  }

  if (status.job.status === "failed") {
    const inserted = await appendMatterAiChatMessages({
      tenantId: gate.user.tenantId,
      chatId: params.chatId,
      module: params.practice,
      messages: [
        {
          role: "assistant",
          content:
            status.errorMessage ??
            "E-Mail-Text konnte nicht erstellt werden. Bitte erneut versuchen.",
          actionId: "create-email-text",
        },
      ],
    });
    revalidateChat(params.practice, detail.matterId, params.chatId);
    return {
      success: true,
      data: { messages: inserted ?? [], status: "failed" },
    };
  }

  const draftContent = status.draft?.content?.trim() ?? "";
  if (!draftContent) {
    return { success: false, error: "Kein E-Mail-Entwurf erzeugt." };
  }

  const parsed = parseCreateEmailTextOutput(draftContent);
  const content = `BETREFF: ${parsed.subject}\n\n${parsed.body}`;

  const inserted = await appendMatterAiChatMessages({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
    messages: [
      {
        role: "assistant",
        content: content.slice(0, MATTER_CHAT_CONTENT_MAX),
        actionId: "create-email-text",
      },
    ],
  });

  if (!inserted) {
    return { success: false, error: "Speichern fehlgeschlagen." };
  }

  revalidateChat(params.practice, detail.matterId, params.chatId);
  return {
    success: true,
    data: { messages: inserted, status: "succeeded" },
  };
}

/**
 * E-Mail senden — Funktions-Aktion aus geprüftem Chat-Text.
 * Empfänger: Parameter `toEmail` (Composer).
 */
export async function sendAktenChatEmailAction(params: {
  chatId: string;
  practice: PracticeId;
  matterId: string;
  toEmail: string;
}): Promise<MatterChatActionResult<{ messages: MatterAiChatMessageRecord[] }>> {
  const gate = await requireAktenChatAndAnalysis(params.practice);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const to = params.toEmail.trim();
  if (!to || !isValidEmail(to)) {
    return {
      success: false,
      error: "Bitte eine gültige Empfänger-E-Mail in den Composer schreiben.",
    };
  }

  const detail = await getMatterAiChatDetail({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
  });
  if (!detail || detail.matterId !== params.matterId) {
    return { success: false, error: "Chat nicht gefunden." };
  }

  const draftMsg = pickLastEmailDraft(detail.messages);
  if (!draftMsg) {
    return {
      success: false,
      error: "Zuerst „E-Mail-Text erstellen“ ausführen.",
    };
  }

  const parsed = parseCreateEmailTextOutput(draftMsg.content);
  const open = listOpenDoubleBracePlaceholders(
    `${parsed.subject}\n${parsed.body}`
  );
  if (open.length > 0) {
    return {
      success: false,
      error: `Bitte Platzhalter ersetzen: ${open
        .slice(0, 5)
        .map((p) => `{{${p}}}`)
        .join(", ")}`,
    };
  }

  const smtp = await getUserSmtpConnectionConfig(
    gate.user.tenantId,
    gate.user.id
  );
  if (!smtp) {
    return {
      success: false,
      error:
        "SMTP ist nicht eingerichtet. Unter Einstellungen ein Konto hinterlegen.",
    };
  }

  try {
    await sendMailWithUserSmtp(smtp, {
      to,
      subject: parsed.subject,
      text: parsed.body,
    });
  } catch {
    return {
      success: false,
      error: "Versand fehlgeschlagen. SMTP-Einstellungen prüfen.",
    };
  }

  const inserted = await appendMatterAiChatMessages({
    tenantId: gate.user.tenantId,
    chatId: params.chatId,
    module: params.practice,
    messages: [
      {
        role: "user",
        content: `E-Mail senden an ${to}`,
        actionId: "send-email",
      },
      {
        role: "assistant",
        content: `E-Mail versendet an ${to} (Betreff: ${parsed.subject}).`,
        actionId: "send-email",
      },
    ],
  });

  if (!inserted) {
    return {
      success: false,
      error: "Versendet, Chat konnte nicht aktualisiert werden.",
    };
  }

  revalidateChat(params.practice, detail.matterId, params.chatId);
  return { success: true, data: { messages: inserted } };
}
