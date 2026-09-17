export type PromptTag = {
  id: string;
  name: string;
};

export type PromptTagWithCount = PromptTag & {
  promptCount: number;
};

export type Prompt = {
  id: string;
  /** Katalog-Nummer innerhalb der Kanzlei. */
  number: number;
  title: string;
  content: string;
  tags: PromptTag[];
  createdAt: string;
  updatedAt: string;
};

export type PromptInput = {
  /** null = nächste freie Nummer vergeben (nur Anlegen). */
  number: number | null;
  title: string;
  content: string;
  tags: string[];
};

/** Anzeige z. B. 01, 02, 12, 100 */
export function formatPromptNumber(value: number): string {
  return String(value).padStart(2, "0");
}
