"use client";

import {
  ArrowUpDownIcon,
  CheckIcon,
  FolderIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useMattersSession } from "@/components/app/matters-shell";
import { AktenPathNav } from "@/components/matters/akten-path-nav";
import { filterMatters } from "@/lib/chat/search";
import {
  formatMatterDate,
  groupMattersByClient,
  MATTER_SORT_LABELS,
  MATTER_SORTS,
  type MatterSort,
} from "@/lib/matters/gallery";
import { clientAktenPath, matterPath } from "@/lib/matters/paths";
import type { MatterListItem } from "@/lib/matters/types";
import { cn } from "@/lib/utils";

const SORT_STORAGE_KEY = "matters-akten-sort";

function readStoredSort(): MatterSort {
  if (typeof window === "undefined") return "updated";
  const value = window.localStorage.getItem(SORT_STORAGE_KEY);
  if (value === "created" || value === "alpha" || value === "updated") {
    return value;
  }
  return "updated";
}

export function AktenGallery() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("client");
  const { matters, openSidebar, openCreateMatter } = useMattersSession();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sort, setSort] = useState<MatterSort>("updated");
  const [sortOpen, setSortOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSort(readStoredSort());
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!sortOpen) return;
    function onPointer(event: MouseEvent) {
      if (!sortRef.current?.contains(event.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [sortOpen]);

  const scoped = useMemo(() => {
    if (!clientId) return matters;
    return matters.filter((matter) => matter.clientId === clientId);
  }, [clientId, matters]);
  const clientName = scoped[0]?.clientName;
  const visible = useMemo(() => {
    return filterMatters(scoped, query);
  }, [query, scoped]);
  const groups = useMemo(
    () => groupMattersByClient(visible, sort),
    [sort, visible]
  );

  function changeSort(next: MatterSort) {
    setSort(next);
    window.localStorage.setItem(SORT_STORAGE_KEY, next);
    setSortOpen(false);
  }

  function openMatter(id: string) {
    router.push(matterPath(id));
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <AktenPathNav
        clientName={clientId ? clientName : undefined}
        onMenu={openSidebar}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-16 sm:px-8">
        <div className="mx-auto w-full max-w-[52rem] pt-6 sm:pt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-heading text-[clamp(1.75rem,3vw,2.25rem)] font-medium tracking-[-0.03em]">
              {clientId ? (clientName ?? "Mandant") : "Akten"}
            </h1>
            <div className="flex items-center gap-1">
              {searchOpen ? (
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setQuery("");
                        setSearchOpen(false);
                      }
                    }}
                    placeholder="Akten durchsuchen …"
                    autoComplete="off"
                    className="h-9 w-[min(16rem,calc(100vw-10rem))] rounded-full border border-border bg-card pr-8 pl-8 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground/25 [&::-webkit-search-cancel-button]:hidden"
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-1.5 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                    aria-label="Suche schließen"
                    onClick={() => {
                      setQuery("");
                      setSearchOpen(false);
                    }}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Akten suchen"
                  onClick={() => setSearchOpen(true)}
                >
                  <SearchIcon className="size-4" />
                </button>
              )}

              <div ref={sortRef} className="relative">
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Sortierung"
                  aria-expanded={sortOpen}
                  onClick={() => setSortOpen((value) => !value)}
                >
                  <ArrowUpDownIcon className="size-4" />
                </button>
                {sortOpen ? (
                  <div
                    role="menu"
                    className="absolute top-full right-0 z-20 mt-1 min-w-[13.5rem] rounded-xl border border-border bg-card py-1 shadow-[var(--shadow-soft)]"
                  >
                    {MATTER_SORTS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="menuitemradio"
                        aria-checked={sort === option}
                        onClick={() => changeSort(option)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13.5px] hover:bg-muted"
                      >
                        {MATTER_SORT_LABELS[option]}
                        {sort === option ? (
                          <CheckIcon className="size-3.5 text-foreground" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={openCreateMatter}
                className="ml-1 inline-flex h-9 items-center rounded-full bg-foreground px-3.5 text-[13px] font-medium text-background"
              >
                Neue Akte
              </button>
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="mt-12 text-sm text-muted-foreground">
              {query.trim()
                ? "Keine Treffer."
                : clientId
                  ? "Noch keine Akten für diesen Mandanten."
                  : "Noch keine Akten in diesem Bereich."}
            </p>
          ) : clientId ? (
            <div className="mt-8">
              <MatterCardGrid matters={visible} onOpen={openMatter} />
            </div>
          ) : (
            <div className="mt-8 space-y-8">
              {groups.map((group) => (
                <section key={group.clientId}>
                  <div className="mb-2.5 flex items-baseline justify-between gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(clientAktenPath(group.clientId))
                      }
                      className="min-w-0 truncate text-[13px] font-medium hover:opacity-80"
                    >
                      {group.clientName}
                    </button>
                    <p className="shrink-0 text-[12px] text-muted-foreground">
                      {group.matters.length === 1
                        ? "1 Akte"
                        : `${group.matters.length} Akten`}
                    </p>
                  </div>
                  <MatterCardGrid
                    matters={group.matters}
                    onOpen={openMatter}
                  />
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MatterCardGrid({
  matters,
  onOpen,
}: {
  matters: MatterListItem[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {matters.map((matter) => {
        const meta = [matter.fileNumber, formatMatterDate(matter.updatedAt)]
          .filter(Boolean)
          .join(" · ");
        return (
          <button
            key={matter.id}
            type="button"
            onClick={() => onOpen(matter.id)}
            className={cn(
              "flex items-center gap-3 rounded-2xl bg-muted/70 px-4 py-3.5 text-left transition-colors hover:bg-muted"
            )}
          >
            <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] tracking-tight">
                {matter.title}
              </span>
              {meta ? (
                <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                  {meta}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
