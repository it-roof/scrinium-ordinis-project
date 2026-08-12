import type { ContentModule } from "@/lib/db/schema";

export type TemplateFile = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sortOrder: number;
  createdAt: string;
};

export type Template = {
  id: string;
  title: string;
  description: string;
  module: ContentModule;
  files: TemplateFile[];
  createdAt: string;
  updatedAt: string;
};

export type TemplateInput = {
  title: string;
  description: string;
  module: ContentModule;
};

/** Max. 50 MB pro Datei — alle Typen erlaubt. */
export const MAX_TEMPLATE_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_FILES_PER_TEMPLATE = 20;

export function validateTemplateFile(file: File): string | null {
  if (!file.name.trim()) {
    return "Dateiname fehlt.";
  }
  if (file.size <= 0) {
    return "Leere Dateien sind nicht erlaubt.";
  }
  if (file.size > MAX_TEMPLATE_FILE_BYTES) {
    return "Dateien dürfen maximal 50 MB groß sein.";
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
