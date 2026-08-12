"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowLeftIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { DocMarkdown } from "@/components/docs/doc-markdown";
import { PromptTagsInput } from "@/components/prompts/prompt-tags-input";
import { createDocPage, updateDocPage } from "@/lib/docs/actions";
import { createDocTagToneResolver } from "@/lib/docs/tag-colors";
import type { DocPage, DocPageInput, DocTag } from "@/lib/docs/types";
import type { ContentModule } from "@/lib/db/schema";
import { isAppModuleId } from "@/lib/modules";
import { useAreaBasePath } from "@/lib/area/use-area-path";
import { useOptionalActiveArea } from "@/components/layout/active-area-provider";
import { parseAreaFromPathname } from "@/lib/area/paths";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type DocFormProps = {
  mode: "create" | "edit";
  pageId?: string;
  initialValues?: DocPageInput;
  knownTags?: DocTag[];
  /** Im dritten Doku-Bereich eingebettet (ohne eigene Vollseiten-Header). */
  embedded?: boolean;
  onClose?: () => void;
  onSuccess?: (page: DocPage) => void;
};

export function DocForm({
  mode,
  pageId,
  initialValues,
  knownTags = [],
  embedded = false,
  onClose,
  onSuccess,
}: DocFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const activeAreaCtx = useOptionalActiveArea();
  const basePath = useAreaBasePath() ?? "";
  const docsBase = `${basePath}/dokumentation`;

  const areaFromPath = parseAreaFromPathname(pathname);
  const lockedModule: ContentModule =
    areaFromPath && isAppModuleId(areaFromPath)
      ? areaFromPath
      : activeAreaCtx?.activeArea && activeAreaCtx.activeArea !== "all"
        ? activeAreaCtx.activeArea
        : (initialValues?.module ?? "tax");

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [content, setContent] = useState(initialValues?.content ?? "");
  const [tags, setTags] = useState<string[]>(initialValues?.tags ?? []);
  const [preview, setPreview] = useState(false);
  const [isPending, startTransition] = useTransition();

  const tagSuggestions = useMemo(
    () => knownTags.map((tag) => tag.name),
    [knownTags]
  );
  const badgeClassForTag = useMemo(
    () => createDocTagToneResolver(knownTags),
    [knownTags]
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input: DocPageInput = {
      title,
      content,
      module: lockedModule,
      parentId: null,
      tags,
    };

    startTransition(async () => {
      const result =
        mode === "edit" && pageId
          ? await updateDocPage(pageId, input)
          : await createDocPage(input);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "edit" ? "Seite aktualisiert." : "Seite angelegt."
      );

      if (onSuccess) {
        onSuccess(result.page);
        return;
      }

      router.push(docsBase);
      router.refresh();
    });
  }

  function handleCancel() {
    if (onClose) {
      onClose();
      return;
    }
    router.push(docsBase);
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        !embedded && "mx-auto w-full max-w-6xl gap-6 pb-8"
      )}
    >
      {embedded ? (
        <div className="shrink-0 space-y-3 border-b border-border/60 px-4 py-4 md:px-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-2 mb-2 lg:hidden"
                onClick={handleCancel}
              >
                <ArrowLeftIcon data-icon="inline-start" />
                Zur Liste
              </Button>
              <h2 className="font-heading text-xl font-medium tracking-tight">
                {mode === "edit" ? "Seite bearbeiten" : "Neuer Eintrag"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Einfacher Text — ohne Dateianhänge.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={handleCancel}
              aria-label="Schließen"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit px-0 text-muted-foreground hover:text-foreground"
            onClick={handleCancel}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Zurück
          </Button>
          <div className="space-y-2 border-b border-border/70 pb-6">
            <p className="text-[0.68rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
              {mode === "edit" ? "Bearbeiten" : "Neu anlegen"}
            </p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              {mode === "edit" ? "Seite bearbeiten" : "Neue Dokumentationsseite"}
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Einfacher Text — ohne Dateianhänge.
            </p>
          </div>
        </>
      )}

      <form
        onSubmit={handleSubmit}
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          !embedded && "surface-card"
        )}
      >
        <div
          className={cn(
            "min-h-0 flex-1 space-y-6 overflow-y-auto",
            embedded ? "px-4 py-5 md:px-8" : "p-6"
          )}
        >
          <div className="grid gap-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="z. B. Onboarding neue Mitarbeiter"
              className="h-11 rounded-xl"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label>Kategorie</Label>
            <PromptTagsInput
              value={tags}
              onChange={setTags}
              suggestions={tagSuggestions}
              disabled={isPending}
              itemLabel="Kategorie"
              badgeClassForTag={badgeClassForTag}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="content">Inhalt</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPreview((current) => !current)}
            >
              {preview ? "Editor" : "Vorschau"}
            </Button>
          </div>

          <div className="grid min-h-0 flex-1 gap-2">
            {preview ? (
              <div
                className={cn(
                  "rounded-xl border border-border/80 bg-muted/20 p-5",
                  embedded
                    ? "min-h-[min(50dvh,28rem)]"
                    : "min-h-[min(60dvh,40rem)]"
                )}
              >
                {content.trim() ? (
                  <DocMarkdown content={content} />
                ) : (
                  <p className="text-sm text-muted-foreground">Noch kein Inhalt.</p>
                )}
              </div>
            ) : (
              <Textarea
                id="content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Text eingeben…"
                className={cn(
                  "resize-y rounded-xl text-sm leading-relaxed",
                  embedded
                    ? "min-h-[min(50dvh,28rem)]"
                    : "min-h-[min(60dvh,40rem)]"
                )}
              />
            )}
          </div>
        </div>

        <div
          className={cn(
            "mt-auto flex flex-col-reverse gap-2 border-t border-border/70 bg-muted/30 p-4 sm:flex-row sm:justify-end",
            embedded && "px-4 md:px-8"
          )}
        >
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={handleCancel}
          >
            Abbrechen
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Speichern…" : mode === "edit" ? "Speichern" : "Anlegen"}
          </Button>
        </div>
      </form>
    </div>
  );
}
