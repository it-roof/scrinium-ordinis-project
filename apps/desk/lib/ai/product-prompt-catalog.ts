import "server-only";

import { PRODUCT_ACTIONS, type ProductAction } from "@/lib/ai/product-actions";
import { buildAiChatSystemPrompt, AI_CHAT_TASK } from "@/lib/ai/prompts/ai-chat";
import {
  buildCaseFactsAnalysisSystemPrompt,
  CASE_FACTS_ANALYSIS_TASK,
} from "@/lib/ai/prompts/case-facts-analysis";
import {
  buildCounterReviewSystemPrompt,
  COUNTER_REVIEW_TASK,
} from "@/lib/ai/prompts/counter-review";
import {
  buildCreateLetterSystemPrompt,
  CREATE_LETTER_TASK,
} from "@/lib/ai/prompts/create-letter";
import {
  buildCreateEmailTextSystemPrompt,
  CREATE_EMAIL_TEXT_TASK,
} from "@/lib/ai/prompts/create-email-text";

export type ProductPromptCatalogEntry = {
  id: string;
  label: string;
  task: string;
  /** Linked product action id, if any. */
  actionId: string | null;
  body: string;
};

/** Read-only Produkt-Systemprompts für Dev-UI (AI_DEBUG + Test-Kanzlei). */
export function getProductPromptCatalog(): ProductPromptCatalogEntry[] {
  return [
    {
      id: "akten-chat-dialog",
      label: "Regulierter Dialog",
      task: AI_CHAT_TASK,
      actionId: null,
      body: buildAiChatSystemPrompt(),
    },
    {
      id: "case-facts-analysis",
      label: "Sachverhalt analysieren",
      task: CASE_FACTS_ANALYSIS_TASK,
      actionId: "analyze-case-facts",
      body: buildCaseFactsAnalysisSystemPrompt(),
    },
    {
      id: "counter-review",
      label: "Gegenprüfung",
      task: COUNTER_REVIEW_TASK,
      actionId: "counter-review",
      body: buildCounterReviewSystemPrompt(),
    },
    {
      id: "create-letter",
      label: "Schreiben erstellen",
      task: CREATE_LETTER_TASK,
      actionId: "create-letter",
      body: buildCreateLetterSystemPrompt(),
    },
    {
      id: "create-email-text",
      label: "E-Mail-Text erstellen",
      task: CREATE_EMAIL_TEXT_TASK,
      actionId: "create-email-text",
      body: buildCreateEmailTextSystemPrompt(),
    },
  ];
}

export function getProductActionCatalog(): readonly ProductAction[] {
  return PRODUCT_ACTIONS;
}
