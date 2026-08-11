const MAX_TAG_LENGTH = 50;
const MAX_TAGS_PER_PROMPT = 20;

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
