"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type DragEvent } from "react";
import {
  FileTextIcon,
  MessagesSquareIcon,
  MoreHorizontalIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { MatterPartiesSection } from "@/components/ai/matter-parties-section";
import { useLabTheme } from "@/components/neues-design/lab-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteMatterChatAction,
  renameMatterChatAction,
} from "@/lib/ai/matter-chat/actions";
import type { MatterAiChatListItem } from "@/lib/ai/matter-chat/storage";
import type { ConsentStatusView } from "@/lib/ai/consent";
import type { MatterPartyRecord } from "@/lib/ai/parties-storage";
import { useAreaBasePath, useAreaFromPath } from "@/lib/area/use-area-path";
import type { MatterRecord } from "@/lib/clients/types";
import { deleteLetter, renameLetter } from "@/lib/letters/actions";
import {
  LETTER_KIND_LABELS,
  type LetterRecord,
} from "@/lib/letters/types";
import { updateMatter } from "@/lib/matters/actions";
import {
  deleteMatterFileAction,
  renameMatterFileAction,
  uploadMatterFilesAction,
  type MatterFileConflictPolicy,
} from "@/lib/matters/files-actions";
import {
  normalizeMatterFilename,
  type MatterFileRecord,
} from "@/lib/matters/files-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type RecentItem =
  | {
      kind: "chat";
      id: string;
      title: string;
      href: string;
      updatedAt: string;
    }
  | {
      kind: "document";
      id: string;
      title: string;
      href: string;
      updatedAt: string;
      kindLabel: string;
      canRename: boolean;
    }
  | {
      kind: "file";
      id: string;
      title: string;
      href: string;
      updatedAt: string;
    };

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

export function MatterDetailView({
  matter,
  letters,
  showLetters = true,
  files = [],
  parties = [],
  consentStatus = "none",
  chats = [],
}: {
  matter: MatterRecord;
  letters: LetterRecord[];
  showLetters?: boolean;
  files?: MatterFileRecord[];
  parties?: MatterPartyRecord[];
  consentStatus?: ConsentStatusView;
  chats?: MatterAiChatListItem[];
}) {
  const router = useRouter();
  const basePath = useAreaBasePath() ?? "";
  const area = useAreaFromPath();
  const { appearance } = useLabTheme();
  const [title, setTitle] = useState(matter.title);
  const [reference, setReference] = useState(matter.reference);
  const [notes, setNotes] = useState(matter.notes);
  const [pageDragActive, setPageDragActive] = useState(false);
  const [chatItems, setChatItems] = useState(chats);
  const [letterItems, setLetterItems] = useState(letters);
  const [fileItems, setFileItems] = useState(files);
  const [recentSearch, setRecentSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [menuPending, startMenuTransition] = useTransition();
  const [uploadingFiles, startUploadTransition] = useTransition();
  const [editingNotes, setEditingNotes] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [fileConflict, setFileConflict] = useState<{
    filename: string;
    remaining: number;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pageDragDepthRef = useRef(0);
  const conflictResolverRef = useRef<
    ((decision: MatterFileConflictPolicy | "cancel") => void) | null
  >(null);

  useEffect(() => {
    setTitle(matter.title);
    setReference(matter.reference);
    setNotes(matter.notes);
  }, [matter.title, matter.reference, matter.notes]);

  useEffect(() => {
    setChatItems(chats);
  }, [chats]);

  useEffect(() => {
    setLetterItems(letters);
  }, [letters]);

  useEffect(() => {
    setFileItems(files);
  }, [files]);

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus({ preventScroll: true });
  }, [searchOpen]);

  const recentItems = useMemo(() => {
    const items: RecentItem[] = [
      ...chatItems.map((chat) => ({
        kind: "chat" as const,
        id: chat.id,
        title: chat.title || "Chat",
        href: `${basePath}/akten-chat/${matter.id}/${chat.id}`,
        updatedAt: chat.updatedAt,
      })),
    ];

    if (showLetters) {
      for (const letter of letterItems) {
        items.push({
          kind: "document",
          id: letter.id,
          title: letter.title,
          href: `${basePath}/schreiben/${letter.id}/bearbeiten`,
          updatedAt: letter.updatedAt,
          kindLabel: LETTER_KIND_LABELS[letter.kind],
          canRename: letter.status !== "versendet",
        });
      }
    }

    for (const file of fileItems) {
      items.push({
        kind: "file",
        id: file.id,
        title: file.filename,
        href: `/api/matters/files/${file.id}?download=1`,
        updatedAt: file.updatedAt,
      });
    }

    const query = recentSearch.trim().toLowerCase();
    const filtered = !query
      ? items
      : items.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            (item.kind === "document" &&
              item.kindLabel.toLowerCase().includes(query))
        );

    return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [
    basePath,
    chatItems,
    fileItems,
    letterItems,
    matter.id,
    recentSearch,
    showLetters,
  ]);

  function fileFromDataTransfer(dt: DataTransfer | null): File[] {
    if (!dt) return [];
    if (dt.files?.length) {
      return Array.from(dt.files);
    }
    return Array.from(dt.items ?? [])
      .filter((entry) => entry.kind === "file")
      .map((entry) => entry.getAsFile())
      .filter((file): file is File => Boolean(file));
  }

  function onPageDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    event.stopPropagation();
    pageDragDepthRef.current += 1;
    setPageDragActive(true);
  }

  function onPageDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    event.stopPropagation();
    pageDragDepthRef.current = Math.max(0, pageDragDepthRef.current - 1);
    if (pageDragDepthRef.current === 0) {
      setPageDragActive(false);
    }
  }

  function onPageDragOver(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }

  function askFileConflict(
    filename: string,
    remaining: number
  ): Promise<MatterFileConflictPolicy | "cancel"> {
    return new Promise((resolve) => {
      conflictResolverRef.current = resolve;
      setFileConflict({ filename, remaining });
    });
  }

  function resolveFileConflict(decision: MatterFileConflictPolicy | "cancel") {
    const resolve = conflictResolverRef.current;
    conflictResolverRef.current = null;
    setFileConflict(null);
    resolve?.(decision);
  }

  async function collectConflictPolicies(
    filesToUpload: File[]
  ): Promise<Record<string, MatterFileConflictPolicy> | null> {
    const policies: Record<string, MatterFileConflictPolicy> = {};
    const conflicts = filesToUpload.filter((file) =>
      fileItems.some(
        (item) =>
          normalizeMatterFilename(item.filename) ===
          normalizeMatterFilename(file.name)
      )
    );

    const uniqueConflictNames: string[] = [];
    const seenConflictKeys = new Set<string>();
    for (const file of conflicts) {
      const key = normalizeMatterFilename(file.name);
      if (seenConflictKeys.has(key)) continue;
      seenConflictKeys.add(key);
      uniqueConflictNames.push(file.name);
    }

    for (let index = 0; index < uniqueConflictNames.length; index += 1) {
      const filename = uniqueConflictNames[index]!;
      const decision = await askFileConflict(
        filename,
        uniqueConflictNames.length - index - 1
      );
      if (decision === "cancel") {
        return null;
      }
      policies[normalizeMatterFilename(filename)] = decision;
    }

    return policies;
  }

  function uploadMatterDocuments(filesToUpload: File[]) {
    if (!area || filesToUpload.length === 0) return;

    void (async () => {
      const policies = await collectConflictPolicies(filesToUpload);
      if (policies == null) {
        toast.message("Upload abgebrochen.");
        return;
      }

      startUploadTransition(async () => {
        const formData = new FormData();
        formData.set("matterId", matter.id);
        formData.set("practice", area);
        formData.set("conflictPolicies", JSON.stringify(policies));
        for (const file of filesToUpload) {
          formData.append("files", file);
        }

        const result = await uploadMatterFilesAction(formData);
        if (!result.success) {
          toast.error(result.error);
          return;
        }

        const { created, replaced, skipped } = result.data;
        setFileItems((prev) => {
          const withoutReplaced = prev.filter(
            (item) => !replaced.some((file) => file.id === item.id)
          );
          const next = [...created, ...replaced, ...withoutReplaced];
          const seen = new Set<string>();
          return next.filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        });

        const added = created.length + replaced.length;
        if (added > 0 && skipped.length === 0) {
          toast.success(
            added === 1
              ? replaced.length === 1
                ? "Dokument ersetzt."
                : "Dokument hinzugefügt."
              : `${added} Dokumente übernommen.`
          );
        } else if (added > 0) {
          toast.success(
            `${added} übernommen, ${skipped.length} übersprungen.`
          );
        } else if (skipped.length > 0) {
          toast.message("Keine Datei übernommen.");
        }
      });
    })();
  }

  function onPageDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    pageDragDepthRef.current = 0;
    setPageDragActive(false);
    if (uploadingFiles) {
      toast.error("Bitte warten — Upload läuft noch.");
      return;
    }
    uploadMatterDocuments(fileFromDataTransfer(event.dataTransfer));
  }

  function handleRename(item: RecentItem) {
    if (item.kind === "document" && !item.canRename) {
      toast.error("Versendete Schreiben können nicht umbenannt werden.");
      return;
    }
    const next = window.prompt("Neuer Titel", item.title)?.trim();
    if (!next || next === item.title) return;
    if ((item.kind === "chat" || item.kind === "file") && !area) return;

    startMenuTransition(async () => {
      if (item.kind === "chat") {
        if (!area) return;
        const result = await renameMatterChatAction({
          chatId: item.id,
          matterId: matter.id,
          practice: area,
          title: next,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        setChatItems((prev) =>
          prev.map((chat) =>
            chat.id === item.id
              ? {
                  ...chat,
                  title: result.data.title,
                  updatedAt: new Date().toISOString(),
                }
              : chat
          )
        );
        toast.success("Chat umbenannt.");
        return;
      }

      if (item.kind === "file") {
        if (!area) return;
        const result = await renameMatterFileAction({
          fileId: item.id,
          matterId: matter.id,
          practice: area,
          filename: next,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        setFileItems((prev) =>
          prev.map((file) => (file.id === item.id ? result.data : file))
        );
        toast.success("Dokument umbenannt.");
        return;
      }

      const result = await renameLetter(item.id, next);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setLetterItems((prev) =>
        prev.map((letter) =>
          letter.id === item.id ? result.item : letter
        )
      );
      toast.success("Schreiben umbenannt.");
    });
  }

  function handleDelete(item: RecentItem) {
    const label =
      item.kind === "chat"
        ? "Chat"
        : item.kind === "file"
          ? "Dokument"
          : "Schreiben";
    if (!window.confirm(`${label} „${item.title}“ wirklich löschen?`)) {
      return;
    }
    if ((item.kind === "chat" || item.kind === "file") && !area) return;

    startMenuTransition(async () => {
      if (item.kind === "chat") {
        if (!area) return;
        const result = await deleteMatterChatAction({
          chatId: item.id,
          matterId: matter.id,
          practice: area,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        setChatItems((prev) => prev.filter((chat) => chat.id !== item.id));
        toast.success("Chat gelöscht.");
        return;
      }

      if (item.kind === "file") {
        if (!area) return;
        const result = await deleteMatterFileAction({
          fileId: item.id,
          matterId: matter.id,
          practice: area,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        setFileItems((prev) => prev.filter((file) => file.id !== item.id));
        toast.success("Dokument gelöscht.");
        return;
      }

      const result = await deleteLetter(item.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setLetterItems((prev) => prev.filter((letter) => letter.id !== item.id));
      toast.success("Schreiben gelöscht.");
    });
  }

  function handleSaveMeta() {
    startTransition(async () => {
      const result = await updateMatter(matter.id, {
        title,
        reference,
        notes,
        module: matter.module,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Akte gespeichert.");
      setEditingNotes(false);
      router.refresh();
    });
  }

  const hasRecent =
    chatItems.length > 0 ||
    fileItems.length > 0 ||
    (showLetters && letterItems.length > 0);

  const toolbar = hasRecent ? (
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
            value={recentSearch}
            onChange={(event) => setRecentSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setRecentSearch("");
                setSearchOpen(false);
              }
            }}
            placeholder="Suchen…"
            aria-label="Elemente durchsuchen"
            className="lab-matters-search-input"
          />
          <button
            type="button"
            className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1"
            style={{ color: "var(--b-muted)" }}
            aria-label="Suche schließen"
            onClick={() => {
              setRecentSearch("");
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
          aria-label="Elemente durchsuchen"
          title="Suchen"
          onClick={() => setSearchOpen(true)}
        >
          <SearchIcon className="size-4" strokeWidth={1.75} />
        </button>
      )}
    </div>
  ) : null;

  return (
    <div
      className={cn(
        "lab-matter-detail relative min-h-0 flex-1 overflow-y-auto",
        pageDragActive && "lab-matter-detail--drag"
      )}
      onDragEnter={onPageDragEnter}
      onDragLeave={onPageDragLeave}
      onDragOver={onPageDragOver}
      onDrop={onPageDrop}
    >
      {pageDragActive ? (
        <div className="lab-matter-drop-overlay" aria-hidden>
          <p className="b-display text-[1.25rem] font-medium tracking-[-0.02em]">
            Dokument hier ablegen
          </p>
          <p className="b-meta mt-1">Wird zu „Letzte Elemente“ hinzugefügt</p>
        </div>
      ) : null}
      <div className="lab-matter-detail-layout mx-auto w-full max-w-6xl px-4 pt-7 pb-10 lg:px-6 lg:pt-9">
        <header className="lab-matter-detail-header flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="b-title min-w-0 truncate">{matter.title}</h1>
          <div className="shrink-0 self-start sm:self-auto">{toolbar}</div>
        </header>

        <div className="lab-matter-detail-main min-w-0">
          <section className="lab-matter-recent">
            <h2 className="lab-matter-recent-heading">Letzte Elemente</h2>
            {recentItems.length === 0 ? (
              <p className="b-meta py-6">
                {hasRecent
                  ? "Keine Treffer."
                  : "Noch keine Elemente. Dateien per Drag & Drop hier ablegen."}
              </p>
            ) : (
              <ul className="lab-matter-recent-list">
                {recentItems.map((item) => {
                  const rowKey = `${item.kind}-${item.id}`;
                  const menuOpen = menuOpenId === rowKey;
                  return (
                    <li key={rowKey}>
                      <div
                        className="lab-matter-recent-row"
                        data-menu-open={menuOpen ? "true" : "false"}
                      >
                        <Link
                          href={item.href}
                          className="lab-matter-recent-link"
                          {...(item.kind === "file"
                            ? { target: "_blank", rel: "noreferrer" }
                            : {})}
                        >
                          <span className="lab-matter-recent-main">
                            {item.kind === "chat" ? (
                              <MessagesSquareIcon
                                className="lab-matter-recent-icon"
                                strokeWidth={1.75}
                                aria-hidden
                              />
                            ) : (
                              <FileTextIcon
                                className="lab-matter-recent-icon"
                                strokeWidth={1.75}
                                aria-hidden
                              />
                            )}
                            <span className="lab-matter-recent-title">
                              <span className="lab-matter-recent-name">
                                {item.title}
                              </span>
                              {item.kind === "document" ? (
                                <span className="lab-matter-recent-kind">
                                  {item.kindLabel}
                                </span>
                              ) : item.kind === "file" ? (
                                <span className="lab-matter-recent-kind">
                                  Datei
                                </span>
                              ) : null}
                            </span>
                          </span>
                          <span className="lab-matter-recent-meta">
                            {formatRelativeDate(item.updatedAt)}
                          </span>
                        </Link>
                        <DropdownMenu
                          open={menuOpen}
                          onOpenChange={(open) =>
                            setMenuOpenId(open ? rowKey : null)
                          }
                        >
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="lab-matter-recent-menu"
                              aria-label="Aktionen"
                              disabled={menuPending}
                            >
                              <MoreHorizontalIcon
                                className="size-4"
                                strokeWidth={1.75}
                              />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-40">
                            <DropdownMenuItem
                              disabled={
                                menuPending ||
                                (item.kind === "document" && !item.canRename)
                              }
                              onSelect={() => handleRename(item)}
                            >
                              Umbenennen
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={menuPending}
                              onSelect={() => handleDelete(item)}
                            >
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className="lab-matter-secondary mt-10">
            <MatterPartiesSection
              matterId={matter.id}
              initialParties={parties}
            />
          </div>
        </div>

        <aside className="lab-matter-rail" aria-label="Akten-Kontext">
          <Link
            href={`${basePath}/mandanten/${matter.clientId}`}
            className="lab-matter-rail-primary"
          >
            {matter.clientName}
          </Link>
          {reference.trim() ? (
            <p className="lab-matter-rail-secondary">{reference}</p>
          ) : null}

          {editingNotes ? (
            <div className="lab-matter-rail-edit">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="lab-field"
                aria-label="Titel"
                placeholder="Titel"
              />
              <input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                className="lab-field"
                aria-label="Aktenzeichen"
                placeholder="Aktenzeichen"
              />
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="lab-matter-rail-notes"
                placeholder="Notiz…"
              />
              <div className="lab-matter-rail-edit-actions">
                <button
                  type="button"
                  className="lab-matter-rail-action"
                  onClick={() => {
                    setTitle(matter.title);
                    setReference(matter.reference);
                    setNotes(matter.notes);
                    setEditingNotes(false);
                  }}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  className="lab-matter-rail-action"
                  disabled={isPending}
                  onClick={handleSaveMeta}
                >
                  Speichern
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="lab-matter-rail-note"
              onClick={() => setEditingNotes(true)}
            >
              {notes.trim() || "Notiz hinzufügen…"}
            </button>
          )}

          {parties.length > 0 ? (
            <p className="lab-matter-rail-meta">
              {parties.length}{" "}
              {parties.length === 1 ? "Beteiligter" : "Beteiligte"}
            </p>
          ) : null}
          <p
            className={
              consentStatus === "granted"
                ? "lab-matter-rail-meta lab-matter-rail-ok"
                : "lab-matter-rail-meta lab-matter-rail-warn"
            }
          >
            {consentStatus === "granted"
              ? "KI-Einwilligung erteilt"
              : consentStatus === "revoked"
                ? "KI-Einwilligung widerrufen"
                : "Keine KI-Einwilligung"}
          </p>
        </aside>
      </div>

      <Dialog
        open={fileConflict != null}
        onOpenChange={(open) => {
          if (!open) resolveFileConflict("cancel");
        }}
      >
        <DialogContent
          className="brand-alba brand-alba-manrope lab-matter-conflict-dialog sm:max-w-[28rem]"
          data-lab-appearance={appearance}
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Datei existiert bereits</DialogTitle>
          </DialogHeader>
          <DialogDescription className="lab-matter-conflict-text">
            An diesem Ort existiert bereits ein Objekt mit dem Namen „
            {fileConflict?.filename}“. Soll es durch das Objekt ersetzt
            werden, das du kopierst?
          </DialogDescription>
          <div className="lab-matter-conflict-actions">
            <button
              type="button"
              className="b-btn b-btn-secondary"
              onClick={() => resolveFileConflict("keepBoth")}
            >
              Beide behalten
            </button>
            <button
              type="button"
              className="b-btn b-btn-secondary"
              onClick={() => resolveFileConflict("replace")}
            >
              Ersetzen
            </button>
            <button
              type="button"
              className="b-btn b-btn-secondary"
              onClick={() => resolveFileConflict("cancel")}
            >
              Abbrechen
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
