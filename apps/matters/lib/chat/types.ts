import type { LetterRecord } from "@/lib/letters/types";

export type ChatListItem = {
  id: string;
  title: string;
  pinned: boolean;
  matterId: string | null;
  letterId: string | null;
  updatedAt: string;
};

export type ChatMessageRecord = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionId?: string | null;
};

export type ChatDetail = ChatListItem & {
  messages: ChatMessageRecord[];
};

export type ChatWithLetter = ChatDetail & {
  letter: LetterRecord | null;
};
