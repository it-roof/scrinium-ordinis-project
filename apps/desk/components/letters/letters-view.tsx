"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  DownloadIcon,
  FileTextIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { useAreaBasePath } from "@/lib/area/use-area-path";
import { deleteLetter } from "@/lib/letters/actions";
import {
  exportLetterDocx,
  exportLetterPdf,
} from "@/lib/letters/export-actions";
import {
  LETTER_KIND_LABELS,
  LETTER_STATUS_LABELS,
  type LetterRecord,
} from "@/lib/letters/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function downloadBase64(filename: string, mimeType: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

type FilterId = "alle" | "mir" | "pruefung";

export function LettersView({
  initialItems,
  currentUserId,
}: {
  initialItems: LetterRecord[];
  currentUserId: string;
}) {
  const router = useRouter();
  const basePath = useAreaBasePath() ?? "";
  const lettersBase = `${basePath}/schreiben`;
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<FilterId>("alle");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const list = [...items].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
    if (filter === "mir") {
      return list.filter((item) => item.assignedTo === currentUserId);
    }
    if (filter === "pruefung") {
      return list.filter((item) => item.status === "zur_pruefung");
    }
    return list;
  }, [currentUserId, filter, items]);

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteLetter(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Schreiben gelöscht.");
      router.refresh();
    });
  }

  function handleExport(id: string, format: "pdf" | "docx") {
    startTransition(async () => {
      const result =
        format === "pdf"
          ? await exportLetterPdf(id)
          : await exportLetterDocx(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      downloadBase64(result.filename, result.mimeType, result.base64);
      toast.success(format === "pdf" ? "PDF erstellt." : "Word erstellt.");
    });
  }

  const filters: { id: FilterId; label: string }[] = [
    { id: "alle", label: "Alle" },
    { id: "mir", label: "Mir zugewiesen" },
    { id: "pruefung", label: "Zur Prüfung" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <PageHeader
        title="Schreiben"
        description="Entwürfe bearbeiten, delegieren, freigeben und versenden."
      >
        <Button asChild className="h-10 rounded-none px-4">
          <Link href={`${lettersBase}/neu`}>
            <PlusIcon data-icon="inline-start" />
            Neu
          </Link>
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {filters.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setFilter(entry.id)}
            className={cn(
              "rounded-none border px-3 py-2 text-sm transition-colors",
              filter === entry.id
                ? "border-foreground bg-muted/40"
                : "border-border/70 text-muted-foreground hover:border-foreground/25 hover:text-foreground"
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="surface-card border-dashed p-10 text-center text-sm text-muted-foreground">
          {items.length === 0
            ? "Noch keine Schreiben. Lege einen Entwurf an oder füge eine .md-Datei aus der KI ein."
            : "Keine Einträge in diesem Filter."}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li
              key={item.id}
              className={cn(
                "surface-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              )}
            >
              <div className="min-w-0 space-y-1">
                <Link
                  href={`${lettersBase}/${item.id}/bearbeiten`}
                  className="font-heading text-lg font-medium tracking-tight hover:underline"
                >
                  {item.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {LETTER_KIND_LABELS[item.kind]}
                  {item.subject ? ` · ${item.subject}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {LETTER_STATUS_LABELS[item.status]}
                  {item.assignedToName
                    ? ` · ${item.assignedToName}`
                    : ""}
                  {item.assignedTo === currentUserId ? " · mir" : ""}
                  {item.clientName ? ` · ${item.clientName}` : ""}
                  {item.matterTitle ? ` · ${item.matterTitle}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleExport(item.id, "pdf")}
                  className="rounded-none"
                >
                  <FileTextIcon data-icon="inline-start" />
                  PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleExport(item.id, "docx")}
                  className="rounded-none"
                >
                  <DownloadIcon data-icon="inline-start" />
                  Word
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDelete(item.id)}
                  className="rounded-none text-destructive"
                >
                  <Trash2Icon data-icon="inline-start" />
                  Löschen
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
