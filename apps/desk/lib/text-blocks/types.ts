export const CONTENT_MODULES = [
  { value: "general", label: "Allgemein" },
  { value: "legal", label: "Recht" },
  { value: "tax", label: "Steuer" },
  { value: "restructuring-insolvency", label: "Sanierung & Insolvenz" },
  { value: "consulting", label: "Beratung" },
  { value: "administration", label: "Verwaltung" },
] as const;

export type ContentModule = (typeof CONTENT_MODULES)[number]["value"];

export type TextBlockTag = {
  id: string;
  name: string;
};

export type TextBlock = {
  id: string;
  title: string;
  content: string;
  module: ContentModule;
  tags: TextBlockTag[];
  createdAt: string;
  updatedAt: string;
};

export type TextBlockInput = {
  title: string;
  content: string;
  module: ContentModule;
  tags: string[];
};

export type ContentModuleOption = (typeof CONTENT_MODULES)[number];

export function getModuleLabel(module: ContentModule): string {
  return CONTENT_MODULES.find((entry) => entry.value === module)?.label ?? module;
}

export function filterModulesForEnabled(
  enabledModules: readonly string[]
): ContentModuleOption[] {
  return CONTENT_MODULES.filter(
    (entry) =>
      entry.value === "general" || enabledModules.includes(entry.value)
  );
}
