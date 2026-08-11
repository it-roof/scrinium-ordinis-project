"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { DocMarkdown } from "@/components/docs/doc-markdown";
import { DocSidebar } from "@/components/docs/doc-sidebar";
import { DepartmentBadge } from "@/components/text-blocks/department-badge";
import { deleteDocPage } from "@/lib/docs/actions";
import { departmentStyles } from "@/lib/text-blocks/department-styles";
import { DEPARTMENTS } from "@/lib/text-blocks/types";
import type { DocPage, DocPageTreeNode } from "@/lib/docs/types";
import type { Department } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DocsShellProps = {
  tree: DocPageTreeNode[];
  activePage?: DocPage | null;
};

export function DocsShell({ tree, activePage }: DocsShellProps) {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<Department | "all">(
    "all"
  );

  const flatPages = useMemo(() => flattenTree(tree), [tree]);

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return [];

    return flatPages.filter(
      (page) =>
        page.title.toLowerCase().includes(query) ||
        page.content.toLowerCase().includes(query)
    );
  }, [flatPages, search]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[0.68rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Wissensbasis
          </p>
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            Dokumentation
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Interne Anleitungen und Prozesse — strukturiert nach Kanzlei-Bereichen.
          </p>
        </div>

        <Button asChild size="lg" className="shrink-0 px-5 shadow-sm shadow-primary/20">
          <Link href="/dokumentation/neu">
            <PlusIcon data-icon="inline-start" />
            Neue Seite
          </Link>
        </Button>
      </div>

      <div className="surface-panel space-y-4 p-4 md:p-5">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Seiten durchsuchen…"
            className="h-11 rounded-xl border-border/80 bg-background/80 pl-10 shadow-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterPill
            active={departmentFilter === "all"}
            onClick={() => setDepartmentFilter("all")}
            label="Alle"
            count={flatPages.length}
            activeClassName="bg-primary text-primary-foreground shadow-sm shadow-primary/20"
          />
          {DEPARTMENTS.map((department) => {
            const count = flatPages.filter(
              (page) => page.department === department.value
            ).length;
            const styles = departmentStyles[department.value];

            return (
              <FilterPill
                key={department.value}
                active={departmentFilter === department.value}
                onClick={() => setDepartmentFilter(department.value)}
                label={department.label}
                count={count}
                dotClassName={styles.dot}
                activeClassName={styles.pill}
              />
            );
          })}
        </div>

        {search.trim() && (
          <div className="space-y-2 border-t border-border/70 pt-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Suchergebnisse
            </p>
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Treffer.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {searchResults.map((page) => (
                  <Button key={page.id} asChild variant="outline" size="sm">
                    <Link href={`/dokumentation/${page.slug}`}>{page.title}</Link>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid min-h-[32rem] gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="surface-card h-fit p-3 lg:sticky lg:top-4">
          <p className="px-2 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Seiten
          </p>
          <DocSidebar
            tree={tree}
            activeSlug={activePage?.slug}
            departmentFilter={departmentFilter}
          />
        </aside>

        <section className="surface-card min-h-[24rem] p-6 md:p-8">
          {activePage ? (
            <ActivePageContent page={activePage} />
          ) : (
            <div className="flex h-full min-h-[20rem] flex-col items-center justify-center gap-4 text-center">
              <p className="font-heading text-lg font-medium">
                Seite auswählen oder anlegen
              </p>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Wähle links eine Seite aus oder lege die erste Dokumentation an.
              </p>
              <Button asChild>
                <Link href="/dokumentation/neu">
                  <PlusIcon data-icon="inline-start" />
                  Erste Seite anlegen
                </Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ActivePageContent({ page }: { page: DocPage }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <DepartmentBadge department={page.department} />
          <h2 className="font-heading text-2xl font-medium tracking-tight">
            {page.title}
          </h2>
          <p className="text-xs text-muted-foreground">
            Zuletzt geändert:{" "}
            {new Date(page.updatedAt).toLocaleString("de-DE", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dokumentation/${page.slug}/bearbeiten`}>
              <PencilIcon data-icon="inline-start" />
              Bearbeiten
            </Link>
          </Button>
          <DeletePageButton page={page} />
        </div>
      </div>

      {page.content.trim() ? (
        <DocMarkdown content={page.content} />
      ) : (
        <p className="text-sm text-muted-foreground">Diese Seite hat noch keinen Inhalt.</p>
      )}
    </div>
  );
}

function DeletePageButton({ page }: { page: DocPage }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteDocPage(page.id);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Seite gelöscht.");
      setOpen(false);
      router.push("/dokumentation");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2Icon data-icon="inline-start" />
        Löschen
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">
              Seite löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              „{page.title}" und ggf. Unterseiten werden dauerhaft entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function flattenTree(tree: DocPageTreeNode[]): DocPage[] {
  return tree.flatMap((node) => [node, ...node.children]);
}

function FilterPill({
  active,
  onClick,
  label,
  count,
  activeClassName,
  dotClassName,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  activeClassName: string;
  dotClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? activeClassName
          : "border-border/80 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {dotClassName && (
        <span className={cn("size-2 rounded-full", dotClassName)} />
      )}
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-xs",
          active ? "bg-white/20" : "bg-muted text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}
