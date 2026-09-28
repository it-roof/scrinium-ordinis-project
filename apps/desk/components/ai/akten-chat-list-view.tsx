"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { MessagesSquareIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { createMatterChatAction } from "@/lib/ai/matter-chat/actions";
import type { MatterAiChatListItem } from "@/lib/ai/matter-chat/storage";
import type { PracticeId } from "@/lib/modules";
import { practiceBasePath } from "@/lib/area/paths";

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AktenChatListView({
  practice,
  matterId,
  matterTitle,
  clientName,
  chats,
}: {
  practice: PracticeId;
  matterId: string;
  matterTitle: string;
  clientName: string;
  chats: MatterAiChatListItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const base = practiceBasePath(practice);
  const indexHref = `${base}/akten-chat`;

  function handleNewChat() {
    startTransition(async () => {
      const result = await createMatterChatAction({ matterId, practice });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.push(result.data.href);
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-4 lg:p-6">
      <div className="space-y-2">
        <p className="b-eyebrow">
          <Link href={indexHref} className="hover:underline">
            Akten-Chat
          </Link>
        </p>
        <h1 className="b-title">{matterTitle}</h1>
        <p className="b-lead">
          {clientName}. Mehrere Chats an dieser Akte — wie Threads unter einem
          Projekt.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="b-btn b-btn-primary"
          onClick={handleNewChat}
          disabled={isPending}
        >
          <PlusIcon className="size-4" aria-hidden />
          Neuer Chat
        </button>
      </div>

      {chats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--b-line)] bg-[var(--b-soft)]/40 px-6 py-12 text-center">
          <MessagesSquareIcon
            className="mx-auto mb-3 size-8 text-[var(--b-muted)]"
            aria-hidden
          />
          <p className="b-meta">Noch keine Chats. Starte den ersten Thread.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {chats.map((chat) => (
            <li key={chat.id}>
              <Link
                href={`${base}/akten-chat/${matterId}/${chat.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--b-line)] bg-[var(--b-bg-elev)] px-5 py-4 transition-colors hover:bg-[var(--b-soft)]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-[var(--b-ink)]">
                    {chat.title || "Chat"}
                  </span>
                  <span className="b-meta">{formatWhen(chat.updatedAt)}</span>
                </span>
                <MessagesSquareIcon
                  className="size-5 shrink-0 text-[var(--b-muted)]"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
