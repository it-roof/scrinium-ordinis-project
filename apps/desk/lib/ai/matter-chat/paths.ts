import type { PracticeId } from "@/lib/modules";
import { practiceBasePath } from "@/lib/area/paths";

/** URL-Segment für persistierte Chats ohne Akte (kein UUID). */
export const AKTEN_CHAT_WITHOUT_MATTER_SLUG = "ohne";

export function aktenChatMatterSegment(matterId: string | null): string {
  return matterId ?? AKTEN_CHAT_WITHOUT_MATTER_SLUG;
}

export function aktenChatHref(
  practice: PracticeId,
  matterId: string | null,
  chatId?: string
): string {
  const base = practiceBasePath(practice);
  const segment = aktenChatMatterSegment(matterId);
  if (chatId) {
    return `${base}/akten-chat/${segment}/${chatId}`;
  }
  return `${base}/akten-chat/${segment}`;
}
