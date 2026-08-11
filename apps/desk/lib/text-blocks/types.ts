export const CONTENT_MODULES = [
  { value: "general", label: "Allgemein" },
  { value: "legal", label: "Recht" },
  { value: "tax", label: "Steuer" },
  { value: "restructuring-insolvency", label: "Sanierung & Insolvenz" },
  { value: "consulting", label: "Beratung" },
] as const;

export type ContentModule = (typeof CONTENT_MODULES)[number]["value"];

export type TextBlock = {
  id: string;
  title: string;
  content: string;
  module: ContentModule;
  createdAt: string;
  updatedAt: string;
};

export type TextBlockInput = {
  title: string;
  content: string;
  module: ContentModule;
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
