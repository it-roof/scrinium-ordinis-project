"use client";

import { useMemo } from "react";
import { FileTextIcon } from "lucide-react";

import {
  itemMatchesAreaStrict,
  type ActiveArea,
} from "@/lib/area/active-area";
import type { DocPage, DocPageTreeNode } from "@/lib/docs/types";
import { cn } from "@/lib/utils";

type DocSidebarProps = {
  tree: DocPageTreeNode[];
  activePageId?: string | null;
  activeArea: ActiveArea;
  onSelect: (page: DocPage) => void;
  /** Engere Padding für die Master-Detail-Sidebar. */
  compact?: boolean;
};

/** Flache Liste — Struktur läuft über Kategorien, nicht über Ordner. */
export function DocSidebar({
  tree,
  activePageId,
  activeArea,
  onSelect,
  compact = false,
}: DocSidebarProps) {
  const pages = useMemo(() => {
    const flat: DocPage[] = tree.flatMap((node) => [node, ...node.children]);
    return flat
      .filter((page) => itemMatchesAreaStrict(page.module, activeArea))
      .sort((a, b) => a.title.localeCompare(b.title, "de"));
  }, [tree, activeArea]);

  if (pages.length === 0) {
    return (
      <p
        className={cn(
          "py-6 text-sm text-muted-foreground",
          compact ? "px-3" : "px-0"
        )}
      >
        Noch keine Einträge in diesem Bereich.
      </p>
    );
  }

  return (
    <nav className="flex flex-col" aria-label="Dokumentation">
      {pages.map((page) => (
        <div
          key={page.id}
          className="border-b border-border/50 last:border-b-0"
        >
          <ListItem
            active={activePageId === page.id}
            title={page.title}
            updatedAt={page.updatedAt}
            compact={compact}
            onClick={() => onSelect(page)}
          />
        </div>
      ))}
    </nav>
  );
}

function ListItem({
  active,
  title,
  updatedAt,
  compact,
  onClick,
}: {
  active: boolean;
  title: string;
  updatedAt: string;
  compact: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 py-3.5 text-left transition-colors",
        compact ? "px-4 md:px-6" : "px-0 sm:px-1",
        active
          ? "bg-primary/10 text-foreground"
          : "text-foreground/90 hover:bg-muted/60"
      )}
    >
      <FileTextIcon
        className={cn(
          "size-4 shrink-0",
          active ? "text-primary" : "text-muted-foreground"
        )}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          active ? "font-medium" : "font-normal"
        )}
      >
        {title}
      </span>
      <span className="shrink-0 text-[0.7rem] text-muted-foreground">
        {new Date(updatedAt).toLocaleDateString("de-DE", {
          dateStyle: "medium",
        })}
      </span>
    </button>
  );
}
