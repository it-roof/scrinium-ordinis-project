"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { DocForm } from "@/components/docs/doc-form";
import { DocMarkdown } from "@/components/docs/doc-markdown";
import { deleteDocPage } from "@/lib/docs/actions";
import type { DocPage, DocTag } from "@/lib/docs/types";
import { docTagToneClass } from "@/lib/docs/tag-colors";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type DocsPanel =
  | { kind: "create" }
  | { kind: "view"; page: DocPage }
  | { kind: "edit"; page: DocPage };

type DocsDetailPaneProps = {
  panel: DocsPanel | null;
  knownTags: DocTag[];
  onClose: () => void;
  onEdit: (page: DocPage) => void;
  onShowView: (page: DocPage) => void;
  onDeleted: () => void;
  /** Nach Exit-Animation — z. B. Grid wieder einklappen. */
  onExitComplete?: () => void;
};

const EASE = [0.25, 0.1, 0.25, 1] as const;

/** Dritter Bereich: weicher Fade (Layout wechselt sofort). */
export function DocsDetailPane({
  panel,
  knownTags,
  onClose,
  onEdit,
  onShowView,
  onDeleted,
  onExitComplete,
}: DocsDetailPaneProps) {
  const reduceMotion = useReducedMotion();
  const [rendered, setRendered] = useState<DocsPanel | null>(panel);

  useEffect(() => {
    if (panel) setRendered(panel);
  }, [panel]);

  const open = panel !== null;

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {open && rendered ? (
        <motion.section
          key="docs-detail-pane"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: reduceMotion ? 0 : 0.22,
            ease: EASE,
          }}
          className="flex min-h-0 flex-col bg-background/40"
        >
          <DocsPanelBody
            panel={rendered}
            knownTags={knownTags}
            onClose={onClose}
            onEdit={onEdit}
            onShowView={onShowView}
            onDeleted={onDeleted}
          />
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}

function DocsPanelBody({
  panel,
  knownTags,
  onClose,
  onEdit,
  onShowView,
  onDeleted,
}: {
  panel: DocsPanel;
  knownTags: DocTag[];
  onClose: () => void;
  onEdit: (page: DocPage) => void;
  onShowView: (page: DocPage) => void;
  onDeleted: () => void;
}) {
  const router = useRouter();

  if (panel.kind === "create") {
    return (
      <DocForm
        mode="create"
        embedded
        knownTags={knownTags}
        onClose={onClose}
        onSuccess={(page) => {
          onShowView(page);
          router.refresh();
        }}
      />
    );
  }

  if (panel.kind === "edit") {
    return (
      <DocForm
        key={panel.page.id}
        mode="edit"
        embedded
        pageId={panel.page.id}
        knownTags={knownTags}
        initialValues={{
          title: panel.page.title,
          content: panel.page.content,
          module: panel.page.module,
          parentId: null,
          tags: panel.page.tags.map((tag) => tag.name),
        }}
        onClose={() => onShowView(panel.page)}
        onSuccess={(page) => {
          onShowView(page);
          router.refresh();
        }}
      />
    );
  }

  return (
    <ActivePageContent
      page={panel.page}
      onClose={onClose}
      onEdit={() => onEdit(panel.page)}
      onDeleted={onDeleted}
    />
  );
}

function ActivePageContent({
  page,
  onClose,
  onEdit,
  onDeleted,
}: {
  page: DocPage;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-4 border-b border-border/60 px-4 py-4 md:px-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h2 className="font-heading text-2xl font-medium tracking-tight text-balance md:text-3xl">
              {page.title}
            </h2>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
              {page.tags.length > 0 ? (
                <>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {page.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[0.7rem] font-medium",
                          docTagToneClass(tag.color)
                        )}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </span>
                  <span aria-hidden>·</span>
                </>
              ) : null}
              <span>
                {new Date(page.updatedAt).toLocaleString("de-DE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <PageMoreMenu page={page} onDeleted={onDeleted} />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={onClose}
              aria-label="Schließen"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          <PencilIcon data-icon="inline-start" />
          Bearbeiten
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
        {page.content.trim() ? (
          <DocMarkdown content={page.content} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Dieser Eintrag hat noch keinen Inhalt.
          </p>
        )}
      </div>
    </div>
  );
}

function PageMoreMenu({
  page,
  onDeleted,
}: {
  page: DocPage;
  onDeleted: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteDocPage(page.id);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Seite gelöscht.");
      setConfirmOpen(false);
      onDeleted();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Weitere Aktionen"
          >
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2Icon />
            Löschen…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">
              Seite löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              „{page.title}" wird dauerhaft entfernt.
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
