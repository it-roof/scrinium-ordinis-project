const MAX_TAG_LENGTH = 50;
const MAX_TAGS_PER_PROMPT = 20;

/** Stabile Pastellfarbe pro Tag-Name (gleicher Name → gleiche Farbe). */
const TAG_BADGE_TONES = [
  "bg-sky-100/90 text-sky-900",
  "bg-violet-100/90 text-violet-900",
  "bg-amber-100/90 text-amber-950",
  "bg-rose-100/90 text-rose-900",
  "bg-emerald-100/90 text-emerald-900",
  "bg-orange-100/90 text-orange-950",
  "bg-teal-100/90 text-teal-900",
  "bg-fuchsia-100/90 text-fuchsia-900",
  "bg-lime-100/90 text-lime-900",
  "bg-indigo-100/90 text-indigo-900",
] as const;

export function tagBadgeClass(name: string): string {
  const key = tagKey(name);
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return TAG_BADGE_TONES[Math.abs(hash) % TAG_BADGE_TONES.length];
}

export function normalizeTagName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");

  if (!name || name.length > MAX_TAG_LENGTH) {
    return null;
  }

  return name;
}

export function normalizeTagList(tagNames: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of tagNames) {
    const name = normalizeTagName(raw);

    if (!name) continue;

    const key = name.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(name);

    if (result.length >= MAX_TAGS_PER_PROMPT) break;
  }

  return result;
}

export function tagKey(name: string): string {
  return name.toLowerCase();
}
