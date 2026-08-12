"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListFilterIcon, PlusIcon, SearchIcon } from "lucide-react";

import {
  DocsDetailPane,
  type DocsPanel,
} from "@/components/docs/docs-detail-pane";
import { DocSidebar } from "@/components/docs/doc-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { useOptionalActiveArea } from "@/components/layout/active-area-provider";
import { itemMatchesAreaStrict } from "@/lib/area/active-area";
import type { DocPage, DocPageTreeNode, DocTag } from "@/lib/docs/types";
import { docTagToneClass, docTagToneRingClass } from "@/lib/docs/tag-colors";
import { tagKey } from "@/lib/prompts/tag-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DocsShellProps = {
  tree: DocPageTreeNode[];
  knownTags?: DocTag[];
};

/**
 * Liste unter `/…/dokumentation`.
 * Neu: `?neu=1`, Auswahl: `?slug=…`, Bearbeiten: `?slug=…&edit=1`.
 */
export function DocsShell(props: DocsShellProps) {
  return (
    <Suspense fallback={null}>
      <DocsShellInner {...props} />
    </Suspense>
  );
}

function DocsShellInner({ tree, knownTags = [] }: DocsShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeAreaCtx = useOptionalActiveArea();
  const activeArea = activeAreaCtx?.activeArea ?? "all";

  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | "all">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pageCache, setPageCache] = useState<DocPage | null>(null);
  const [layoutOpen, setLayoutOpen] = useState(() => hasDocsQuery(searchParams));

  const isCreating =
    searchParams.get("neu") === "1" || searchParams.get("neu") === "";
  const urlSlug = searchParams.get("slug");
  const isEditing = Boolean(urlSlug) && searchParams.get("edit") === "1";

  const flatPages = useMemo(() => flattenTree(tree), [tree]);

  const selectedPage = useMemo(() => {
    if (isCreating || !urlSlug) return null;
    const fromTree = flatPages.find((page) => page.slug === urlSlug);
    if (fromTree) return fromTree;
    if (
      pageCache?.slug === urlSlug &&
      itemMatchesAreaStrict(pageCache.module, activeArea)
    ) {
      return pageCache;
    }
    return null;
  }, [flatPages, urlSlug, pageCache, isCreating, activeArea]);

  const panel = useMemo((): DocsPanel | null => {
    if (isCreating) return { kind: "create" };
    if (!selectedPage) return null;
    if (isEditing) return { kind: "edit", page: selectedPage };
    return { kind: "view", page: selectedPage };
  }, [isCreating, isEditing, selectedPage]);

  const panelRef = useRef(panel);
  panelRef.current = panel;

  useEffect(() => {
    if (panel) setLayoutOpen(true);
  }, [panel]);

  useEffect(() => {
    if (!layoutOpen) return;
    setFiltersOpen(false);
    setTagFilter("all");
  }, [layoutOpen]);

  useEffect(() => {
    if (isCreating || !urlSlug) return;
    const exists =
      flatPages.some((page) => page.slug === urlSlug) ||
      pageCache?.slug === urlSlug;
    if (!exists) replaceDocsUrl(pathname, router);
  }, [flatPages, urlSlug, pageCache, pathname, router, isCreating]);

  const activePageId =
    panel && panel.kind !== "create" ? panel.page.id : null;

  const tagOptions = useMemo(() => {
    const byKey = new Map<string, { key: string; label: string; color: string }>();
    for (const page of flatPages) {
      if (!itemMatchesAreaStrict(page.module, activeArea)) continue;
      for (const tag of page.tags) {
        const key = tagKey(tag.name);
        if (!byKey.has(key)) {
          byKey.set(key, { key, label: tag.name, color: tag.color });
        }
      }
    }
    return [...byKey.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "de")
    );
  }, [flatPages, activeArea]);

  const filteredTree = useMemo(() => {
    if (tagFilter === "all") return tree;
    const matches = (page: DocPage) =>
      page.tags.some((tag) => tagKey(tag.name) === tagFilter);
    return tree
      .map((node) => ({
        ...node,
        children: node.children.filter(matches),
      }))
      .filter((node) => matches(node) || node.children.length > 0);
  }, [tree, tagFilter]);

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return null;
    return flatPages.filter((page) => {
      const matchesArea = itemMatchesAreaStrict(page.module, activeArea);
      const matchesTag =
        tagFilter === "all" ||
        page.tags.some((tag) => tagKey(tag.name) === tagFilter);
      const matchesQuery =
        page.title.toLowerCase().includes(query) ||
        page.content.toLowerCase().includes(query) ||
        page.tags.some((tag) => tag.name.toLowerCase().includes(query));
      return matchesArea && matchesTag && matchesQuery;
    });
  }, [flatPages, search, activeArea, tagFilter]);

  function openPage(page: DocPage) {
    setPageCache(page);
    setLayoutOpen(true);
    replaceDocsUrl(pathname, router, { slug: page.slug });
  }

  function openEdit(page: DocPage) {
    setPageCache(page);
    setLayoutOpen(true);
    replaceDocsUrl(pathname, router, { slug: page.slug, edit: true });
  }

  function openCreate() {
    setPageCache(null);
    setLayoutOpen(true);
    replaceDocsUrl(pathname, router, { neu: true });
  }

  function closePanel() {
    setPageCache(null);
    replaceDocsUrl(pathname, router);
  }

  function showView(page: DocPage) {
    setPageCache(page);
    replaceDocsUrl(pathname, router, { slug: page.slug });
  }

  const showCategoryFilters =
    !layoutOpen &&
    tagOptions.length > 0 &&
    (filtersOpen || tagFilter !== "all");

  const listFilters = (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Suchen…"
            className="h-11 w-full rounded-xl border-border/80 bg-background/80 pl-10 text-sm shadow-none"
          />
        </div>

        {!layoutOpen && tagOptions.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-11 shrink-0 gap-2 rounded-xl border-border/80 bg-background/80 px-3.5 text-sm font-medium shadow-none",
              "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              showCategoryFilters && "bg-muted/60 text-foreground",
              tagFilter !== "all" && "border-foreground/25 text-foreground"
            )}
            onClick={() => {
              if (showCategoryFilters) {
                setFiltersOpen(false);
                setTagFilter("all");
                return;
              }
              setFiltersOpen(true);
            }}
            aria-expanded={showCategoryFilters}
          >
            <ListFilterIcon className="size-4" />
            {showCategoryFilters ? "Ausblenden" : "Filtern"}
            {tagFilter !== "all" ? (
              <span className="text-muted-foreground">· aktiv</span>
            ) : null}
          </Button>
        ) : null}
      </div>

      {showCategoryFilters ? (
        <div className="flex flex-wrap gap-2">
          <CategoryPill
            active={tagFilter === "all"}
            onClick={() => setTagFilter("all")}
            label="Alle"
            tone="lime"
          />
          {tagOptions.map((tag) => (
            <CategoryPill
              key={tag.key}
              active={tagFilter === tag.key}
              onClick={() => {
                setTagFilter(tag.key);
                setFiltersOpen(true);
              }}
              label={tag.label}
              tone={tag.color}
            />
          ))}
        </div>
      ) : null}
    </div>
  );

  const listBody = searchResults ? (
    <div className="flex flex-col">
      {searchResults.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">Keine Treffer.</p>
      ) : (
        searchResults.map((page) => (
          <button
            key={page.id}
            type="button"
            onClick={() => openPage(page)}
            className={cn(
              "flex w-full items-center border-b border-border/50 py-3.5 text-left text-sm transition-colors last:border-b-0",
              layoutOpen ? "px-4 md:px-6" : "px-0",
              activePageId === page.id
                ? "bg-primary/10 font-medium"
                : "hover:bg-muted/60"
            )}
          >
            <span className="min-w-0 truncate">{page.title}</span>
          </button>
        ))
      )}
    </div>
  ) : (
    <DocSidebar
      tree={filteredTree}
      activePageId={activePageId}
      activeArea={activeArea}
      onSelect={openPage}
      compact={layoutOpen}
    />
  );

  if (!layoutOpen) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
        <PageHeader
          title="Dokumentation"
          description="Eintrag wählen, um den Inhalt zu öffnen."
        >
          <Button size="lg" className="px-5" onClick={openCreate}>
            <PlusIcon data-icon="inline-start" />
            Neu
          </Button>
        </PageHeader>

        <div className="space-y-4">{listFilters}</div>
        <div className="min-w-0">{listBody}</div>
      </div>
    );
  }

  return (
    <div className="-mx-4 -my-8 flex min-h-[calc(100vh-4rem)] flex-1 flex-col overflow-x-hidden md:-mx-8 md:-my-10">
      <div className="grid min-h-0 flex-1 border-t border-border/60 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
        <aside className="hidden min-h-0 w-full flex-col border-border/60 bg-background/70 lg:flex lg:border-r">
          <div className="shrink-0 space-y-3 border-b border-border/60 px-4 py-4 md:px-6">
            <div className="flex items-start justify-between gap-2">
              <h1 className="font-heading text-lg font-medium tracking-tight">
                Dokumentation
              </h1>
              <Button
                type="button"
                className="shrink-0"
                onClick={openCreate}
              >
                <PlusIcon data-icon="inline-start" />
                Neu
              </Button>
            </div>
            {listFilters}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{listBody}</div>
        </aside>

        <DocsDetailPane
          panel={panel}
          knownTags={knownTags}
          onClose={closePanel}
          onEdit={openEdit}
          onShowView={showView}
          onDeleted={() => {
            closePanel();
            router.refresh();
          }}
          onExitComplete={() => {
            if (!panelRef.current) setLayoutOpen(false);
          }}
        />
      </div>
    </div>
  );
}

function hasDocsQuery(searchParams: URLSearchParams) {
  return (
    searchParams.get("neu") === "1" ||
    searchParams.get("neu") === "" ||
    Boolean(searchParams.get("slug"))
  );
}

function replaceDocsUrl(
  pathname: string,
  router: ReturnType<typeof useRouter>,
  opts?: { slug?: string; edit?: boolean; neu?: boolean }
) {
  const params = new URLSearchParams();
  if (opts?.neu) {
    params.set("neu", "1");
  } else if (opts?.slug) {
    params.set("slug", opts.slug);
    if (opts.edit) params.set("edit", "1");
  }
  const query = params.toString();
  router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
}

function CategoryPill({
  active,
  onClick,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
        tone
          ? cn(
              docTagToneClass(tone),
              active
                ? cn(
                    "ring-1 ring-offset-1 ring-offset-background",
                    docTagToneRingClass(tone)
                  )
                : "opacity-90 hover:opacity-100"
            )
          : active
            ? "bg-foreground text-background"
            : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function flattenTree(tree: DocPageTreeNode[]): DocPage[] {
  return tree.flatMap((node) => [node, ...node.children]);
}
