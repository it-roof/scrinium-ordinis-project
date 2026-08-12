import type { ContentModule } from "@/lib/db/schema";
import {
  CONTENT_MODULES,
  getModuleLabel,
} from "@/lib/text-blocks/types";

export type { ContentModule };
export { CONTENT_MODULES, getModuleLabel };

export type DocTag = {
  id: string;
  name: string;
  color: string;
};

export type DocPage = {
  id: string;
  title: string;
  slug: string;
  content: string;
  parentId: string | null;
  sortOrder: number;
  module: ContentModule;
  tags: DocTag[];
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
  module: ContentModule;
  tags: string[];
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
