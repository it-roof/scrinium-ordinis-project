"use client";

import {
  FileTextIcon,
  FolderIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

import { ThemeSwitch } from "@/components/app/theme";
import { RECENCY_LABELS, RECENCY_ORDER, recencyGroup } from "@/lib/chat/recency";
import { filterChats, filterMatters } from "@/lib/chat/search";
import type { ChatListItem } from "@/lib/chat/types";
import type { MatterListItem } from "@/lib/matters/types";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

function NavButton({
  active,
  filled,
  onClick,
  children,
}: {
  active?: boolean;
  filled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-[8px] px-2 text-[13px] transition-colors",
        filled
          ? "bg-foreground/[0.07] text-foreground"
          : active
            ? "bg-foreground/[0.06] text-foreground"
            : "text-foreground/85 hover:bg-foreground/[0.045]"
      )}
    >
      {children}
    </button>
  );
}

function ChatRow({
  chat,
  selected,
  busy,
  nested,
  onSelect,
  onPin,
  onDelete,
}: {
  chat: ChatListItem;
  selected: boolean;
  busy: boolean;
  nested?: boolean;
  onSelect: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const canPin = !chat.id.startsWith("draft-");

  return (
    <div className="group relative">
      <button
        type="button"
        disabled={busy}
        onClick={() => onSelect(chat.id)}
        className={cn(
          "flex h-8 w-full items-center gap-2 rounded-[8px] px-2 pr-12 text-left text-[13px] transition-colors disabled:opacity-60",
          selected
            ? "bg-foreground/[0.06] text-foreground"
            : "text-foreground/80 hover:bg-foreground/[0.045]"
        )}
      >
        {nested ? null : (
          <FileTextIcon
            className="size-4 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
          />
        )}
        <span className="min-w-0 flex-1 truncate">{chat.title}</span>
      </button>
      <div
        className={cn(
          "absolute top-1/2 right-1 flex -translate-y-1/2 items-center",
          !chat.pinned && "hidden group-hover:flex"
        )}
      >
        {canPin ? (
          <button
            type="button"
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation();
              onPin(chat.id, !chat.pinned);
            }}
            aria-label={
              chat.pinned ? `${chat.title} lösen` : `${chat.title} anheften`
            }
            className={cn(
              "inline-flex size-5 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground disabled:opacity-40",
              chat.pinned && "text-foreground"
            )}
          >
            <PinIcon className={cn("size-3", chat.pinned && "fill-current")} />
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(chat.id);
          }}
          aria-label={`${chat.title} löschen`}
          className={cn(
            "inline-flex size-5 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground disabled:opacity-40",
            chat.pinned && "hidden group-hover:inline-flex"
          )}
        >
          <XIcon className="size-3" />
        </button>
      </div>
    </div>
  );
}

function MatterRow({
  matter,
  selected,
  busy,
  onSelect,
}: {
  matter: MatterListItem;
  selected: boolean;
  busy: boolean;
  onSelect: (id: string) => void;
}) {
  const meta = [matter.fileNumber, matter.clientName].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onSelect(matter.id)}
      className={cn(
        "flex min-h-8 w-full items-center gap-2 rounded-[8px] px-2 py-1 text-left transition-colors disabled:opacity-60",
        selected
          ? "bg-foreground/[0.06] text-foreground"
          : "text-foreground/80 hover:bg-foreground/[0.045]"
      )}
    >
      <FolderIcon
        className="size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.75}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] leading-tight">
          {matter.title}
        </span>
        {meta ? (
          <span className="block truncate text-[11px] leading-tight text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function ChatGroup({
  label,
  chats,
  activeId,
  busy,
  onSelect,
  onPin,
  onDelete,
}: {
  label: string;
  chats: ChatListItem[];
  activeId: string | null;
  busy: boolean;
  onSelect: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
}) {
  if (chats.length === 0) return null;

  return (
    <div className="mb-1.5">
      <h2 className="px-2 pb-0.5 pt-1.5 text-[11px] font-medium text-muted-foreground">
        {label}
      </h2>
      <div className="space-y-px">
        {chats.map((chat) => (
          <ChatRow
            key={chat.id}
            chat={chat}
            selected={chat.id === activeId}
            busy={busy}
            onSelect={onSelect}
            onPin={onPin}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

export function ChatSidebar({
  conversations,
  matters,
  activeId,
  activeMatterId,
  userName,
  userEmail,
  signingOut,
  busy,
  searchOpen,
  aktenActive,
  nestedMatterId = null,
  focusSearch = false,
  onSearchOpenChange,
  onNewChat,
  onAkten,
  onNewMatter,
  onSelect,
  onSelectMatter,
  onSelectClient,
  onPin,
  onDelete,
  onSignOut,
  onClose,
}: {
  conversations: ChatListItem[];
  matters: MatterListItem[];
  activeId: string | null;
  activeMatterId: string | null;
  userName: string;
  userEmail: string | null;
  signingOut: boolean;
  busy: boolean;
  searchOpen: boolean;
  aktenActive: boolean;
  nestedMatterId?: string | null;
  focusSearch?: boolean;
  onSearchOpenChange: (open: boolean) => void;
  onNewChat: () => void;
  onAkten: () => void;
  onNewMatter: () => void;
  onSelect: (id: string) => void;
  onSelectMatter: (id: string) => void;
  onSelectClient: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
  onSignOut: () => void;
  onClose?: () => void;
}) {
  const searchId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!searchOpen) {
      setQuery("");
      return;
    }
    if (!focusSearch) return;
    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [searchOpen, focusSearch]);

  const visibleChats = useMemo(
    () => filterChats(conversations, query),
    [conversations, query]
  );
  const visibleMatters = useMemo(
    () => filterMatters(matters, query),
    [matters, query]
  );
  const nestedMatter = nestedMatterId
    ? matters.find((matter) => matter.id === nestedMatterId) ?? null
    : null;
  const nestedChats = nestedMatter
    ? visibleChats.filter((chat) => chat.matterId === nestedMatter.id)
    : [];
  const siblingMatters = nestedMatter
    ? matters.filter((matter) => matter.clientId === nestedMatter.clientId)
    : [];
  const otherChats = nestedMatter
    ? visibleChats.filter((chat) => chat.matterId !== nestedMatter.id)
    : visibleChats;
  const pinned = otherChats.filter((chat) => chat.pinned);
  const recent = otherChats.filter((chat) => !chat.pinned);
  const recentGroups = useMemo(() => {
    const groups = new Map<string, ChatListItem[]>();
    for (const key of RECENCY_ORDER) groups.set(key, []);
    for (const chat of recent) {
      groups.get(recencyGroup(chat.updatedAt))?.push(chat);
    }
    return RECENCY_ORDER.map((key) => ({
      key,
      label: RECENCY_LABELS[key],
      chats: groups.get(key) ?? [],
    })).filter((group) => group.chats.length > 0);
  }, [recent]);
  const hasQuery = query.trim().length > 0;
  const noHits =
    hasQuery && visibleChats.length === 0 && visibleMatters.length === 0;

  return (
    <div className="flex h-full flex-col bg-sidebar text-foreground">
      <div className="flex items-center gap-1 px-2 pt-2">
        <p className="sr-only">Scrinium</p>
        <div className="min-w-0 flex-1">
          <NavButton
            filled
            onClick={() => {
              onSearchOpenChange(false);
              onNewChat();
            }}
          >
            <PlusIcon
              className="size-4 text-muted-foreground"
              strokeWidth={1.75}
            />
            <span className="flex-1 text-left">Neu</span>
          </NavButton>
        </div>
        {onClose ? (
          <button
            type="button"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/5 lg:hidden"
            onClick={onClose}
            aria-label="Seitenleiste schließen"
          >
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </div>

      <div className="mt-px space-y-px px-2">
        {searchOpen ? (
          <div role="search" className="relative">
            <label htmlFor={searchId} className="sr-only">
              Chats und Akten suchen
            </label>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id={searchId}
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing) {
                  return;
                }
                const firstChat = visibleChats[0];
                if (firstChat) {
                  event.preventDefault();
                  onSelect(firstChat.id);
                  return;
                }
                const firstMatter = visibleMatters[0];
                if (!firstMatter) return;
                event.preventDefault();
                onSelectMatter(firstMatter.id);
              }}
              placeholder="Suchen"
              autoComplete="off"
              className="h-8 w-full rounded-[8px] bg-foreground/[0.04] pr-7 pl-7 text-[13px] text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
            />
            <button
              type="button"
              onClick={() => onSearchOpenChange(false)}
              aria-label="Suche schließen"
              className="absolute top-1/2 right-0.5 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        ) : (
          <NavButton
            onClick={() => {
              onSearchOpenChange(true);
            }}
          >
            <SearchIcon className="size-4 text-muted-foreground" strokeWidth={1.75} />
            <span className="flex-1 text-left">Suchen</span>
          </NavButton>
        )}

        <div className="group relative">
          <NavButton
            active={aktenActive && !nestedMatter}
            onClick={() => {
              onSearchOpenChange(false);
              onAkten();
            }}
          >
            <FolderIcon className="size-4 text-muted-foreground" strokeWidth={1.75} />
            <span className="flex-1 pr-6 text-left">Akten</span>
          </NavButton>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSearchOpenChange(false);
              onNewMatter();
            }}
            aria-label="Neue Akte"
            className="absolute top-1/2 right-0.5 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground lg:hidden lg:group-hover:inline-flex"
          >
            <PlusIcon className="size-3" />
          </button>
        </div>
      </div>

      <nav
        aria-label="Akten und Chats"
        className="mt-2 flex-1 space-y-px overflow-y-auto px-2 pb-2"
      >
        {noHits ? (
          <p className="px-2 py-2 text-[13px] leading-relaxed text-muted-foreground">
            Keine Treffer.
          </p>
        ) : (
          <>
            {nestedMatter && !hasQuery ? (
              <div className="mb-1.5">
                <button
                  type="button"
                  onClick={() => onSelectClient(nestedMatter.clientId)}
                  className="flex h-8 w-full items-center gap-2 rounded-[8px] px-2 text-left text-[13px] text-foreground/85 hover:bg-foreground/[0.045]"
                >
                  <FolderIcon
                    className="size-4 shrink-0 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {nestedMatter.clientName}
                  </span>
                </button>
                <div className="mt-px pl-3">
                  {siblingMatters.map((matter) => {
                    const current = matter.id === nestedMatter.id;
                    return (
                      <div key={matter.id}>
                        <button
                          type="button"
                          onClick={() => onSelectMatter(matter.id)}
                          className={cn(
                            "flex h-8 w-full items-center gap-2 rounded-[8px] px-2 text-left text-[13px]",
                            current
                              ? "bg-foreground/[0.06] text-foreground"
                              : "text-foreground/80 hover:bg-foreground/[0.045]"
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {matter.title}
                          </span>
                        </button>
                        {current ? (
                          <div className="pl-2">
                            {nestedChats.length === 0 ? (
                              <p className="px-2 py-1.5 text-[12px] text-muted-foreground">
                                Noch keine Chats.
                              </p>
                            ) : (
                              nestedChats.map((chat) => (
                                <ChatRow
                                  key={chat.id}
                                  chat={chat}
                                  selected={chat.id === activeId}
                                  busy={busy}
                                  nested
                                  onSelect={onSelect}
                                  onPin={onPin}
                                  onDelete={onDelete}
                                />
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {hasQuery && visibleMatters.length > 0 ? (
              <div className="mb-1.5">
                <h2 className="px-2 pb-0.5 pt-1.5 text-[11px] font-medium text-muted-foreground">
                  Akten
                </h2>
                <div className="space-y-px">
                  {visibleMatters.map((matter) => (
                    <MatterRow
                      key={matter.id}
                      matter={matter}
                      selected={matter.id === activeMatterId}
                      busy={busy}
                      onSelect={onSelectMatter}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            <ChatGroup
              label="Angepinnt"
              chats={pinned}
              activeId={activeId}
              busy={busy}
              onSelect={onSelect}
              onPin={onPin}
              onDelete={onDelete}
            />
            {recentGroups.map((group) => (
              <ChatGroup
                key={group.key}
                label={group.label}
                chats={group.chats}
                activeId={activeId}
                busy={busy}
                onSelect={onSelect}
                onPin={onPin}
                onDelete={onDelete}
              />
            ))}
            {conversations.length === 0 && !hasQuery ? (
              <p className="px-2 py-2 text-[13px] leading-relaxed text-muted-foreground">
                Noch keine Unterhaltungen.
              </p>
            ) : null}
          </>
        )}
      </nav>

      <div className="space-y-1 border-t border-border/70 px-2 pt-2 pb-2">
        <ThemeSwitch />
        <button
          type="button"
          disabled={signingOut}
          onClick={onSignOut}
          title={signingOut ? "Abmelden…" : userEmail ?? "Abmelden"}
          className="flex h-8 w-full items-center gap-2 rounded-[8px] px-1.5 text-left transition-colors hover:bg-foreground/[0.045] disabled:opacity-50"
        >
          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground/8 text-[10px] font-medium">
            {initials(userName)}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px]">
            {signingOut ? "Abmelden…" : userName}
          </span>
        </button>
      </div>
    </div>
  );
}
