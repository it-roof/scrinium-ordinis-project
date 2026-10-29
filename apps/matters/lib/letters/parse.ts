export type ParsedLetterDraft = {
  title: string;
  salutation: string;
  body: string;
  closing: string;
};

/** Best-effort parse of TITEL / ANREDE / TEXT / SCHLUSS. */
export function parseCreateLetterOutput(raw: string): ParsedLetterDraft {
  const text = raw.trim();
  const titleMatch = text.match(/^TITEL:\s*(.+)$/im);
  const salutationMatch = text.match(/^ANREDE:\s*(.+)$/im);
  const closingMatch = text.match(/^SCHLUSS:\s*(.+)$/im);

  let body = "";
  const textStart = text.search(/^TEXT:\s*/im);
  if (textStart >= 0) {
    const afterLabel = text.slice(textStart).replace(/^TEXT:\s*/i, "");
    const schlussIdx = afterLabel.search(/^SCHLUSS:\s*/im);
    body = (schlussIdx >= 0 ? afterLabel.slice(0, schlussIdx) : afterLabel).trim();
  }

  const title = (titleMatch?.[1] ?? "Schreiben").trim().slice(0, 200);
  const salutation = (salutationMatch?.[1] ?? "").trim();
  const closing = (closingMatch?.[1] ?? "").trim();
  if (!body) {
    body = text;
  }

  return { title, salutation, body, closing };
}

export function formatLetterPreview(letter: {
  title: string;
  salutation: string;
  body: string;
  closing: string;
}): string {
  return [
    letter.title,
    letter.salutation,
    letter.body,
    letter.closing,
  ]
    .filter((part) => part.trim())
    .join("\n\n");
}
