/** Prompt-Kit: Abschnitte + Diktat-Session (Blöcke). */

export type DictationBlock =
  | { id: string; type: "section"; text: string }
  | { id: string; type: "speech"; text: string; interim?: string };

export function normalizeSectionInsert(insert: string): string {
  return `${insert.replace(/\s*$/, "").replace(/:$/, "")}: `;
}

export function sectionMarker(insert: string): string {
  return normalizeSectionInsert(insert).trim();
}

/** Abschnitt fest in den Chat-Text (ohne Diktat-Session). */
export function appendSectionToInput(text: string, insert: string): string {
  const normalized = normalizeSectionInsert(insert);
  const marker = normalized.trim();
  if (!marker || text.includes(marker)) {
    return text;
  }
  if (!text.trim()) {
    return normalized;
  }
  return `${text.replace(/\s*$/, "")}\n${normalized}`;
}

export function sectionIsPresent(text: string, insert: string): boolean {
  const marker = sectionMarker(insert);
  return Boolean(marker) && text.includes(marker);
}

export function sessionHasSection(
  blocks: DictationBlock[],
  insert: string
): boolean {
  const marker = sectionMarker(insert);
  return blocks.some(
    (block) => block.type === "section" && block.text.trim() === marker
  );
}

function mergeSpeechAfter(base: string, spoken: string): string {
  const speech = spoken.trim();
  if (!speech) {
    return base;
  }
  if (!base) {
    return speech;
  }
  if (/:\s*$/.test(base)) {
    return `${base.replace(/\s*$/, "")} ${speech}`;
  }
  if (/\s$/.test(base)) {
    return `${base}${speech}`;
  }
  return `${base.trimEnd()} ${speech}`;
}

export function speechDisplayText(block: Extract<DictationBlock, { type: "speech" }>) {
  return [block.text.trim(), block.interim?.trim()].filter(Boolean).join(" ");
}

/** Gesamten Session-Inhalt als einen String (für Übernehmen). */
export function flattenBlocks(blocks: DictationBlock[]): string {
  let result = "";
  for (const block of blocks) {
    if (block.type === "section") {
      result = appendSectionToInput(result, block.text);
      continue;
    }
    const spoken = speechDisplayText(block);
    if (!spoken) {
      continue;
    }
    result = mergeSpeechAfter(result, spoken);
  }
  return result;
}

export function mergeSessionIntoInput(
  baseInput: string,
  blocks: DictationBlock[]
): string {
  const session = flattenBlocks(blocks);
  if (!session.trim()) {
    return baseInput;
  }
  if (!baseInput.trim()) {
    return session;
  }
  if (/:\s*$/.test(baseInput) || /\s$/.test(baseInput)) {
    return mergeSpeechAfter(baseInput, session);
  }
  // Neuer Abschnitt / Fließtext nach bestehendem Chat
  if (session.startsWith("\n") || /^.+:\s/.test(session)) {
    return `${baseInput.replace(/\s*$/, "")}\n${session.replace(/^\n/, "")}`;
  }
  return mergeSpeechAfter(baseInput, session);
}

export function addSectionToSession(
  blocks: DictationBlock[],
  insert: string
): DictationBlock[] {
  const text = normalizeSectionInsert(insert);
  const marker = text.trim();
  if (!marker || sessionHasSection(blocks, insert)) {
    return blocks;
  }
  return [
    ...blocks,
    { id: createBlockId(), type: "section", text },
  ];
}

/** Speech anhängen, ohne dass dasselbe Transkript nochmal landet. */
export function appendUniqueSpeech(existing: string, incoming: string): string {
  const prev = existing.trim();
  const next = incoming.trim();
  if (!next) {
    return prev;
  }
  if (!prev) {
    return next;
  }
  if (next === prev || prev.endsWith(next)) {
    return prev;
  }
  // Chrome liefert oft die komplette Äußerung erneut als längeres Final
  if (next.startsWith(prev)) {
    return next;
  }
  return `${prev} ${next}`;
}

/** Finale/Interim-Erkennung in den letzten Speech-Block schreiben. */
export function applySpeechResult(
  blocks: DictationBlock[],
  finalChunk: string,
  interimChunk: string
): DictationBlock[] {
  const finalText = finalChunk.trim();
  const interimText = interimChunk.trim();
  if (!finalText && !interimText) {
    return blocks;
  }

  const next = [...blocks];
  const last = next[next.length - 1];

  if (last?.type === "speech") {
    const text = finalText
      ? appendUniqueSpeech(last.text, finalText)
      : last.text;
    // Interim nur zeigen, wenn es über dem Final hinausgeht
    const interim =
      interimText &&
      interimText !== text &&
      !text.endsWith(interimText) &&
      !interimText.startsWith(text)
        ? interimText
        : interimText && interimText.startsWith(text) && interimText !== text
          ? interimText.slice(text.length).trim() || undefined
          : undefined;
    next[next.length - 1] = {
      ...last,
      text,
      interim,
    };
    return next;
  }

  // Neuer Speech-Block (typisch direkt nach Abschnitt) — nur frischen Text
  next.push({
    id: createBlockId(),
    type: "speech",
    text: finalText,
    interim: interimText && interimText !== finalText ? interimText : undefined,
  });
  return next;
}

export function finalizeSpeechInterims(
  blocks: DictationBlock[]
): DictationBlock[] {
  return blocks.map((block) => {
    if (block.type !== "speech" || !block.interim?.trim()) {
      return block;
    }
    const text = [block.text.trim(), block.interim.trim()]
      .filter(Boolean)
      .join(" ");
    return { id: block.id, type: "speech", text };
  });
}

function createBlockId() {
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Prefix vor einem Block in der Preview (Zeilenumbruch / Leerzeichen). */
export function blockJoinPrefix(
  baseInput: string,
  blocks: DictationBlock[],
  index: number
): string {
  const prior = mergeSessionIntoInput(baseInput, blocks.slice(0, index));
  const block = blocks[index];
  if (!block) {
    return "";
  }
  if (!prior) {
    return "";
  }
  if (block.type === "section") {
    return prior.endsWith("\n") ? "" : "\n";
  }
  if (/:\s*$/.test(prior)) {
    return prior.endsWith(" ") ? "" : " ";
  }
  if (/\s$/.test(prior)) {
    return "";
  }
  return " ";
}
