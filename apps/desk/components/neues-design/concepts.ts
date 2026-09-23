export const DESIGN_CONCEPTS = [
  {
    id: "alba-manrope",
    name: "Alba Manrope",
    brand: "ALBA · MANROPE",
    thesis: "Weiche Geometric-Sans — Manrope durchgängig. Ruhig und klar.",
    vibe: "Quiet luxury ohne Serifen.",
    fonts: "Manrope",
    palette: "Alabaster / Ink / Taupe",
  },
] as const;

export type DesignConceptId = (typeof DESIGN_CONCEPTS)[number]["id"];

export function isDesignConceptId(value: string): value is DesignConceptId {
  return DESIGN_CONCEPTS.some((c) => c.id === value);
}
