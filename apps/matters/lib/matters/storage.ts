import "server-only";

import { and, asc, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { ChatPractice } from "@/lib/chat/practice";
import {
  findCollisionMatches,
  type CollisionMatter,
  type CollisionName,
} from "@/lib/matters/collision";
import {
  DEFAULT_CLIENT_NAME,
  DEFAULT_MATTER_TITLE,
} from "@/lib/matters/intake";
import { suggestShortTitle } from "@/lib/matters/title";
import type {
  ClientListItem,
  CreateMatterInput,
  MatterCardInput,
  MatterDetail,
  MatterListItem,
  MatterPartyItem,
  StaffListItem,
} from "@/lib/matters/types";
import {
  clients,
  matterCollisionAcks,
  matterFileNumberCounters,
  matterParties,
  matters,
  users,
  type ClientKind,
  type MatterCollisionMatch,
  type MatterPartyRole,
} from "@/lib/db/schema";
import { withTenantDb } from "@/lib/tenant/db";

export type { ClientListItem, MatterListItem };

type TenantTx = Parameters<Parameters<typeof withTenantDb>[1]>[0];

const lawyers = alias(users, "matter_lawyers");
const assistants = alias(users, "matter_assistants");

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function allocateFileNumber(
  tx: TenantTx,
  tenantId: string,
  module: ChatPractice
): Promise<string> {
  const year = new Date().getFullYear();
  const [row] = await tx
    .insert(matterFileNumberCounters)
    .values({
      tenantId,
      module,
      year,
      lastSeq: 1,
    })
    .onConflictDoUpdate({
      target: [
        matterFileNumberCounters.tenantId,
        matterFileNumberCounters.module,
        matterFileNumberCounters.year,
      ],
      set: {
        lastSeq: sql`${matterFileNumberCounters.lastSeq} + 1`,
      },
    })
    .returning({ lastSeq: matterFileNumberCounters.lastSeq });

  return `${row?.lastSeq ?? 1}/${year}`;
}

export async function peekNextFileNumber(params: {
  tenantId: string;
  practice: ChatPractice;
}): Promise<string> {
  const year = new Date().getFullYear();
  return withTenantDb(params.tenantId, async (tx) => {
    const [row] = await tx
      .select({ lastSeq: matterFileNumberCounters.lastSeq })
      .from(matterFileNumberCounters)
      .where(
        and(
          eq(matterFileNumberCounters.tenantId, params.tenantId),
          eq(matterFileNumberCounters.module, params.practice),
          eq(matterFileNumberCounters.year, year)
        )
      )
      .limit(1);
    return `${(row?.lastSeq ?? 0) + 1}/${year}`;
  });
}

function toListItem(row: {
  id: string;
  title: string;
  reference: string;
  fileNumber: string;
  subject: string;
  status: MatterListItem["status"];
  clientId: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;
}): MatterListItem {
  return row;
}

function toParty(row: {
  id: string;
  role: MatterPartyRole;
  kind: ClientKind;
  name: string;
  firstName: string;
  lastName: string;
  city: string;
}): MatterPartyItem {
  return row;
}

export async function listPracticeMatters(params: {
  tenantId: string;
  practice: ChatPractice;
}): Promise<MatterListItem[]> {
  return withTenantDb(params.tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: matters.id,
        title: matters.title,
        reference: matters.reference,
        fileNumber: matters.fileNumber,
        subject: matters.subject,
        status: matters.status,
        clientId: matters.clientId,
        clientName: clients.name,
        createdAt: matters.createdAt,
        updatedAt: matters.updatedAt,
      })
      .from(matters)
      .innerJoin(clients, eq(matters.clientId, clients.id))
      .where(
        and(
          eq(matters.tenantId, params.tenantId),
          eq(matters.module, params.practice)
        )
      )
      .orderBy(desc(matters.updatedAt))
      .limit(60);

    return rows.map(toListItem);
  });
}

export async function getPracticeMatter(params: {
  tenantId: string;
  practice: ChatPractice;
  matterId: string;
}): Promise<MatterListItem | null> {
  return withTenantDb(params.tenantId, async (tx) => {
    const [row] = await tx
      .select({
        id: matters.id,
        title: matters.title,
        reference: matters.reference,
        fileNumber: matters.fileNumber,
        subject: matters.subject,
        status: matters.status,
        clientId: matters.clientId,
        clientName: clients.name,
        createdAt: matters.createdAt,
        updatedAt: matters.updatedAt,
      })
      .from(matters)
      .innerJoin(clients, eq(matters.clientId, clients.id))
      .where(
        and(
          eq(matters.id, params.matterId),
          eq(matters.tenantId, params.tenantId),
          eq(matters.module, params.practice)
        )
      )
      .limit(1);

    return row ? toListItem(row) : null;
  });
}

export async function getPracticeMatterDetail(params: {
  tenantId: string;
  practice: ChatPractice;
  matterId: string;
}): Promise<MatterDetail | null> {
  return withTenantDb(params.tenantId, async (tx) => {
    const [row] = await tx
      .select({
        id: matters.id,
        clientId: matters.clientId,
        clientName: clients.name,
        clientKind: clients.kind,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        clientStreet: clients.street,
        clientPostalCode: clients.postalCode,
        clientCity: clients.city,
        title: matters.title,
        fileNumber: matters.fileNumber,
        subject: matters.subject,
        legalArea: matters.legalArea,
        lawyerId: matters.lawyerId,
        lawyerName: lawyers.name,
        assistantId: matters.assistantId,
        assistantName: assistants.name,
        openedAt: matters.openedAt,
        status: matters.status,
        closedAt: matters.closedAt,
        amountInDispute: matters.amountInDispute,
        proceedingInstance: matters.proceedingInstance,
        courtName: matters.courtName,
        courtFileNumber: matters.courtFileNumber,
        notes: matters.notes,
      })
      .from(matters)
      .innerJoin(clients, eq(matters.clientId, clients.id))
      .leftJoin(lawyers, eq(matters.lawyerId, lawyers.id))
      .leftJoin(assistants, eq(matters.assistantId, assistants.id))
      .where(
        and(
          eq(matters.id, params.matterId),
          eq(matters.tenantId, params.tenantId),
          eq(matters.module, params.practice)
        )
      )
      .limit(1);

    if (!row) return null;

    const partyRows = await listParties(tx, params.tenantId, params.matterId);
    if (!partyRows.some((party) => party.role === "client")) {
      await ensureClientParty(tx, params.tenantId, params.matterId, row.clientId);
      const refreshed = await listParties(tx, params.tenantId, params.matterId);
      return {
        ...row,
        lawyerName: row.lawyerName ?? "",
        assistantName: row.assistantName ?? "",
        parties: refreshed,
      };
    }

    return {
      ...row,
      lawyerName: row.lawyerName ?? "",
      assistantName: row.assistantName ?? "",
      parties: partyRows,
    };
  });
}

async function listParties(
  tx: TenantTx,
  tenantId: string,
  matterId: string
): Promise<MatterPartyItem[]> {
  const partyRows = await tx
    .select({
      id: matterParties.id,
      role: matterParties.role,
      kind: matterParties.kind,
      name: matterParties.name,
      firstName: matterParties.firstName,
      lastName: matterParties.lastName,
      city: matterParties.city,
    })
    .from(matterParties)
    .where(
      and(
        eq(matterParties.tenantId, tenantId),
        eq(matterParties.matterId, matterId)
      )
    )
    .orderBy(asc(matterParties.createdAt));
  return partyRows.map(toParty);
}

async function ensureClientParty(
  tx: TenantTx,
  tenantId: string,
  matterId: string,
  clientId: string
) {
  const [client] = await tx
    .select({
      kind: clients.kind,
      name: clients.name,
      firstName: clients.firstName,
      lastName: clients.lastName,
      street: clients.street,
      postalCode: clients.postalCode,
      city: clients.city,
    })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId)))
    .limit(1);
  if (!client) return;
  await tx.insert(matterParties).values({
    tenantId,
    matterId,
    role: "client",
    kind: client.kind,
    name: client.name,
    firstName: client.firstName,
    lastName: client.lastName,
    street: client.street,
    postalCode: client.postalCode,
    city: client.city,
  });
}

export async function listPracticeClients(params: {
  tenantId: string;
  practice: ChatPractice;
}): Promise<ClientListItem[]> {
  return withTenantDb(params.tenantId, async (tx) => {
    return tx
      .select({
        id: clients.id,
        name: clients.name,
        kind: clients.kind,
        firstName: clients.firstName,
        lastName: clients.lastName,
        street: clients.street,
        postalCode: clients.postalCode,
        city: clients.city,
      })
      .from(clients)
      .where(
        and(
          eq(clients.tenantId, params.tenantId),
          eq(clients.module, params.practice)
        )
      )
      .orderBy(asc(clients.name))
      .limit(200);
  });
}

export async function listPracticeStaff(params: {
  tenantId: string;
}): Promise<StaffListItem[]> {
  return withTenantDb(params.tenantId, async (tx) => {
    return tx
      .select({
        id: users.id,
        name: users.name,
      })
      .from(users)
      .where(and(eq(users.tenantId, params.tenantId), isNull(users.disabledAt)))
      .orderBy(asc(users.name))
      .limit(200);
  });
}

async function loadCollisionMatters(
  tx: TenantTx,
  tenantId: string,
  practice: ChatPractice
): Promise<CollisionMatter[]> {
  const matterRows = await tx
    .select({
      id: matters.id,
      title: matters.title,
      fileNumber: matters.fileNumber,
      clientName: clients.name,
    })
    .from(matters)
    .innerJoin(clients, eq(matters.clientId, clients.id))
    .where(
      and(eq(matters.tenantId, tenantId), eq(matters.module, practice))
    );

  const partyRows = await tx
    .select({
      matterId: matterParties.matterId,
      role: matterParties.role,
      name: matterParties.name,
    })
    .from(matterParties)
    .innerJoin(matters, eq(matterParties.matterId, matters.id))
    .where(
      and(
        eq(matterParties.tenantId, tenantId),
        eq(matters.module, practice)
      )
    );

  const byId = new Map<string, CollisionMatter>();
  for (const row of matterRows) {
    byId.set(row.id, {
      id: row.id,
      title: row.title,
      fileNumber: row.fileNumber,
      names: [{ role: "client", name: row.clientName }],
    });
  }
  for (const row of partyRows) {
    const matter = byId.get(row.matterId);
    if (!matter) continue;
    matter.names.push({ role: row.role, name: row.name });
  }
  return [...byId.values()];
}

type ClientRow = {
  id: string;
  name: string;
  kind: ClientKind;
  firstName: string;
  lastName: string;
  street: string;
  postalCode: string;
  city: string;
};

export async function createPracticeMatter(params: {
  tenantId: string;
  userId: string;
  practice: ChatPractice;
  input: CreateMatterInput;
}): Promise<
  | { ok: true; matter: MatterListItem }
  | { ok: false; code: "client_not_found" }
  | { ok: false; code: "collision"; matches: MatterCollisionMatch[] }
> {
  const existingClientId = params.input.clientId?.trim() ?? "";
  const opponentName = params.input.opponentName?.trim() ?? "";
  const subject = params.input.subject?.trim() ?? "";

  return withTenantDb(params.tenantId, async (tx) => {
    let client: ClientRow | undefined;
    if (existingClientId) {
      const [found] = await tx
        .select({
          id: clients.id,
          name: clients.name,
          kind: clients.kind,
          firstName: clients.firstName,
          lastName: clients.lastName,
          street: clients.street,
          postalCode: clients.postalCode,
          city: clients.city,
        })
        .from(clients)
        .where(
          and(
            eq(clients.id, existingClientId),
            eq(clients.tenantId, params.tenantId),
            eq(clients.module, params.practice)
          )
        )
        .limit(1);
      client = found;
      if (!client) return { ok: false, code: "client_not_found" as const };
    } else {
      const kind =
        params.input.clientKind === "person" ? "person" : "company";
      const firstName = params.input.clientFirstName?.trim() ?? "";
      const lastName = params.input.clientLastName?.trim() ?? "";
      const name =
        params.input.clientName?.trim() ||
        [firstName, lastName].filter(Boolean).join(" ").trim() ||
        DEFAULT_CLIENT_NAME;
      const [created] = await tx
        .insert(clients)
        .values({
          tenantId: params.tenantId,
          module: params.practice,
          kind,
          name,
          firstName,
          lastName,
          street: params.input.clientStreet?.trim() ?? "",
          postalCode: params.input.clientPostalCode?.trim() ?? "",
          city: params.input.clientCity?.trim() ?? "",
        })
        .returning({
          id: clients.id,
          name: clients.name,
          kind: clients.kind,
          firstName: clients.firstName,
          lastName: clients.lastName,
          street: clients.street,
          postalCode: clients.postalCode,
          city: clients.city,
        });
      client = created;
      if (!client) return { ok: false, code: "client_not_found" as const };
    }

    const incoming: CollisionName[] = [
      { role: "client", name: client.name },
      ...(opponentName ? [{ role: "opponent" as const, name: opponentName }] : []),
    ];
    const others = await loadCollisionMatters(tx, params.tenantId, params.practice);
    const matches = opponentName
      ? findCollisionMatches(incoming, others)
      : [];
    const reason = params.input.collisionReason?.trim() ?? "";
    if (matches.length > 0 && !reason) {
      return { ok: false, code: "collision" as const, matches };
    }

    const title =
      params.input.title?.trim() ||
      suggestShortTitle(client.name, opponentName) ||
      DEFAULT_MATTER_TITLE;
    const fileNumber = await allocateFileNumber(
      tx,
      params.tenantId,
      params.practice
    );
    const openedAt = todayDate();
    const lawyerId = params.input.lawyerId?.trim() || params.userId;
    const assistantId = params.input.assistantId?.trim() || null;

    const [row] = await tx
      .insert(matters)
      .values({
        tenantId: params.tenantId,
        module: params.practice,
        clientId: client.id,
        title,
        subject,
        legalArea: params.input.legalArea?.trim() ?? "",
        lawyerId,
        assistantId,
        fileNumber,
        openedAt,
        status: "open",
        courtName: params.input.courtName?.trim() ?? "",
        courtFileNumber: params.input.courtFileNumber?.trim() ?? "",
        amountInDispute: params.input.amountInDispute?.trim() ?? "",
        createdBy: params.userId,
      })
      .returning({
        id: matters.id,
        title: matters.title,
        reference: matters.reference,
        fileNumber: matters.fileNumber,
        subject: matters.subject,
        status: matters.status,
        createdAt: matters.createdAt,
        updatedAt: matters.updatedAt,
      });

    if (!row) return { ok: false, code: "client_not_found" as const };

    await tx.insert(matterParties).values([
      {
        tenantId: params.tenantId,
        matterId: row.id,
        role: "client",
        kind: client.kind,
        name: client.name,
        firstName: client.firstName,
        lastName: client.lastName,
        street: client.street,
        postalCode: client.postalCode,
        city: client.city,
      },
      ...(opponentName
        ? [
            {
              tenantId: params.tenantId,
              matterId: row.id,
              role: "opponent" as const,
              kind: "company" as const,
              name: opponentName,
            },
          ]
        : []),
    ]);

    if (matches.length > 0 && reason) {
      await tx.insert(matterCollisionAcks).values({
        tenantId: params.tenantId,
        matterId: row.id,
        acknowledgedBy: params.userId,
        reason,
        matches,
      });
    }

    return {
      ok: true as const,
      matter: toListItem({
        ...row,
        clientId: client.id,
        clientName: client.name,
      }),
    };
  });
}

export async function updatePracticeMatter(params: {
  tenantId: string;
  practice: ChatPractice;
  matterId: string;
  input: MatterCardInput;
}): Promise<MatterDetail | null> {
  const title = params.input.title.trim();
  const subject = params.input.subject.trim();
  if (!title) return null;

  const status = params.input.status;
  const closedAt =
    status === "closed"
      ? params.input.closedAt?.trim() || todayDate()
      : null;
  const clientKind =
    params.input.clientKind === "person" ? "person" : "company";
  const clientName =
    params.input.clientName.trim() ||
    [params.input.clientFirstName, params.input.clientLastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    DEFAULT_CLIENT_NAME;

  return withTenantDb(params.tenantId, async (tx) => {
    const [existing] = await tx
      .select({ id: matters.id, clientId: matters.clientId })
      .from(matters)
      .where(
        and(
          eq(matters.id, params.matterId),
          eq(matters.tenantId, params.tenantId),
          eq(matters.module, params.practice)
        )
      )
      .limit(1);
    if (!existing) return null;

    await tx
      .update(clients)
      .set({
        kind: clientKind,
        name: clientName,
        firstName: params.input.clientFirstName.trim(),
        lastName: params.input.clientLastName.trim(),
        street: params.input.clientStreet.trim(),
        postalCode: params.input.clientPostalCode.trim(),
        city: params.input.clientCity.trim(),
      })
      .where(
        and(
          eq(clients.id, existing.clientId),
          eq(clients.tenantId, params.tenantId)
        )
      );

    await tx
      .update(matterParties)
      .set({
        kind: clientKind,
        name: clientName,
        firstName: params.input.clientFirstName.trim(),
        lastName: params.input.clientLastName.trim(),
        street: params.input.clientStreet.trim(),
        postalCode: params.input.clientPostalCode.trim(),
        city: params.input.clientCity.trim(),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(matterParties.matterId, params.matterId),
          eq(matterParties.tenantId, params.tenantId),
          eq(matterParties.role, "client")
        )
      );

    await tx
      .update(matters)
      .set({
        title,
        subject,
        legalArea: params.input.legalArea.trim(),
        lawyerId: params.input.lawyerId,
        assistantId: params.input.assistantId,
        openedAt: params.input.openedAt.trim() || todayDate(),
        status,
        closedAt,
        amountInDispute: params.input.amountInDispute.trim(),
        proceedingInstance: params.input.proceedingInstance.trim(),
        courtName: params.input.courtName.trim(),
        courtFileNumber: params.input.courtFileNumber.trim(),
        notes: params.input.notes.trim(),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(matters.id, params.matterId),
          eq(matters.tenantId, params.tenantId)
        )
      );

    return true;
  }).then((updated) => (updated ? getPracticeMatterDetail(params) : null));
}

export async function addPracticeMatterParty(params: {
  tenantId: string;
  practice: ChatPractice;
  matterId: string;
  role: MatterPartyRole;
  kind: ClientKind;
  name: string;
  firstName?: string;
  lastName?: string;
}): Promise<MatterPartyItem | null> {
  if (params.role === "client") return null;
  const display =
    params.kind === "person"
      ? [params.firstName, params.lastName].filter(Boolean).join(" ").trim() ||
        params.name.trim()
      : params.name.trim();
  if (!display) return null;

  return withTenantDb(params.tenantId, async (tx) => {
    const [matter] = await tx
      .select({ id: matters.id })
      .from(matters)
      .where(
        and(
          eq(matters.id, params.matterId),
          eq(matters.tenantId, params.tenantId),
          eq(matters.module, params.practice)
        )
      )
      .limit(1);
    if (!matter) return null;

    const [row] = await tx
      .insert(matterParties)
      .values({
        tenantId: params.tenantId,
        matterId: params.matterId,
        role: params.role,
        kind: params.kind,
        name: display,
        firstName: params.firstName?.trim() ?? "",
        lastName: params.lastName?.trim() ?? "",
      })
      .returning({
        id: matterParties.id,
        role: matterParties.role,
        kind: matterParties.kind,
        name: matterParties.name,
        firstName: matterParties.firstName,
        lastName: matterParties.lastName,
        city: matterParties.city,
      });

    await tx
      .update(matters)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(matters.id, params.matterId));

    return row ? toParty(row) : null;
  });
}

export async function deletePracticeMatterParty(params: {
  tenantId: string;
  practice: ChatPractice;
  matterId: string;
  partyId: string;
}): Promise<boolean> {
  return withTenantDb(params.tenantId, async (tx) => {
    const [matter] = await tx
      .select({ id: matters.id })
      .from(matters)
      .where(
        and(
          eq(matters.id, params.matterId),
          eq(matters.tenantId, params.tenantId),
          eq(matters.module, params.practice)
        )
      )
      .limit(1);
    if (!matter) return false;

    const deleted = await tx
      .delete(matterParties)
      .where(
        and(
          eq(matterParties.id, params.partyId),
          eq(matterParties.matterId, params.matterId),
          eq(matterParties.tenantId, params.tenantId),
          ne(matterParties.role, "client")
        )
      )
      .returning({ id: matterParties.id });

    return deleted.length > 0;
  });
}
