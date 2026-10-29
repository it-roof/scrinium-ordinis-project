"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { CreateMatterDialog } from "@/components/matters/create-matter-dialog";
import { logoutAction } from "@/lib/auth/actions";
import {
  deleteChatAction,
  getChatAction,
  pinChatAction,
} from "@/lib/chat/actions";
import { readChatStream } from "@/lib/chat/stream";
import type { ChatListItem } from "@/lib/chat/types";
import { createLetterFromChatAction } from "@/lib/letters/actions";
import type { LetterRecord } from "@/lib/letters/types";
import { AKTEN_PATH, clientAktenPath, matterPath } from "@/lib/matters/paths";
import type { MatterListItem } from "@/lib/matters/types";
import type { ThreadMessage } from "@/components/chat/chat-thread";

export type Conversation = ChatListItem & {
  messages: ThreadMessage[];
  loaded?: boolean;
  letter?: LetterRecord | null;
};

type MattersContextValue = {
  userName: string;
  matters: MatterListItem[];
  conversations: Conversation[];
  active: Conversation | null;
  activeMatter: MatterListItem | null;
  activeId: string | null;
  activeMatterId: string | null;
  firstName: string;
  draft: string;
  busy: boolean;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  threadRef: RefObject<HTMLDivElement | null>;
  setDraft: (value: string) => void;
  openSidebar: () => void;
  openCreateMatter: () => void;
  openChat: (id: string) => void;
  closeChat: () => void;
  loadScope: (matterId: string | null, chatId?: string | null) => Promise<void>;
  send: () => void;
  stop: () => void;
  createLetter: (sourceMessageId: string) => void;
  setLetter: (letter: LetterRecord) => void;
};

const MattersContext = createContext<MattersContextValue | null>(null);

export function useMattersSession() {
  const value = useContext(MattersContext);
  if (!value) {
    throw new Error("useMattersSession braucht MattersShell.");
  }
  return value;
}

export function MattersShell({
  userName,
  userEmail,
  initialChats,
  initialMatters,
  children,
}: {
  userName: string;
  userEmail: string | null;
  initialChats: ChatListItem[];
  initialMatters: MatterListItem[];
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    initialChats.map((chat) => ({ ...chat, messages: [], loaded: false }))
  );
  const [matters, setMatters] = useState(initialMatters);
  const [createMatterOpen, setCreateMatterOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeMatterId, setActiveMatterId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const titleId = useId();
  const scopeRef = useRef<string | null>(null);

  const active = conversations.find((chat) => chat.id === activeId) ?? null;
  const activeMatter =
    matters.find((matter) => matter.id === activeMatterId) ?? null;
  const firstName =
    userName && userName !== "Ohne Name" ? (userName.split(" ")[0] ?? "") : "";
  const aktenActive = pathname === AKTEN_PATH || pathname.startsWith(`${AKTEN_PATH}/`);

  useEffect(() => {
    const node = threadRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [active?.messages, activeId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        if (window.matchMedia("(max-width: 1023px)").matches) {
          setSidebarOpen(true);
        }
        return;
      }
      if (event.key !== "Escape") return;
      if (searchOpen) {
        setSearchOpen(false);
        return;
      }
      if (sidebarOpen) setSidebarOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [searchOpen, sidebarOpen]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const loadScope = useCallback(
    async (matterId: string | null, chatId?: string | null) => {
      if (scopeRef.current !== matterId) {
        scopeRef.current = matterId;
        setActiveMatterId(matterId);
        if (!chatId) setActiveId(null);
      }
      if (!chatId) return;
      setActiveId(chatId);
      const detail = await getChatAction(chatId);
      if (!detail) return;
      setConversations((items) =>
        items.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                title: detail.title,
                letterId: detail.letterId,
                letter: detail.letter,
                messages: detail.messages,
                loaded: true,
              }
            : chat
        )
      );
    },
    []
  );

  function closeChat() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setActiveId(null);
    setDraft("");
  }

  function openNewChat() {
    closeChat();
    setSearchOpen(false);
    setSidebarOpen(false);
    if (pathname === AKTEN_PATH || !pathname.startsWith(`${AKTEN_PATH}/`)) {
      if (pathname !== "/") router.push("/");
    }
    composerRef.current?.focus();
  }

  async function selectChat(id: string) {
    if (busy) return;
    const current = conversations.find((chat) => chat.id === id);
    const target = current?.matterId
      ? matterPath(current.matterId)
      : "/";
    if (pathname !== target) {
      router.push(target);
    }
    setSearchOpen(false);
    setSidebarOpen(false);
    await loadScope(current?.matterId ?? null, id);
  }

  function openAkten() {
    setSearchOpen(false);
    setSidebarOpen(false);
    if (pathname !== AKTEN_PATH) router.push(AKTEN_PATH);
  }

  function openCreateMatter() {
    setSearchOpen(false);
    setSidebarOpen(false);
    setCreateMatterOpen(true);
  }

  function openMatterPage(id: string) {
    closeChat();
    setSearchOpen(false);
    setSidebarOpen(false);
    router.push(matterPath(id));
  }

  async function pinChat(id: string, pinned: boolean) {
    if (busy || id.startsWith("draft-")) return;
    const previous =
      conversations.find((chat) => chat.id === id)?.pinned ?? false;
    setConversations((items) =>
      items.map((chat) => (chat.id === id ? { ...chat, pinned } : chat))
    );
    const result = await pinChatAction(id, pinned);
    if (!result.success) {
      setConversations((items) =>
        items.map((chat) =>
          chat.id === id ? { ...chat, pinned: previous } : chat
        )
      );
    }
  }

  async function removeChat(id: string) {
    if (busy) return;
    const result = await deleteChatAction(id);
    if (!result.success) return;
    setConversations((items) => items.filter((chat) => chat.id !== id));
    if (activeId === id) setActiveId(null);
  }

  function patchChat(
    chatId: string,
    updater: (chat: Conversation) => Conversation
  ) {
    setConversations((items) =>
      items.map((chat) => (chat.id === chatId ? updater(chat) : chat))
    );
  }

  async function send() {
    const content = draft.trim();
    if (!content || busy) return;

    const localUserId = crypto.randomUUID();
    const localAssistantId = crypto.randomUUID();
    const userMessage: ThreadMessage = {
      id: localUserId,
      role: "user",
      content,
    };
    const assistantMessage: ThreadMessage = {
      id: localAssistantId,
      role: "assistant",
      content: "",
      pending: true,
    };

    let chatId = activeId;
    if (!chatId) {
      chatId = `draft-${localUserId}`;
      setConversations((items) => [
        {
          id: chatId!,
          title: content.slice(0, 48),
          pinned: false,
          matterId: activeMatterId,
          letterId: null,
          updatedAt: new Date().toISOString(),
          messages: [userMessage, assistantMessage],
          loaded: true,
        },
        ...items,
      ]);
      setActiveId(chatId);
    } else {
      patchChat(chatId, (chat) => ({
        ...chat,
        messages: [...chat.messages, userMessage, assistantMessage],
        loaded: true,
      }));
    }

    setDraft("");
    if (composerRef.current) composerRef.current.style.height = "auto";
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const persistedChatId = activeId;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: persistedChatId,
          matterId: activeMatterId,
          message: content,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let error = "Die Antwort ist fehlgeschlagen. Bitte erneut versuchen.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) error = payload.error;
        } catch {
          // keep default
        }
        throw new Error(error);
      }

      await readChatStream(response, {
        onMeta({ chatId: savedId, title, userMessageId }) {
          setConversations((items) =>
            items.map((chat) => {
              if (chat.id !== chatId) return chat;
              return {
                ...chat,
                id: savedId,
                title,
                messages: chat.messages.map((message) =>
                  message.id === localUserId
                    ? { ...message, id: userMessageId }
                    : message
                ),
              };
            })
          );
          setActiveId(savedId);
          chatId = savedId;
        },
        onText(text) {
          if (!chatId) return;
          patchChat(chatId, (chat) => ({
            ...chat,
            messages: chat.messages.map((message) =>
              message.id === localAssistantId
                ? { ...message, content: text, pending: true }
                : message
            ),
          }));
        },
        onDone(assistantMessageId) {
          if (!chatId) return;
          patchChat(chatId, (chat) => ({
            ...chat,
            messages: chat.messages.map((message) =>
              message.id === localAssistantId
                ? { ...message, id: assistantMessageId, pending: false }
                : message
            ),
          }));
        },
      });
    } catch (err) {
      if (controller.signal.aborted) {
        if (chatId) {
          patchChat(chatId, (chat) => ({
            ...chat,
            messages: chat.messages.map((message) =>
              message.id === localAssistantId
                ? {
                    ...message,
                    pending: false,
                    content: message.content.trim()
                      ? message.content
                      : "Antwort abgebrochen.",
                  }
                : message
            ),
          }));
        }
      } else {
        const error =
          err instanceof Error
            ? err.message
            : "Die Antwort ist fehlgeschlagen. Bitte erneut versuchen.";
        if (chatId) {
          patchChat(chatId, (chat) => ({
            ...chat,
            messages: chat.messages.map((message) =>
              message.id === localAssistantId
                ? { ...message, pending: false, error: true, content: error }
                : message
            ),
          }));
        }
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
      composerRef.current?.focus();
    }
  }

  async function runCreateLetter(sourceMessageId: string) {
    if (!activeId || activeId.startsWith("draft-") || busy) return;
    setBusy(true);
    const result = await createLetterFromChatAction(activeId, sourceMessageId);
    setBusy(false);
    if (!result.success) {
      patchChat(activeId, (chat) => ({
        ...chat,
        messages: [
          ...chat.messages,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.error,
            error: true,
          },
        ],
      }));
      return;
    }
    patchChat(activeId, (chat) => ({
      ...chat,
      letterId: result.data.letter.id,
      letter: result.data.letter,
      messages: [
        ...chat.messages,
        {
          id: result.data.message.id,
          role: "assistant",
          content: result.data.message.content,
          actionId: result.data.message.actionId,
        },
      ],
    }));
  }

  function setLetter(letter: LetterRecord) {
    if (!activeId) return;
    patchChat(activeId, (chat) => ({ ...chat, letter }));
  }

  const sidebarProps = {
    conversations: conversations.map(
      ({ id, title, pinned, matterId, letterId, updatedAt }) => ({
        id,
        title,
        pinned,
        matterId,
        letterId,
        updatedAt,
      })
    ),
    matters,
    activeId,
    activeMatterId,
    userName,
    userEmail,
    signingOut,
    busy,
    searchOpen,
    aktenActive,
    nestedMatterId:
      pathname.startsWith(`${AKTEN_PATH}/`) && pathname !== AKTEN_PATH
        ? pathname.slice(AKTEN_PATH.length + 1).split("/")[0] ?? null
        : null,
    onSearchOpenChange: setSearchOpen,
    onNewChat: openNewChat,
    onAkten: openAkten,
    onNewMatter: openCreateMatter,
    onSelect: (id: string) => {
      void selectChat(id);
    },
    onSelectMatter: openMatterPage,
    onSelectClient: (id: string) => {
      closeChat();
      setSearchOpen(false);
      setSidebarOpen(false);
      router.push(clientAktenPath(id));
    },
    onPin: (id: string, pinned: boolean) => {
      void pinChat(id, pinned);
    },
    onDelete: (id: string) => {
      void removeChat(id);
    },
    onSignOut: () => {
      setSigningOut(true);
      void logoutAction();
    },
  };

  const contextValue: MattersContextValue = {
    userName,
    matters,
    conversations,
    active,
    activeMatter,
    activeId,
    activeMatterId,
    firstName,
    draft,
    busy,
    composerRef,
    threadRef,
    setDraft,
    openSidebar: () => setSidebarOpen(true),
    openCreateMatter,
    openChat: (id: string) => {
      void selectChat(id);
    },
    closeChat,
    loadScope,
    send: () => {
      void send();
    },
    stop: () => abortRef.current?.abort(),
    createLetter: (sourceMessageId: string) => {
      void runCreateLetter(sourceMessageId);
    },
    setLetter,
  };

  return (
    <MattersContext.Provider value={contextValue}>
      <div className="flex h-dvh overflow-hidden bg-background text-foreground">
        <aside className="hidden w-64 shrink-0 border-r border-border/80 lg:block">
          <ChatSidebar
            {...sidebarProps}
            focusSearch={searchOpen && !sidebarOpen}
          />
        </aside>

        {sidebarOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-background/25"
              aria-label="Seitenleiste schließen"
              onClick={() => {
                setSearchOpen(false);
                setSidebarOpen(false);
              }}
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative h-full w-64 shadow-[var(--shadow-soft)]"
            >
              <span id={titleId} className="sr-only">
                Navigation
              </span>
              <ChatSidebar
                {...sidebarProps}
                focusSearch={searchOpen}
                onClose={() => {
                  setSearchOpen(false);
                  setSidebarOpen(false);
                }}
              />
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
      <CreateMatterDialog
        open={createMatterOpen}
        onClose={() => setCreateMatterOpen(false)}
        onCreated={(matter) => {
          setMatters((items) => [
            matter,
            ...items.filter((item) => item.id !== matter.id),
          ]);
          setCreateMatterOpen(false);
          setSidebarOpen(false);
          router.push(matterPath(matter.id));
        }}
      />
    </MattersContext.Provider>
  );
}
