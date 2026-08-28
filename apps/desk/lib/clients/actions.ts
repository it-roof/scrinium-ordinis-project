"use server";

import { revalidatePath } from "next/cache";

import { assertUserCanAccessAreaFunction } from "@/lib/tenant/access";
import { requireSessionUser } from "@/lib/tenant/session";

import {
  createClientRow,
  createPersonRow,
  deleteClientRow,
  deletePersonRow,
  getClientById,
  getPersonById,
  updateClientRow,
  updatePersonRow,
} from "./storage";
import type { ClientInput, ClientKind, ClientPersonInput } from "./types";

async function requireClientsUser() {
  const user = await requireSessionUser();
  if (!user) {
    return { error: "Nicht angemeldet." as const, user: null };
  }
  const denied = await assertUserCanAccessAreaFunction(
    user.id,
    user.tenantId,
    "clients"
  );
  if (denied) {
    return { error: denied, user: null };
  }
  return { error: null, user };
}

function isClientKind(value: string): value is ClientKind {
  return value === "company" || value === "person";
}

function validateClient(input: ClientInput): string | null {
  if (!isClientKind(input.kind)) {
    return "Ungültiger Mandantentyp.";
  }
  if (input.kind === "company") {
    if (!input.name.trim()) {
      return "Bitte einen Firmennamen angeben.";
    }
    return null;
  }
  if (!input.firstName.trim()) {
    return "Bitte einen Vornamen angeben.";
  }
  if (!input.lastName.trim()) {
    return "Bitte einen Nachnamen angeben.";
  }
  return null;
}

function validatePerson(
  input: Pick<ClientPersonInput, "firstName" | "lastName" | "clientId">
): string | null {
  if (!input.clientId.trim()) {
    return "Mandant fehlt.";
  }
  if (!input.firstName.trim()) {
    return "Bitte einen Vornamen angeben.";
  }
  if (!input.lastName.trim()) {
    return "Bitte einen Nachnamen angeben.";
  }
  return null;
}

const NOT_FOUND = "Mandant nicht gefunden.";

export async function createClient(input: ClientInput) {
  const { error, user } = await requireClientsUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }
  const validation = validateClient(input);
  if (validation) {
    return { success: false as const, error: validation };
  }
  const item = await createClientRow(user.tenantId, user.id, {
    ...input,
    module: "legal",
  });
  revalidatePath("/", "layout");
  return { success: true as const, item };
}

export async function updateClient(id: string, input: ClientInput) {
  const { error, user } = await requireClientsUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }
  const existing = await getClientById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: NOT_FOUND };
  }
  const validation = validateClient({ ...input, kind: existing.kind });
  if (validation) {
    return { success: false as const, error: validation };
  }
  const item = await updateClientRow(user.tenantId, id, {
    ...input,
    kind: existing.kind,
    module: existing.module,
  });
  if (!item) {
    return { success: false as const, error: NOT_FOUND };
  }
  revalidatePath("/", "layout");
  return { success: true as const, item };
}

export async function deleteClient(id: string) {
  const { error, user } = await requireClientsUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }
  const existing = await getClientById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: NOT_FOUND };
  }
  const ok = await deleteClientRow(user.tenantId, id);
  if (!ok) {
    return { success: false as const, error: "Löschen fehlgeschlagen." };
  }
  revalidatePath("/", "layout");
  return { success: true as const };
}

export async function createPerson(input: ClientPersonInput) {
  const { error, user } = await requireClientsUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }
  const validation = validatePerson(input);
  if (validation) {
    return { success: false as const, error: validation };
  }
  const client = await getClientById(user.tenantId, input.clientId);
  if (!client) {
    return { success: false as const, error: NOT_FOUND };
  }
  if (client.kind !== "company") {
    return {
      success: false as const,
      error: "Kontaktpersonen nur bei Firmen möglich.",
    };
  }
  const item = await createPersonRow(user.tenantId, user.id, input);
  if (!item) {
    return { success: false as const, error: NOT_FOUND };
  }
  revalidatePath("/", "layout");
  return { success: true as const, item };
}

export async function updatePerson(
  id: string,
  input: Omit<ClientPersonInput, "clientId">
) {
  const { error, user } = await requireClientsUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }
  if (!input.firstName.trim()) {
    return { success: false as const, error: "Bitte einen Vornamen angeben." };
  }
  if (!input.lastName.trim()) {
    return { success: false as const, error: "Bitte einen Nachnamen angeben." };
  }
  const existing = await getPersonById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: "Person nicht gefunden." };
  }
  const item = await updatePersonRow(user.tenantId, id, input);
  if (!item) {
    return { success: false as const, error: "Person nicht gefunden." };
  }
  revalidatePath("/", "layout");
  return { success: true as const, item };
}

export async function deletePerson(id: string) {
  const { error, user } = await requireClientsUser();
  if (!user) {
    return { success: false as const, error: error ?? "Nicht angemeldet." };
  }
  const existing = await getPersonById(user.tenantId, id);
  if (!existing) {
    return { success: false as const, error: "Person nicht gefunden." };
  }
  const ok = await deletePersonRow(user.tenantId, id);
  if (!ok) {
    return { success: false as const, error: "Löschen fehlgeschlagen." };
  }
  revalidatePath("/", "layout");
  return { success: true as const };
}
