export const DEPARTMENTS = [
  { value: "general", label: "Allgemein" },
  { value: "tax", label: "Steuerberatung" },
  { value: "legal", label: "Recht" },
  { value: "restructuring-insolvency", label: "Sanierung & Insolvenz" },
  { value: "consulting", label: "Unternehmensberatung" },
] as const;

export type Department = (typeof DEPARTMENTS)[number]["value"];

export type TextBlock = {
  id: string;
  title: string;
  content: string;
  department: Department;
  createdAt: string;
  updatedAt: string;
};

export type TextBlockInput = {
  title: string;
  content: string;
  department: Department;
};

export function getDepartmentLabel(department: Department): string {
  return DEPARTMENTS.find((entry) => entry.value === department)?.label ?? department;
}
