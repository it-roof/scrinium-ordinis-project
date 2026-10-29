"use client";

import { FileTextIcon, UploadIcon } from "lucide-react";
import { useState, type DragEvent } from "react";

import { uploadMatterFilesAction } from "@/lib/matters/files-actions";
import {
  formatFileSize,
  MAX_MATTER_FILES_PER_UPLOAD,
  validateMatterFileMeta,
  type MatterFileRecord,
} from "@/lib/matters/files-types";
import { formatMatterDate } from "@/lib/matters/gallery";
import { cn } from "@/lib/utils";

export function mergeMatterFiles(
  current: MatterFileRecord[],
  added: MatterFileRecord[]
): MatterFileRecord[] {
  const map = new Map(current.map((file) => [file.id, file]));
  for (const file of added) map.set(file.id, file);
  return [...map.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

export function MatterDocuments({
  matterId,
  files,
  onFiles,
}: {
  matterId: string;
  files: MatterFileRecord[];
  onFiles: (files: MatterFileRecord[]) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addFiles(incoming: File[]) {
    if (uploading || incoming.length === 0) return;
    setError(null);
    const accepted: File[] = [];
    for (const file of incoming) {
      const metaError = validateMatterFileMeta(file.name, file.size);
      if (metaError) {
        setError(metaError);
        continue;
      }
      if (accepted.length >= MAX_MATTER_FILES_PER_UPLOAD) {
        setError(`Maximal ${MAX_MATTER_FILES_PER_UPLOAD} Dateien.`);
        break;
      }
      accepted.push(file);
    }
    if (accepted.length === 0) return;

    const formData = new FormData();
    formData.set("matterId", matterId);
    for (const file of accepted) formData.append("files", file);
    setUploading(true);
    const result = await uploadMatterFilesAction(formData);
    setUploading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onFiles(mergeMatterFiles(files, result.data));
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragOver(false);
    void addFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <section className="mt-10">
      <h2 className="text-[13px] font-medium">Dokumente</h2>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "mt-3 rounded-2xl border border-dashed px-4 text-center transition-colors",
          files.length === 0 ? "py-8" : "py-4",
          dragOver
            ? "border-foreground/40 bg-muted/80"
            : "border-border bg-muted/40"
        )}
      >
        <UploadIcon className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-2 text-[13px]">
          {uploading ? "Wird abgelegt…" : "Dokumente hierher ziehen"}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          PDF, Word oder Bild — max. 10 Dateien, 50 MB.
        </p>
        <label className="mt-3 inline-flex h-8 cursor-pointer items-center rounded-full bg-foreground px-3 text-[12px] font-medium text-background">
          Dateien wählen
          <input
            type="file"
            multiple
            className="sr-only"
            disabled={uploading}
            accept=".pdf,.doc,.docx,.odt,.rtf,.txt,.png,.jpg,.jpeg,.webp"
            onChange={(event) => {
              void addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {files.length > 0 ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {files.map((file) => (
            <li key={file.id}>
              <a
                href={`/api/matters/files/${file.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-2xl bg-muted/70 px-3.5 py-3 hover:bg-muted"
              >
                <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px]">
                    {file.filename}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-muted-foreground">
                    {formatFileSize(file.sizeBytes)} ·{" "}
                    {formatMatterDate(file.updatedAt)}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
