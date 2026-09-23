import {
  type AnyPgColumn,
  boolean,
  date,
  index,
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
  "administration",
  "notary",
]);

export const roleEnum = pgEnum("user_role", ["admin", "employee"]);

/** Kanzlei-Position (Schreibtisch / Funktionen) — getrennt von admin/employee. */
export const deskRoleEnum = pgEnum("desk_role", [
  "rechtsanwalt",
  "sekretariat",
  "steuerberater",
  "stb_sekretariat",
]);

/** Formelle Anrede für Begrüßung (Herr / Frau). */
export const userSalutationEnum = pgEnum("user_salutation", ["herr", "frau"]);

/** Standard-Übersicht auf dem Dashboard (Schnellzugriff / Alle Funktionen). */
export const dashboardViewEnum = pgEnum("dashboard_view", ["quick", "all"]);

/** Mandant: Firma oder Privatperson. */
export const clientKindEnum = pgEnum("client_kind", ["company", "person"]);

/** Plattform-weit (nicht Kanzlei-Admin). Nur Tenant-/User-Verwaltung, keine Fachdaten anderer Tenants. */
export const platformRoleEnum = pgEnum("platform_role", ["super_admin"]);

/** Workflow-Status für Schreiben (Delegation / Freigabe / Versand). */
export const letterStatusEnum = pgEnum("letter_status", [
  "entwurf",
  "zur_pruefung",
  "freigegeben",
  "versendet",
]);

/** Rolle einer Partei an der Akte (Gegner / Beteiligter / Sonstige). */
export const matterPartyRoleEnum = pgEnum("matter_party_role", [
  "opponent",
  "party",
  "other",
]);

/** KI-Einwilligung des Mandanten (Historie; neuester Eintrag gilt). */
export const aiConsentStatusEnum = pgEnum("ai_consent_status", [
  "granted",
  "revoked",
]);

/** Status eines asynchronen KI-Jobs. */
export const aiJobStatusEnum = pgEnum("ai_job_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
]);

/** Pipeline timeline for AI_DEBUG (pseudonymized text only). */
export type AiDebugStep = {
  at: string;
  step: string;
  detail?: string;
};

export type AiDebugTrace = {
  steps: AiDebugStep[];
  /** Pseudonymized user message sent to the model — never plaintext PII. */
  pseudonymizedUserMessage?: string;
  /** Model reply still with placeholders (before repersonalize). */
  rawModelResponse?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  placeholderCount?: number;
  unknownPlaceholders?: string[];
  errorCode?: string;
};

/** Status eines KI-Entwurfs (Freigabe durch Anwalt). */
export const aiDraftStatusEnum = pgEnum("ai_draft_status", [
  "draft",
  "approved",
  "discarded",
]);

/** Priorität interner Aufgaben (Absender setzt). */
export const staffMessagePriorityEnum = pgEnum("staff_message_priority", [
  "sofort",
  "heute",
  "diese_woche",
  "keine",
  "andere",
]);

/** Absicht: wozu der Ball bei der Person liegt. */
export const staffMessageIntentEnum = pgEnum("staff_message_intent", [
  "erledigen",
  "pruefen",
  "kenntnis",
  "warten",
]);

/** Protokoll-Ereignis (schlanke History). */
export const staffMessageEventKindEnum = pgEnum("staff_message_event_kind", [
  "angelegt",
  "uebergeben",
  "abgeschlossen",
  "wiedereroeffnet",
]);

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
  /** Anzeigename (Auth.js / Session) — immer aus firstName + lastName ableiten. */
  name: text("name").notNull(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  /** Formelle Anrede: Herr / Frau (für Begrüßung). */
  salutation: userSalutationEnum("salutation"),
  /** Standard-Dashboard: Schnellzugriff oder Alle Funktionen. */
  dashboardView: dashboardViewEnum("dashboard_view").notNull().default("quick"),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("employee"),
  /**
   * Position in der Kanzlei (Rechtsanwalt / Sekretär(in)).
   * Steuert Schreibtisch und Funktionszugriff. null = noch nicht gesetzt
   * (alle Funktionen der freigeschalteten Bereiche, sofern keine Allowlist).
   */
  deskRole: deskRoleEnum("desk_role"),
  platformRole: platformRoleEnum("platform_role"),
  module: moduleEnum("module"),
  /**
   * Optional: erlaubte Fachmodule für diesen User.
   * null = alle Module der Kanzlei; sonst Schnittmenge mit tenants.enabled_modules.
   */
  allowedModules: jsonb("allowed_modules").$type<AppModuleId[] | null>(),
  /**
   * Optional: erlaubte App-Funktionen (z. B. Prompt-Bibliothek nur für Anwälte).
   * null = alle Funktionen der freigeschalteten Bereiche; sonst Allowlist.
   */
  allowedFunctions: jsonb("allowed_functions").$type<string[] | null>(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  /** gesetzt = Benutzer deaktiviert (kein Login, nicht in Empfängerlisten). */
  disabledAt: timestamp("disabled_at", { withTimezone: true, mode: "string" }),
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

export const textBlockTags = pgTable(
  "text_block_tags",
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
    tenantNameUnique: uniqueIndex("text_block_tags_tenant_name_unique").on(
      table.tenantId,
      table.name
    ),
  })
);

export const textBlockTagAssignments = pgTable(
  "text_block_tag_assignments",
  {
    textBlockId: uuid("text_block_id")
      .notNull()
      .references(() => textBlocks.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => textBlockTags.id, { onDelete: "cascade" }),
  },
  (assignment) => ({
    compositePk: primaryKey({
      columns: [assignment.textBlockId, assignment.tagId],
    }),
  })
);

export const prompts = pgTable(
  "prompts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** Katalog-Nummer innerhalb der Kanzlei (für Sortierung / Referenz). */
    promptNumber: integer("prompt_number").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantPromptNumberUnique: uniqueIndex(
      "prompts_tenant_prompt_number_unique"
    ).on(table.tenantId, table.promptNumber),
  })
);

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

/** Einmal-Token für Passwort-Reset per E-Mail-Link. Nur Hash speichern. */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("password_reset_tokens_token_hash_unique").on(
      table.tokenHash
    ),
    userIdIdx: index("password_reset_tokens_user_id_idx").on(table.userId),
  })
);

/**
 * Persönliche SMTP-Zugangsdaten pro Benutzer (Versand „als ich selbst“).
 * Felder optional — schrittweises Ausfüllen. Passwort nur verschlüsselt.
 * App filtert immer auf Session-user_id.
 */
export const userSmtpSettings = pgTable(
  "user_smtp_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    host: text("host"),
    port: integer("port"),
    username: text("username"),
    passwordEncrypted: text("password_encrypted"),
    fromName: text("from_name"),
    fromEmail: text("from_email"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdUnique: uniqueIndex("user_smtp_settings_user_id_unique").on(
      table.userId
    ),
    tenantIdIdx: index("user_smtp_settings_tenant_id_idx").on(table.tenantId),
  })
);

/** Mandant = Firma oder Privatperson (Stammdaten, bereichsgetrennt). */
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    module: moduleEnum("module").notNull().default("legal"),
    kind: clientKindEnum("kind").notNull().default("company"),
    /**
     * Anzeigename: Firmenname bzw. „Vorname Nachname“ bei Privatperson
     * (für Liste/Suche, wird bei Privatperson aus Vor-/Nachname gesetzt).
     */
    name: text("name").notNull(),
    salutation: text("salutation").notNull().default(""),
    firstName: text("first_name").notNull().default(""),
    lastName: text("last_name").notNull().default(""),
    street: text("street").notNull().default(""),
    postalCode: text("postal_code").notNull().default(""),
    city: text("city").notNull().default(""),
    country: text("country").notNull().default("Deutschland"),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    mobile: text("mobile").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdBy: uuid("created_by").references(() => users.id, {
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
    tenantIdIdx: index("clients_tenant_id_idx").on(table.tenantId),
    moduleIdx: index("clients_module_idx").on(table.module),
    kindIdx: index("clients_kind_idx").on(table.kind),
  })
);

/** Kontaktperson einer Firma (nur bei clients.kind = company). */
export const clientPersons = pgTable(
  "client_persons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    /** Anrede, z. B. Herr / Frau */
    salutation: text("salutation").notNull().default(""),
    firstName: text("first_name").notNull().default(""),
    lastName: text("last_name").notNull().default(""),
    /** Rolle / Funktion in der Firma, z. B. Geschäftsführer */
    role: text("role").notNull().default(""),
    street: text("street").notNull().default(""),
    postalCode: text("postal_code").notNull().default(""),
    city: text("city").notNull().default(""),
    country: text("country").notNull().default("Deutschland"),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    mobile: text("mobile").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdBy: uuid("created_by").references(() => users.id, {
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
    tenantIdIdx: index("client_persons_tenant_id_idx").on(table.tenantId),
    clientIdIdx: index("client_persons_client_id_idx").on(table.clientId),
  })
);

/** Akte / Mandat — mehrere pro Mandant (Firma oder Privatperson). */
export const matters = pgTable(
  "matters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    module: moduleEnum("module").notNull().default("legal"),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    reference: text("reference").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdBy: uuid("created_by").references(() => users.id, {
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
    tenantIdIdx: index("matters_tenant_id_idx").on(table.tenantId),
    clientIdIdx: index("matters_client_id_idx").on(table.clientId),
    moduleIdx: index("matters_module_idx").on(table.module),
  })
);

/**
 * Gegner / Beteiligte / Sonstige an einer Akte.
 * Mandant kommt indirekt über matters.client_id.
 */
export const matterParties = pgTable(
  "matter_parties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    role: matterPartyRoleEnum("role").notNull().default("opponent"),
    kind: clientKindEnum("kind").notNull().default("company"),
    name: text("name").notNull(),
    firstName: text("first_name").notNull().default(""),
    lastName: text("last_name").notNull().default(""),
    street: text("street").notNull().default(""),
    postalCode: text("postal_code").notNull().default(""),
    city: text("city").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantMatterIdx: index("matter_parties_tenant_matter_idx").on(
      table.tenantId,
      table.matterId
    ),
  })
);

/**
 * KI-Einwilligung des Mandanten — jeder Statuswechsel = neuer Eintrag.
 * Maßgeblich ist der neueste Eintrag je (tenant_id, client_id).
 */
export const aiConsents = pgTable(
  "ai_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    status: aiConsentStatusEnum("status").notNull(),
    /** Ausdrücklicher Verzicht nach § 43e Abs. 6 BRAO. */
    waiver43e: boolean("waiver_43e").notNull().default(false),
    grantedAt: timestamp("granted_at", { withTimezone: true, mode: "string" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
    /** Verweis auf hochgeladenen Nachweis (optional). */
    evidence: text("evidence"),
    recordedBy: uuid("recorded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantClientIdx: index("ai_consents_tenant_client_idx").on(
      table.tenantId,
      table.clientId
    ),
  })
);

/**
 * KI-Audit ohne Inhalte (kein Prompt, keine Antwort, kein Mapping).
 */
export const aiAudit = pgTable(
  "ai_audit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    matterId: uuid("matter_id").references(() => matters.id, {
      onDelete: "set null",
    }),
    task: text("task").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    latencyMs: integer("latency_ms"),
    placeholderCount: integer("placeholder_count"),
    previewConfirmed: boolean("preview_confirmed").notNull().default(false),
    success: boolean("success").notNull(),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantCreatedIdx: index("ai_audit_tenant_created_idx").on(
      table.tenantId,
      table.createdAt
    ),
  })
);

/**
 * KI-Entwurf mit Freigabestatus (Phase 4).
 * Speicherung in der Akte nur nach Freigabe durch Rechtsanwalt.
 */
export const aiDrafts = pgTable(
  "ai_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    task: text("task").notNull(),
    status: aiDraftStatusEnum("status").notNull().default("draft"),
    /** Re-personalisierter Entwurf (Klartext nach Freigabe-Workflow). */
    content: text("content").notNull(),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedBy: uuid("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantMatterIdx: index("ai_drafts_tenant_matter_idx").on(
      table.tenantId,
      table.matterId
    ),
  })
);

/**
 * Async KI-Job (lange Bedrock-Läufe).
 * input_facts wird nach Abschluss gelöscht (Datenminimierung).
 */
export const aiJobs = pgTable(
  "ai_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    task: text("task").notNull(),
    status: aiJobStatusEnum("status").notNull().default("pending"),
    /** Temporary plaintext facts — cleared as soon as the worker loads them. */
    inputFacts: text("input_facts"),
    manualMarks: jsonb("manual_marks").$type<string[]>().notNull().default([]),
    /** Residuals the lawyer confirmed as non-PII (subset of gate list). */
    dismissedResiduals: jsonb("dismissed_residuals")
      .$type<string[]>()
      .notNull()
      .default([]),
    previewConfirmed: boolean("preview_confirmed").notNull().default(false),
    draftId: uuid("draft_id").references(() => aiDrafts.id, {
      onDelete: "set null",
    }),
    unknownPlaceholders: jsonb("unknown_placeholders")
      .$type<string[]>()
      .notNull()
      .default([]),
    errorCode: text("error_code"),
    /**
     * Dev-only pipeline timeline (pseudonymized text). Written only when
     * AI_DEBUG=1; never shown to lawyers.
     */
    debugTrace: jsonb("debug_trace").$type<AiDebugTrace | null>(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }),
    finishedAt: timestamp("finished_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantMatterIdx: index("ai_jobs_tenant_matter_idx").on(
      table.tenantId,
      table.matterId
    ),
    tenantStatusIdx: index("ai_jobs_tenant_status_idx").on(
      table.tenantId,
      table.status
    ),
  })
);

/** Anwaltsschreiben / E-Mail / Vermerk — Textentwurf mit Export PDF/Word. */
export const letters = pgTable(
  "letters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    module: moduleEnum("module").notNull().default("legal"),
    matterId: uuid("matter_id").references(() => matters.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Aktuell zuständig — Anwalt oder Mitarbeiter (bidirektional). */
    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Letzte Zuweisung durch (Delegierender). */
    assignedBy: uuid("assigned_by").references(() => users.id, {
      onDelete: "set null",
    }),
    status: letterStatusEnum("status").notNull().default("entwurf"),
    title: text("title").notNull(),
    /** schreiben | email | vermerk */
    kind: text("kind").notNull().default("schreiben"),
    subject: text("subject").notNull().default(""),
    salutation: text("salutation").notNull().default(""),
    body: text("body").notNull().default(""),
    closing: text("closing").notNull().default(""),
    /** Empfänger für E-Mail-Versand (optional). */
    recipientEmail: text("recipient_email").notNull().default(""),
    /** Kopie (CC) für E-Mail-Versand (optional). */
    ccEmail: text("cc_email").notNull().default(""),
    /** Anweisung an die zugewiesene Person (Delegierung). */
    assignmentNote: text("assignment_note").notNull().default(""),
    sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index("letters_tenant_id_idx").on(table.tenantId),
    assignedToIdx: index("letters_assigned_to_idx").on(table.assignedTo),
    assignedByIdx: index("letters_assigned_by_idx").on(table.assignedBy),
    statusIdx: index("letters_status_idx").on(table.status),
    matterIdIdx: index("letters_matter_id_idx").on(table.matterId),
  })
);

/**
 * Interne Aufgabe (Laufzettel): Ball + Absicht, kein Chat.
 * DB-Spalten sender_id / recipient_id = createdBy / ballHolder (bestehende Namen).
 */
export const staffMessages = pgTable(
  "staff_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** Bereich, aus dem die Aufgabe zugewiesen wurde. */
    module: moduleEnum("module").notNull().default("general"),
    /** Wer die Aufgabe zugewiesen hat. */
    createdById: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** Wer den Ball hat (dran ist). */
    ballHolderId: uuid("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** Vorheriger Ballhalter — Default-Ziel beim Übergeben. */
    previousBallHolderId: uuid("previous_ball_holder_id").references(
      () => users.id,
      { onDelete: "set null" }
    ),
    /** Preset-Key oder `custom`. */
    topicKey: text("topic_key").notNull(),
    /** Betreff (Preset-Label oder Freitext). */
    topic: text("topic").notNull(),
    priority: staffMessagePriorityEnum("priority").notNull().default("keine"),
    /** Optional: bis wann. */
    dueDate: date("due_date", { mode: "string" }),
    intent: staffMessageIntentEnum("intent").notNull().default("erledigen"),
    body: text("body").notNull(),
    /** Optionaler Aktenbezug (empfohlen, nicht Pflicht). */
    matterId: uuid("matter_id").references(() => matters.id, {
      onDelete: "set null",
    }),
    readAt: timestamp("read_at", { withTimezone: true, mode: "string" }),
    /** Gesetzt = abgeschlossen; null = offen. */
    closedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index("staff_messages_tenant_id_idx").on(table.tenantId),
    ballHolderIdx: index("staff_messages_recipient_idx").on(table.ballHolderId),
    createdByIdx: index("staff_messages_sender_idx").on(table.createdById),
    closedAtIdx: index("staff_messages_closed_at_idx").on(table.closedAt),
    matterIdIdx: index("staff_messages_matter_id_idx").on(table.matterId),
  })
);

/** Domain-Alias. */
export const staffTasks = staffMessages;

export const staffMessageFiles = pgTable("staff_message_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  messageId: uuid("message_id")
    .notNull()
    .references(() => staffMessages.id, { onDelete: "cascade" }),
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

/** Schlankes Übergabe-/Abschluss-Protokoll. */
export const staffMessageEvents = pgTable(
  "staff_message_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    messageId: uuid("message_id")
      .notNull()
      .references(() => staffMessages.id, { onDelete: "cascade" }),
    kind: staffMessageEventKindEnum("kind").notNull(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    fromBallHolderId: uuid("from_ball_holder_id").references(() => users.id, {
      onDelete: "set null",
    }),
    toBallHolderId: uuid("to_ball_holder_id").references(() => users.id, {
      onDelete: "set null",
    }),
    intent: staffMessageIntentEnum("intent"),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index("staff_message_events_tenant_id_idx").on(table.tenantId),
    messageIdIdx: index("staff_message_events_message_id_idx").on(
      table.messageId
    ),
  })
);

export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type UserRole = (typeof roleEnum.enumValues)[number];
export type DeskRole = (typeof deskRoleEnum.enumValues)[number];
export type UserSalutation = (typeof userSalutationEnum.enumValues)[number];
export type PlatformRole = (typeof platformRoleEnum.enumValues)[number];
export type ContentModule = (typeof moduleEnum.enumValues)[number];
export type UserSmtpSettings = typeof userSmtpSettings.$inferSelect;

/**
 * Persönliche Notizen — nur Owner (user_id), nicht teilbar.
 * RLS: tenant + owner via app.current_tenant_id / app.current_user_id.
 */
export const userNotes = pgTable(
  "user_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantUserIdx: index("user_notes_tenant_user_idx").on(
      table.tenantId,
      table.userId
    ),
    tenantUserUpdatedIdx: index("user_notes_tenant_user_updated_idx").on(
      table.tenantId,
      table.userId,
      table.updatedAt
    ),
  })
);

export type UserNote = typeof userNotes.$inferSelect;

/**
 * Dateien an persönlichen Notizen — nur Owner (user_id).
 * RLS: tenant + owner via app.current_tenant_id / app.current_user_id.
 */
export const userNoteFiles = pgTable(
  "user_note_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    noteId: uuid("note_id")
      .notNull()
      .references(() => userNotes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull().unique(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantUserIdx: index("user_note_files_tenant_user_idx").on(
      table.tenantId,
      table.userId
    ),
    noteIdIdx: index("user_note_files_note_id_idx").on(table.noteId),
  })
);

export type UserNoteFileRow = typeof userNoteFiles.$inferSelect;
export type Letter = typeof letters.$inferSelect;
export type LetterStatus = (typeof letterStatusEnum.enumValues)[number];
export type Client = typeof clients.$inferSelect;
export type ClientPerson = typeof clientPersons.$inferSelect;
export type Matter = typeof matters.$inferSelect;
export type MatterParty = typeof matterParties.$inferSelect;
export type MatterPartyRole = (typeof matterPartyRoleEnum.enumValues)[number];
export type AiConsent = typeof aiConsents.$inferSelect;
export type AiConsentStatus = (typeof aiConsentStatusEnum.enumValues)[number];
export type AiAuditRow = typeof aiAudit.$inferSelect;
export type AiDraft = typeof aiDrafts.$inferSelect;
export type AiDraftStatus = (typeof aiDraftStatusEnum.enumValues)[number];
export type AiJob = typeof aiJobs.$inferSelect;
export type AiJobStatus = (typeof aiJobStatusEnum.enumValues)[number];
export type StaffMessage = typeof staffMessages.$inferSelect;
export type StaffMessageFile = typeof staffMessageFiles.$inferSelect;
export type StaffMessageEvent = typeof staffMessageEvents.$inferSelect;
export type StaffMessagePriority =
  (typeof staffMessagePriorityEnum.enumValues)[number];
export type StaffMessageIntent =
  (typeof staffMessageIntentEnum.enumValues)[number];
export type StaffMessageEventKind =
  (typeof staffMessageEventKindEnum.enumValues)[number];
