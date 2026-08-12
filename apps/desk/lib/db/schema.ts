import {
  type AnyPgColumn,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { AppModuleId } from "@/lib/modules";
import { ALL_APP_MODULE_IDS } from "@/lib/modules";

export const moduleEnum = pgEnum("module", [
  "general",
  "tax",
  "legal",
  "restructuring-insolvency",
  "consulting",
]);

export const roleEnum = pgEnum("user_role", ["admin", "employee"]);

/** Plattform-weit (nicht Kanzlei-Admin). Nur Tenant-/User-Verwaltung, keine Fachdaten anderer Tenants. */
export const platformRoleEnum = pgEnum("platform_role", ["super_admin"]);

/** Eine Kanzlei = ein Tenant auf der Multi-Tenant-Plattform. */
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  /** Optional: UI-Label statt „Scrinium Ordinis“ (White-Label nach Login). */
  brandName: text("brand_name"),
  /** Optional: eine Custom-Domain pro Kanzlei (Host → Tenant). */
  customDomain: text("custom_domain").unique(),
  /** Freigeschaltete App-Module (ohne Start — Start ist immer da). */
  enabledModules: jsonb("enabled_modules")
    .$type<AppModuleId[]>()
    .notNull()
    .default([...ALL_APP_MODULE_IDS]),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("employee"),
  platformRole: platformRoleEnum("platform_role"),
  module: moduleEnum("module"),
  /**
   * Optional: erlaubte Fachmodule für diesen User.
   * null = alle Module der Kanzlei; sonst Schnittmenge mit tenants.enabled_modules.
   */
  allowedModules: jsonb("allowed_modules").$type<AppModuleId[] | null>(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compositePk: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  })
);

export const textBlocks = pgTable("text_blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  module: moduleEnum("module").notNull().default("general"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const prompts = pgTable("prompts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const promptTags = pgTable(
  "prompt_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantNameUnique: uniqueIndex("prompt_tags_tenant_name_unique").on(
      table.tenantId,
      table.name
    ),
  })
);

export const promptTagAssignments = pgTable(
  "prompt_tag_assignments",
  {
    promptId: uuid("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => promptTags.id, { onDelete: "cascade" }),
  },
  (assignment) => ({
    compositePk: primaryKey({
      columns: [assignment.promptId, assignment.tagId],
    }),
  })
);

export const docPages = pgTable(
  "doc_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    content: text("content").notNull().default(""),
    parentId: uuid("parent_id").references((): AnyPgColumn => docPages.id, {
      onDelete: "cascade",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    module: moduleEnum("module").notNull().default("general"),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantSlugUnique: uniqueIndex("doc_pages_tenant_slug_unique").on(
      table.tenantId,
      table.slug
    ),
  })
);

export const docTags = pgTable(
  "doc_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Farbton-Key, z. B. sky / violet — siehe lib/docs/tag-colors.ts */
    color: text("color").notNull().default("sky"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantNameUnique: uniqueIndex("doc_tags_tenant_name_unique").on(
      table.tenantId,
      table.name
    ),
  })
);

export const docTagAssignments = pgTable(
  "doc_tag_assignments",
  {
    pageId: uuid("page_id")
      .notNull()
      .references(() => docPages.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => docTags.id, { onDelete: "cascade" }),
  },
  (assignment) => ({
    compositePk: primaryKey({
      columns: [assignment.pageId, assignment.tagId],
    }),
  })
);

export const docAssets = pgTable("doc_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull().unique(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

/** Vorlagen (z. B. Vollmacht, Fragebogen) — Katalogeintrag mit einer oder mehreren Dateien. */
export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  module: moduleEnum("module").notNull().default("tax"),
  createdBy: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const templateFiles = pgTable("template_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull().unique(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const authLoginAttempts = pgTable("auth_login_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type UserRole = (typeof roleEnum.enumValues)[number];
export type PlatformRole = (typeof platformRoleEnum.enumValues)[number];
export type ContentModule = (typeof moduleEnum.enumValues)[number];
