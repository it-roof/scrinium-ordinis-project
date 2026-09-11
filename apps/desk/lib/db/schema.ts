import {
  type AnyPgColumn,
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
]);

export const roleEnum = pgEnum("user_role", ["admin", "employee"]);

/** Kanzlei-Position (Schreibtisch / Funktionen) — getrennt von admin/employee. */
export const deskRoleEnum = pgEnum("desk_role", [
  "rechtsanwalt",
  "sekretariat",
]);

/** Formelle Anrede für Begrüßung (Herr / Frau). */
export const userSalutationEnum = pgEnum("user_salutation", ["herr", "frau"]);

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

/** Priorität interner Aufträge (Absender setzt). */
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
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("employee"),
  /**
   * Position in der Kanzlei (Rechtsanwalt / Sekretariat).
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
 * Interner Auftrag (Laufzettel): Ball + Absicht, kein Chat.
 * DB-Spalten sender_id / recipient_id = createdBy / ballHolder (bestehende Namen).
 */
export const staffMessages = pgTable(
  "staff_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** Bereich, aus dem der Auftrag angelegt wurde. */
    module: moduleEnum("module").notNull().default("general"),
    /** Wer den Auftrag angelegt hat. */
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
export type Letter = typeof letters.$inferSelect;
export type LetterStatus = (typeof letterStatusEnum.enumValues)[number];
export type Client = typeof clients.$inferSelect;
export type ClientPerson = typeof clientPersons.$inferSelect;
export type Matter = typeof matters.$inferSelect;
export type StaffMessage = typeof staffMessages.$inferSelect;
export type StaffMessageFile = typeof staffMessageFiles.$inferSelect;
export type StaffMessageEvent = typeof staffMessageEvents.$inferSelect;
export type StaffMessagePriority =
  (typeof staffMessagePriorityEnum.enumValues)[number];
export type StaffMessageIntent =
  (typeof staffMessageIntentEnum.enumValues)[number];
export type StaffMessageEventKind =
  (typeof staffMessageEventKindEnum.enumValues)[number];
