"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpDownIcon,
  FolderOpenIcon,
  MessagesSquareIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  CreateMatterDialog,
  type MatterClientOption,
} from "@/components/matters/create-matter-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createMatterChatAction } from "@/lib/ai/matter-chat/actions";
import { aktenChatHref } from "@/lib/ai/matter-chat/paths";
import type { MatterAiChatListItem } from "@/lib/ai/matter-chat/storage";
import { useAreaBasePath, useAreaFromPath } from "@/lib/area/use-area-path";
import type { MatterRecord } from "@/lib/clients/types";

type MatterSortOrder =
  | "updated-desc"
  | "created-desc"
  | "title-asc"
  | "title-desc"
  | "client-asc";

const SORT_OPTIONS: { value: MatterSortOrder; label: string }[] = [
  { value: "updated-desc", label: "Zuletzt aktualisiert" },
  { value: "created-desc", label: "Zuletzt erstellt" },
  { value: "title-asc", label: "Titel A–Z" },
  { value: "title-desc", label: "Titel Z–A" },
  { value: "client-asc", label: "Mandant A–Z" },
];

function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfThatDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfThatDay.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (dayDiff === 0) {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (dayDiff === 1) return "Gestern";
  if (dayDiff > 1 && dayDiff < 7) return `vor ${dayDiff} Tagen`;

  return date.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
  });
}

function compareMatters(a: MatterRecord, b: MatterRecord, sort: MatterSortOrder) {
  switch (sort) {
    case "created-desc":
      return b.createdAt.localeCompare(a.createdAt);
    case "title-asc":
      return a.title.localeCompare(b.title, "de");
    case "title-desc":
      return b.title.localeCompare(a.title, "de");
    case "client-asc":
      return a.clientName.localeCompare(b.clientName, "de");
    case "updated-desc":
    default:
      return b.updatedAt.localeCompare(a.updatedAt);
  }
}

export function MattersView({
  initialItems,
  clients,
  unassignedChats = [],
  canAktenChat = false,
}: {
  initialItems: MatterRecord[];
  clients: MatterClientOption[];
  unassignedChats?: MatterAiChatListItem[];
  canAktenChat?: boolean;
}) {
  const router = useRouter();
  const basePath = useAreaBasePath() ?? "";
  const area = useAreaFromPath();
  const [items, setItems] = useState(initialItems);
  const [chatItems, setChatItems] = useState(unassignedChats);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<MatterSortOrder>("updated-desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [isStartingChat, startChatTransition] = useTransition();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    setChatItems(unassignedChats);
  }, [unassignedChats]);

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus({ preventScroll: true });
  }, [searchOpen]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = !query
      ? items
      : items.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            item.clientName.toLowerCase().includes(query) ||
            item.reference.toLowerCase().includes(query)
        );
    return [...list].sort((a, b) => compareMatters(a, b, sortOrder));
  }, [items, search, sortOrder]);

  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = !query
      ? chatItems
      : chatItems.filter((chat) =>
          (chat.title || "Chat").toLowerCase().includes(query)
        );
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [chatItems, search]);

  const canCreate = clients.length > 0 && area != null;
  const sortActive = sortOrder !== "updated-desc";
  const showUnassigned = canAktenChat && area != null;
  const hasAnyContent = items.length > 0 || chatItems.length > 0;

  function handleNewUnassignedChat() {
    if (!area || !canAktenChat) return;
    startChatTransition(async () => {
      const result = await createMatterChatAction({
        matterId: null,
        practice: area,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.push(result.data.href);
    });
  }

  const toolbar = (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {hasAnyContent ? (
        <>
          <div className="relative size-9 shrink-0">
            {searchOpen ? (
              <div className="lab-matters-search-panel absolute top-1/2 right-0 z-10 -translate-y-1/2">
                <SearchIcon
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                  style={{ color: "var(--b-muted)" }}
                  strokeWidth={1.75}
                />
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setSearch("");
                      setSearchOpen(false);
                    }
                  }}
                  placeholder="Suchen…"
                  aria-label="Akten durchsuchen"
                  className="lab-matters-search-input"
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1"
                  style={{ color: "var(--b-muted)" }}
                  aria-label="Suche schließen"
                  onClick={() => {
                    setSearch("");
                    setSearchOpen(false);
                  }}
                >
                  <XIcon className="size-3.5" strokeWidth={2} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="lab-chat-icon-btn"
                aria-label="Akten durchsuchen"
                title="Suchen"
                onClick={() => setSearchOpen(true)}
              >
                <SearchIcon className="size-4" strokeWidth={1.75} />
              </button>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="lab-chat-icon-btn"
                data-active={sortActive ? "true" : "false"}
                aria-label="Akten sortieren"
                title="Sortieren"
              >
                <ArrowUpDownIcon className="size-4" strokeWidth={1.75} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuRadioGroup
                value={sortOrder}
                onValueChange={(value) =>
                  setSortOrder(value as MatterSortOrder)
                }
              >
                {SORT_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : null}
      <button
        type="button"
        className="b-btn b-btn-primary shrink-0 gap-1.5"
        disabled={!canCreate}
        title={
          clients.length === 0 ? "Zuerst einen Mandanten anlegen" : undefined
        }
        onClick={() => setCreateOpen(true)}
      >
        <PlusIcon className="size-4" strokeWidth={1.75} />
        Neue Akte
      </button>
    </div>
  );

  return (
    <div className="lab-matters min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pt-7 pb-8 lg:px-6 lg:pt-9">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="b-title">Akten</h1>
          <div className="shrink-0 self-start sm:self-auto">{toolbar}</div>
        </header>

        <div className="flex flex-col gap-10">
          {clients.length === 0 && !showUnassigned ? (
            <div className="lab-matters-empty">
              <FolderOpenIcon
                className="mx-auto mb-3 size-8 text-[var(--b-muted)]"
                aria-hidden
              />
              <p className="b-display text-[1.125rem] font-medium tracking-[-0.01em]">
                Noch keine Mandanten
              </p>
              <p className="b-meta mx-auto mt-2 max-w-sm">
                Legen Sie zuerst einen Mandanten an, danach können Sie Akten
                erstellen.
              </p>
              <Link
                href={`${basePath}/mandanten`}
                className="b-btn b-btn-primary mx-auto mt-6"
              >
                Zu Mandanten
              </Link>
            </div>
          ) : (
            <>
              {clients.length === 0 ? (
                <div className="lab-matters-empty lab-matters-empty--compact">
                  <p className="b-display text-[1.125rem] font-medium tracking-[-0.01em]">
                    Noch keine Mandanten
                  </p>
                  <p className="b-meta mx-auto mt-2 max-w-sm">
                    Für Akten brauchen Sie Mandanten. Chats ohne Zuordnung gehen
                    trotzdem.
                  </p>
                  <Link
                    href={`${basePath}/mandanten`}
                    className="b-btn b-btn-primary mx-auto mt-6"
                  >
                    Zu Mandanten
                  </Link>
                </div>
              ) : filtered.length === 0 && items.length === 0 ? (
                <div className="lab-matters-empty lab-matters-empty--compact">
                  <p className="b-display text-[1.125rem] font-medium tracking-[-0.01em]">
                    Noch keine Akten
                  </p>
                  <p className="b-meta mx-auto mt-2 max-w-sm">
                    Legen Sie eine Akte an — oder starten Sie einen Chat ohne
                    Zuordnung.
                  </p>
                  <button
                    type="button"
                    className="b-btn b-btn-primary mx-auto mt-6 gap-1.5"
                    onClick={() => setCreateOpen(true)}
                  >
                    <PlusIcon className="size-4" strokeWidth={1.75} />
                    Neue Akte
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <p className="b-meta">Keine Akten-Treffer.</p>
              ) : (
                <ul className="lab-matters-grid">
                  {filtered.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`${basePath}/akten/${item.id}`}
                        className="lab-matters-card"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="lab-matters-card-title">{item.title}</p>
                          <FolderOpenIcon
                            className="size-5 shrink-0 text-[var(--b-muted)]"
                            aria-hidden
                          />
                        </div>
                        <p className="lab-matters-card-sub">
                          {item.clientName}
                          {item.reference ? ` · ${item.reference}` : ""}
                        </p>
                        <p className="lab-matters-card-date mt-auto pt-4">
                          {formatRelativeDate(item.updatedAt)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {showUnassigned ? (
                <section
                  className="lab-matters-unassigned"
                  aria-label="Nicht zugeordnet"
                >
                  <div className="lab-matters-unassigned-header">
                    <h2 className="lab-matters-unassigned-heading">
                      Nicht zugeordnet
                    </h2>
                    <button
                      type="button"
                      className="b-btn b-btn-secondary lab-matters-unassigned-new"
                      disabled={isStartingChat}
                      onClick={handleNewUnassignedChat}
                    >
                      <PlusIcon className="size-4" strokeWidth={1.75} />
                      Neuer Chat
                    </button>
                  </div>
                  <p className="b-meta mb-4">
                    Chats ohne Akte — gestartet über Akten-Chat oder hier.
                  </p>
                  {filteredChats.length === 0 ? (
                    <div className="lab-matters-unassigned-empty">
                      <MessagesSquareIcon
                        className="mx-auto mb-2 size-7 text-[var(--b-muted)]"
                        aria-hidden
                      />
                      <p className="b-meta text-center">
                        {chatItems.length === 0
                          ? "Noch keine Chats ohne Akte."
                          : "Keine Treffer."}
                      </p>
                    </div>
                  ) : (
                    <ul className="lab-matters-unassigned-list">
                      {filteredChats.map((chat) => (
                        <li key={chat.id}>
                          <Link
                            href={
                              area ? aktenChatHref(area, null, chat.id) : "#"
                            }
                            className="lab-matters-unassigned-row"
                          >
                            <span className="min-w-0">
                              <span className="lab-matters-unassigned-title">
                                {chat.title || "Chat"}
                              </span>
                              <span className="b-meta">
                                {formatRelativeDate(chat.updatedAt)}
                              </span>
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
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>

      {area ? (
        <CreateMatterDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          clients={clients}
          module={area}
          onCreated={(matter) => {
            setItems((prev) => [matter, ...prev]);
          }}
        />
      ) : null}
    </div>
  );
}
