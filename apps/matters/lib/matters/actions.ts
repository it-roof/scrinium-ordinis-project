"use server";

import { practiceForDeskRole } from "@/lib/chat/practice";
import { PARTY_ROLE_LABELS } from "@/lib/matters/labels";
import { storeMatterFiles } from "@/lib/matters/files-actions";
import {
  addPracticeMatterParty,
  createPracticeMatter,
  deletePracticeMatterParty,
  getPracticeMatter,
  getPracticeMatterDetail,
  listPracticeClients,
  listPracticeMatters,
  listPracticeStaff,
  peekNextFileNumber,
  updatePracticeMatter,
} from "@/lib/matters/storage";
import type {
  ClientListItem,
  CreateMatterInput,
  MatterCardInput,
  MatterCollisionMatch,
  MatterDetail,
  MatterListItem,
  MatterPartyItem,
  StaffListItem,
} from "@/lib/matters/types";
import type { ClientKind, MatterPartyRole } from "@/lib/db/schema";
import { requireTenantUser } from "@/lib/tenant/session";

function practiceOf(user: { deskRole: Parameters<typeof practiceForDeskRole>[0] }) {
  return practiceForDeskRole(user.deskRole);
}

export async function listMattersAction(): Promise<MatterListItem[]> {
  const user = await requireTenantUser();
  try {
    return await listPracticeMatters({
      tenantId: user.tenantId,
      practice: practiceOf(user),
    });
  } catch (error) {
    console.error("[listMattersAction]", error);
    return [];
  }
}

export async function getMatterAction(
  matterId: string
): Promise<MatterListItem | null> {
  const user = await requireTenantUser();
  if (!matterId.trim()) return null;
  try {
    return await getPracticeMatter({
      tenantId: user.tenantId,
      practice: practiceOf(user),
      matterId,
    });
  } catch (error) {
    console.error("[getMatterAction]", error);
    return null;
  }
}

export async function getMatterDetailAction(
  matterId: string
): Promise<MatterDetail | null> {
  const user = await requireTenantUser();
  if (!matterId.trim()) return null;
  try {
    return await getPracticeMatterDetail({
      tenantId: user.tenantId,
      practice: practiceOf(user),
      matterId,
    });
  } catch (error) {
    console.error("[getMatterDetailAction]", error);
    return null;
  }
}

export async function listClientsAction(): Promise<ClientListItem[]> {
  const user = await requireTenantUser();
  try {
    return await listPracticeClients({
      tenantId: user.tenantId,
      practice: practiceOf(user),
    });
  } catch (error) {
    console.error("[listClientsAction]", error);
    return [];
  }
}

export async function listStaffAction(): Promise<StaffListItem[]> {
  const user = await requireTenantUser();
  try {
    return await listPracticeStaff({ tenantId: user.tenantId });
  } catch (error) {
    console.error("[listStaffAction]", error);
    return [];
  }
}

export async function peekFileNumberAction(): Promise<string> {
  const user = await requireTenantUser();
  try {
    return await peekNextFileNumber({
      tenantId: user.tenantId,
      practice: practiceOf(user),
    });
  } catch (error) {
    console.error("[peekFileNumberAction]", error);
    return "";
  }
}

export async function createMatterAction(
  input: CreateMatterInput,
  formData?: FormData
): Promise<
  | { success: true; matter: MatterListItem }
  | { success: false; error: string }
  | { success: false; collision: true; matches: MatterCollisionMatch[] }
> {
  const user = await requireTenantUser();
  if (input.collisionReason !== undefined && input.collisionReason.trim().length < 8) {
    return {
      success: false,
      error: "Bitte kurz begründen, warum die Akte trotzdem angelegt wird.",
    };
  }

  try {
    const result = await createPracticeMatter({
      tenantId: user.tenantId,
      userId: user.id,
      practice: practiceOf(user),
      input: {
        ...input,
        lawyerId: input.lawyerId ?? user.id,
      },
    });
    if (result.ok) {
      const files = formData
        ?.getAll("files")
        .filter((entry): entry is File => entry instanceof File && entry.size > 0);
      if (files && files.length > 0) {
        const stored = await storeMatterFiles({
          tenantId: user.tenantId,
          userId: user.id,
          matterId: result.matter.id,
          practice: practiceOf(user),
          files,
        });
        if (!stored.ok) {
          console.error("[createMatterAction] files", stored.error);
        }
      }
      return { success: true, matter: result.matter };
    }
    if (result.code === "collision") {
      return { success: false, collision: true, matches: result.matches };
    }
    return { success: false, error: "Mandant nicht gefunden." };
  } catch (error) {
    console.error("[createMatterAction]", error);
    return { success: false, error: "Akte konnte nicht angelegt werden." };
  }
}

export async function updateMatterAction(
  matterId: string,
  input: MatterCardInput
): Promise<
  | { success: true; matter: MatterDetail }
  | { success: false; error: string }
> {
  const user = await requireTenantUser();
  if (!matterId.trim()) {
    return { success: false, error: "Akte nicht gefunden." };
  }
  if (!input.title.trim()) {
    return { success: false, error: "Bitte eine Kurzbezeichnung angeben." };
  }

  try {
    const matter = await updatePracticeMatter({
      tenantId: user.tenantId,
      practice: practiceOf(user),
      matterId,
      input,
    });
    if (!matter) {
      return { success: false, error: "Akte nicht gefunden." };
    }
    return { success: true, matter };
  } catch (error) {
    console.error("[updateMatterAction]", error);
    return { success: false, error: "Akte konnte nicht gespeichert werden." };
  }
}

export async function addMatterPartyAction(input: {
  matterId: string;
  role: MatterPartyRole;
  kind: ClientKind;
  name: string;
  firstName?: string;
  lastName?: string;
}): Promise<
  | { success: true; party: MatterPartyItem }
  | { success: false; error: string }
> {
  const user = await requireTenantUser();
  if (!PARTY_ROLE_LABELS[input.role] || input.role === "client") {
    return { success: false, error: "Diese Rolle kann nicht angelegt werden." };
  }
  try {
    const party = await addPracticeMatterParty({
      tenantId: user.tenantId,
      practice: practiceOf(user),
      matterId: input.matterId,
      role: input.role,
      kind: input.kind,
      name: input.name,
      firstName: input.firstName,
      lastName: input.lastName,
    });
    if (!party) {
      return { success: false, error: "Bitte einen Namen angeben." };
    }
    return { success: true, party };
  } catch (error) {
    console.error("[addMatterPartyAction]", error);
    return { success: false, error: "Beteiligte konnte nicht angelegt werden." };
  }
}

export async function deleteMatterPartyAction(
  matterId: string,
  partyId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireTenantUser();
  try {
    const ok = await deletePracticeMatterParty({
      tenantId: user.tenantId,
      practice: practiceOf(user),
      matterId,
      partyId,
    });
    if (!ok) {
      return { success: false, error: "Beteiligte nicht gefunden." };
    }
    return { success: true };
  } catch (error) {
    console.error("[deleteMatterPartyAction]", error);
    return { success: false, error: "Beteiligte konnte nicht entfernt werden." };
  }
}
