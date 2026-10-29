import {
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

/** Auth-Subset: gleiche Tabellen wie Desk (keine Migrationen hier). */

export const roleEnum = pgEnum("user_role", ["admin", "employee"]);

export const deskRoleEnum = pgEnum("desk_role", [
  "rechtsanwalt",
  "sekretariat",
  "steuerberater",
  "stb_sekretariat",
]);

export const userSalutationEnum = pgEnum("user_salutation", ["herr", "frau"]);

export const dashboardViewEnum = pgEnum("dashboard_view", ["quick", "all"]);

export const platformRoleEnum = pgEnum("platform_role", ["super_admin"]);

export const moduleEnum = pgEnum("module", [
  "general",
  "tax",
  "legal",
  "restructuring-insolvency",
  "consulting",
  "administration",
  "notary",
]);

export const clientKindEnum = pgEnum("client_kind", ["company", "person"]);

export const matterPartyRoleEnum = pgEnum("matter_party_role", [
  "client",
  "opponent",
  "opponent_counsel",
  "court",
  "party",
  "other",
]);

export const matterStatusEnum = pgEnum("matter_status", ["open", "closed"]);

export const letterStatusEnum = pgEnum("letter_status", [
  "entwurf",
  "zur_pruefung",
  "freigegeben",
  "versendet",
]);

export type MatterCollisionMatch = {
  matterId: string;
  matterTitle: string;
  fileNumber: string;
  role: (typeof matterPartyRoleEnum.enumValues)[number];
  name: string;
};

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  brandName: text("brand_name"),
  customDomain: text("custom_domain").unique(),
  enabledModules: jsonb("enabled_modules").$type<string[]>().notNull().default([]),
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
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  salutation: userSalutationEnum("salutation"),
  dashboardView: dashboardViewEnum("dashboard_view").notNull().default("quick"),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("employee"),
  deskRole: deskRoleEnum("desk_role"),
  platformRole: platformRoleEnum("platform_role"),
  module: moduleEnum("module"),
  allowedModules: jsonb("allowed_modules").$type<string[] | null>(),
  allowedFunctions: jsonb("allowed_functions").$type<string[] | null>(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
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

export const authLoginAttempts = pgTable("auth_login_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

/**
 * Same tables as Desk (no migrations here). Read-only subset for Akten.
 */
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  module: moduleEnum("module").notNull().default("legal"),
  kind: clientKindEnum("kind").notNull().default("company"),
  name: text("name").notNull(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  street: text("street").notNull().default(""),
  postalCode: text("postal_code").notNull().default(""),
  city: text("city").notNull().default(""),
});

export const matters = pgTable(
  "matters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    module: moduleEnum("module").notNull().default("legal"),
    clientId: uuid("client_id").notNull(),
    title: text("title").notNull(),
    reference: text("reference").notNull().default(""),
    notes: text("notes").notNull().default(""),
    fileNumber: text("file_number").notNull().default(""),
    subject: text("subject").notNull().default(""),
    legalArea: text("legal_area").notNull().default(""),
    lawyerId: uuid("lawyer_id"),
    assistantId: uuid("assistant_id"),
    openedAt: date("opened_at", { mode: "string" }).notNull().defaultNow(),
    status: matterStatusEnum("status").notNull().default("open"),
    closedAt: date("closed_at", { mode: "string" }),
    amountInDispute: text("amount_in_dispute").notNull().default(""),
    proceedingInstance: text("proceeding_instance").notNull().default(""),
    courtName: text("court_name").notNull().default(""),
    courtFileNumber: text("court_file_number").notNull().default(""),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index("matters_tenant_id_idx").on(table.tenantId),
    moduleIdx: index("matters_module_idx").on(table.module),
    tenantModuleFileNumberIdx: uniqueIndex(
      "matters_tenant_module_file_number_idx"
    ).on(table.tenantId, table.module, table.fileNumber),
  })
);

export const matterFileNumberCounters = pgTable(
  "matter_file_number_counters",
  {
    tenantId: uuid("tenant_id").notNull(),
    module: moduleEnum("module").notNull(),
    year: integer("year").notNull(),
    lastSeq: integer("last_seq").notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.tenantId, table.module, table.year],
    }),
  })
);

export const matterCollisionAcks = pgTable(
  "matter_collision_acks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    acknowledgedBy: uuid("acknowledged_by"),
    reason: text("reason").notNull(),
    matches: jsonb("matches")
      .$type<MatterCollisionMatch[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantMatterIdx: index("matter_collision_acks_tenant_matter_idx").on(
      table.tenantId,
      table.matterId
    ),
  })
);

export const matterParties = pgTable(
  "matter_parties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
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
 * Same tables as Desk (no migrations here).
 */
export const letters = pgTable(
  "letters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    module: moduleEnum("module").notNull().default("legal"),
    matterId: uuid("matter_id"),
    createdBy: uuid("created_by"),
    assignedTo: uuid("assigned_to"),
    assignedBy: uuid("assigned_by"),
    status: letterStatusEnum("status").notNull().default("entwurf"),
    title: text("title").notNull(),
    kind: text("kind").notNull().default("schreiben"),
    subject: text("subject").notNull().default(""),
    salutation: text("salutation").notNull().default(""),
    body: text("body").notNull().default(""),
    closing: text("closing").notNull().default(""),
    recipientEmail: text("recipient_email").notNull().default(""),
    ccEmail: text("cc_email").notNull().default(""),
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
    matterIdIdx: index("letters_matter_id_idx").on(table.matterId),
  })
);

/**
 * Same tables as Desk (no migrations here).
 * Unassigned chats have `matter_id` null; Akten-Chats setzen die Akte.
 */
export const matterFiles = pgTable(
  "matter_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    module: moduleEnum("module").notNull().default("legal"),
    uploadedBy: uuid("uploaded_by"),
    storageKey: text("storage_key").notNull().unique(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantMatterIdx: index("matter_files_tenant_matter_idx").on(
      table.tenantId,
      table.matterId
    ),
    tenantMatterUpdatedIdx: index("matter_files_tenant_matter_updated_idx").on(
      table.tenantId,
      table.matterId,
      table.updatedAt
    ),
  })
);

export const matterAiChats = pgTable(
  "matter_ai_chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    matterId: uuid("matter_id"),
    module: moduleEnum("module").notNull().default("legal"),
    title: text("title").notNull().default(""),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    pinnedAt: timestamp("pinned_at", { withTimezone: true, mode: "string" }),
    letterId: uuid("letter_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantMatterIdx: index("matter_ai_chats_tenant_matter_idx").on(
      table.tenantId,
      table.matterId
    ),
  })
);

export const matterAiChatMessages = pgTable(
  "matter_ai_chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => matterAiChats.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    actionId: text("action_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantChatIdx: index("matter_ai_chat_messages_tenant_chat_idx").on(
      table.tenantId,
      table.chatId
    ),
  })
);

export type UserRole = (typeof roleEnum.enumValues)[number];
export type DeskRole = (typeof deskRoleEnum.enumValues)[number];
export type PlatformRole = (typeof platformRoleEnum.enumValues)[number];
export type ContentModule = (typeof moduleEnum.enumValues)[number];
export type MatterPartyRole = (typeof matterPartyRoleEnum.enumValues)[number];
export type MatterStatus = (typeof matterStatusEnum.enumValues)[number];
export type LetterStatus = (typeof letterStatusEnum.enumValues)[number];
export type ClientKind = (typeof clientKindEnum.enumValues)[number];
export type MatterAiChat = typeof matterAiChats.$inferSelect;
export type MatterAiChatMessage = typeof matterAiChatMessages.$inferSelect;
