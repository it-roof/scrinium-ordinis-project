import "server-only";

import { and, asc, eq } from "drizzle-orm";

import type { KnownEntity } from "@/lib/ai/pseudonymize";
import { AI_ERROR, AiGatewayError } from "@/lib/ai/errors";
import { clients, matterParties, matters } from "@/lib/db/schema";
import { withTenantDb } from "@/lib/tenant/db";

export type MatterAiContext = {
  matterId: string;
  clientId: string;
  clientName: string;
  matterTitle: string;
  matterReference: string;
  entities: KnownEntity[];
};

function pushUnique(
  entities: KnownEntity[],
  type: KnownEntity["type"],
  value: string
) {
  const trimmed = value.trim();
  if (!trimmed) return;
  entities.push({ type, value: trimmed });
}

/**
 * Load matter + client + parties scoped to session tenant.
 * Throws FORBIDDEN / NOT_FOUND if matter does not belong to tenant.
 */
export async function loadMatterAiContext(
  tenantId: string,
  matterId: string
): Promise<MatterAiContext> {
  return withTenantDb(tenantId, async (tx) => {
    const matterRows = await tx
      .select({
        matter: matters,
        client: clients,
      })
      .from(matters)
      .innerJoin(clients, eq(matters.clientId, clients.id))
      .where(and(eq(matters.id, matterId), eq(matters.tenantId, tenantId)))
      .limit(1);

    const row = matterRows[0];
    if (!row) {
      throw new AiGatewayError(AI_ERROR.FORBIDDEN, "Matter not in tenant");
    }

    if (row.client.tenantId !== tenantId) {
      throw new AiGatewayError(AI_ERROR.FORBIDDEN, "Client not in tenant");
    }

    const parties = await tx
      .select()
      .from(matterParties)
      .where(
        and(
          eq(matterParties.tenantId, tenantId),
          eq(matterParties.matterId, matterId)
        )
      )
      .orderBy(asc(matterParties.createdAt));

    const entities: KnownEntity[] = [];
    const client = row.client;

    if (client.kind === "person") {
      const full = [client.firstName, client.lastName].filter(Boolean).join(" ");
      pushUnique(entities, "PERSON", full || client.name);
      pushUnique(entities, "PERSON", client.firstName);
      pushUnique(entities, "PERSON", client.lastName);
    } else {
      pushUnique(entities, "FIRMA", client.name);
    }

    pushUnique(entities, "ORT", client.city);
    if (client.street) {
      pushUnique(entities, "ORT", `${client.street}, ${client.postalCode} ${client.city}`.trim());
    }

    pushUnique(entities, "AZ", row.matter.reference);

    for (const party of parties) {
      if (party.kind === "person") {
        const full = [party.firstName, party.lastName].filter(Boolean).join(" ");
        pushUnique(entities, "PERSON", full || party.name);
        pushUnique(entities, "PERSON", party.firstName);
        pushUnique(entities, "PERSON", party.lastName);
      } else {
        pushUnique(entities, "FIRMA", party.name);
        // Short company token often appears alone (e.g. "Huber")
        const tokens = party.name.split(/\s+/).filter((t) => t.length >= 3);
        for (const token of tokens) {
          if (/gmbh|ug|ag|kg|ohg|se|inc|ltd/i.test(token)) continue;
          pushUnique(entities, "FIRMA", token);
        }
      }
      pushUnique(entities, "ORT", party.city);
    }

    return {
      matterId: row.matter.id,
      clientId: client.id,
      clientName: client.name,
      matterTitle: row.matter.title,
      matterReference: row.matter.reference,
      entities,
    };
  });
}
