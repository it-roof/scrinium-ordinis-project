import type { Department } from "@/lib/db/schema";
import {
  DEPARTMENTS,
  getDepartmentLabel,
} from "@/lib/text-blocks/types";

export type { Department };
export { DEPARTMENTS, getDepartmentLabel };

export type DocPage = {
  id: string;
  title: string;
  slug: string;
  content: string;
  parentId: string | null;
  sortOrder: number;
  department: Department;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocPageTreeNode = DocPage & {
  children: DocPage[];
};

export type DocPageInput = {
  title: string;
  slug?: string;
  content: string;
  parentId: string | null;
  sortOrder?: number;
  department: Department;
};

export type DocAsset = {
  id: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
};
