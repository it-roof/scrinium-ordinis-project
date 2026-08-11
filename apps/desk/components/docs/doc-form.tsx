"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeftIcon,
  FileUpIcon,
  ImageIcon,
  Loader2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { DocEmbeddedAssets } from "@/components/docs/doc-embedded-assets";
import { DocMarkdown } from "@/components/docs/doc-markdown";
import {
  createDocPage,
  updateDocPage,
  uploadDocAsset,
} from "@/lib/docs/actions";
import type { DocPage, DocPageInput } from "@/lib/docs/types";
import { DEPARTMENTS } from "@/lib/text-blocks/types";
import type { Department } from "@/lib/db/schema";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type DocFormProps = {
  mode: "create" | "edit";
  pageId?: string;
  initialValues?: DocPageInput;
  rootPages: DocPage[];
  currentSlug?: string;
};

export function DocForm({
  mode,
  pageId,
  initialValues,
  rootPages,
  currentSlug,
}: DocFormProps) {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [content, setContent] = useState(initialValues?.content ?? "");
  const [department, setDepartment] = useState<Department>(
    initialValues?.department ?? "general"
  );
  const [parentId, setParentId] = useState<string>(
    initialValues?.parentId ?? "none"
  );
  const [preview, setPreview] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isUploading, startUpload] = useTransition();

  const parentOptions = useMemo(
    () => rootPages.filter((page) => page.id !== pageId),
    [pageId, rootPages]
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input: DocPageInput = {
      title,
      content,
      department,
      parentId: parentId === "none" ? null : parentId,
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
      router.push(`/dokumentation/${result.page.slug}`);
      router.refresh();
    });
  }

  function insertMarkdown(snippet: string) {
    const textarea = textareaRef.current;

    if (!textarea) {
      setContent((current) => `${current}\n\n${snippet}`.trim());
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${content.slice(0, start)}${snippet}${content.slice(end)}`;

    setContent(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + snippet.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  function handleUpload(file: File) {
    const formData = new FormData();
    formData.set("file", file);

    startUpload(async () => {
      const result = await uploadDocAsset(formData);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      insertMarkdown(result.markdown);
      toast.success("Datei hochgeladen und eingefügt.");
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 pb-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-fit px-0 text-muted-foreground hover:text-foreground"
      >
        <Link href={currentSlug ? `/dokumentation/${currentSlug}` : "/dokumentation"}>
          <ArrowLeftIcon data-icon="inline-start" />
          Zurück
        </Link>
      </Button>

      <PageHeader
        eyebrow={mode === "edit" ? "Bearbeiten" : "Neu anlegen"}
        title={mode === "edit" ? "Seite bearbeiten" : "Neue Dokumentationsseite"}
        description="Markdown-Text mit Bildern und PDFs — Uploads landen im privaten Object Storage."
      />

      <form
        onSubmit={handleSubmit}
        className="surface-card flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2">
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
              <Label>Bereich</Label>
              <Select
                value={department}
                onValueChange={(value) => setDepartment(value as Department)}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Übergeordnete Seite (max. 2 Ebenen)</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Keine (Root-Seite)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine (Root-Seite / Ordner)</SelectItem>
                {parentOptions.map((page) => (
                  <SelectItem key={page.id} value={page.id}>
                    {page.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleUpload(file);
                event.target.value = "";
              }}
            />
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleUpload(file);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => imageInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2Icon className="animate-spin" data-icon="inline-start" />
              ) : (
                <ImageIcon data-icon="inline-start" />
              )}
              Bild hochladen
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => pdfInputRef.current?.click()}
            >
              <FileUpIcon data-icon="inline-start" />
              PDF hochladen
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPreview((current) => !current)}
            >
              {preview ? "Editor" : "Vorschau"}
            </Button>
          </div>

          <DocEmbeddedAssets
            content={content}
            pageId={pageId}
            onContentChange={setContent}
          />

          <div className="grid min-h-0 flex-1 gap-2">
            <Label htmlFor="content">Inhalt (Markdown)</Label>
            {preview ? (
              <div className="min-h-[min(60dvh,40rem)] rounded-xl border border-border/80 bg-muted/20 p-5">
                {content.trim() ? (
                  <DocMarkdown content={content} />
                ) : (
                  <p className="text-sm text-muted-foreground">Noch kein Inhalt.</p>
                )}
              </div>
            ) : (
              <Textarea
                ref={textareaRef}
                id="content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="# Überschrift&#10;&#10;Dein Text…"
                className={cn(
                  "min-h-[min(60dvh,40rem)] resize-y rounded-xl font-mono text-sm leading-relaxed"
                )}
              />
            )}
          </div>
        </div>

        <div className="mt-auto flex flex-col-reverse gap-2 border-t border-border/70 bg-muted/30 p-4 sm:flex-row sm:justify-end">
          <Button variant="outline" asChild disabled={isPending}>
            <Link href={currentSlug ? `/dokumentation/${currentSlug}` : "/dokumentation"}>
              Abbrechen
            </Link>
          </Button>
          <Button type="submit" disabled={isPending || isUploading}>
            {isPending ? "Speichern…" : mode === "edit" ? "Speichern" : "Anlegen"}
          </Button>
        </div>
      </form>
    </div>
  );
}
