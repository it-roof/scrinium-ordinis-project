/** Feste Farbtöne für Dokumentations-Kategorien (DB-Wert). */
export const DOC_TAG_TONES = [
  "sky",
  "violet",
  "amber",
  "rose",
  "emerald",
  "orange",
  "teal",
  "fuchsia",
  "lime",
  "indigo",
] as const;

export type DocTagTone = (typeof DOC_TAG_TONES)[number];

const TONE_CLASSES: Record<DocTagTone, string> = {
  sky: "bg-sky-100/90 text-sky-900",
  violet: "bg-violet-100/90 text-violet-900",
  amber: "bg-amber-100/90 text-amber-950",
  rose: "bg-rose-100/90 text-rose-900",
  emerald: "bg-emerald-100/90 text-emerald-900",
  orange: "bg-orange-100/90 text-orange-950",
  teal: "bg-teal-100/90 text-teal-900",
  fuchsia: "bg-fuchsia-100/90 text-fuchsia-900",
  lime: "bg-lime-100/90 text-lime-900",
  indigo: "bg-indigo-100/90 text-indigo-900",
};

const TONE_RING_CLASSES: Record<DocTagTone, string> = {
  sky: "ring-sky-500",
  violet: "ring-violet-500",
  amber: "ring-amber-500",
  rose: "ring-rose-500",
  emerald: "ring-emerald-500",
  orange: "ring-orange-500",
  teal: "ring-teal-500",
  fuchsia: "ring-fuchsia-500",
  lime: "ring-lime-600",
  indigo: "ring-indigo-500",
};

export function isDocTagTone(value: string): value is DocTagTone {
  return (DOC_TAG_TONES as readonly string[]).includes(value);
}

export function docTagToneClass(tone: string): string {
  if (isDocTagTone(tone)) return TONE_CLASSES[tone];
  return TONE_CLASSES.sky;
}

export function docTagToneRingClass(tone: string): string {
  if (isDocTagTone(tone)) return TONE_RING_CLASSES[tone];
  return TONE_RING_CLASSES.sky;
}

/** Nächste freie Farbe im Tenant (rotiert, wenn alle belegt). */
export function pickNextDocTagTone(used: readonly string[]): DocTagTone {
  const usedSet = new Set(
    used.filter(isDocTagTone) as DocTagTone[]
  );

  for (const tone of DOC_TAG_TONES) {
    if (!usedSet.has(tone)) return tone;
  }

  return DOC_TAG_TONES[used.length % DOC_TAG_TONES.length];
}

/** CSS-Klasse für bekannte Tags; neue Namen bekommen eine Vorschau-Farbe. */
export function createDocTagToneResolver(
  known: readonly { name: string; color: string }[]
): (name: string) => string {
  const byKey = new Map(
    known.map((tag) => [tag.name.toLowerCase(), tag.color] as const)
  );
  const preview = new Map<string, DocTagTone>();

  return (name: string) => {
    const key = name.toLowerCase();
    const stored = byKey.get(key);
    if (stored) return docTagToneClass(stored);

    let tone = preview.get(key);
    if (!tone) {
      tone = pickNextDocTagTone([
        ...byKey.values(),
        ...preview.values(),
      ]);
      preview.set(key, tone);
    }
    return docTagToneClass(tone);
  };
}
