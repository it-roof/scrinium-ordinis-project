import { config } from "dotenv";

config({ path: ".env.local" });

/**
 * Hängt viele zusätzliche Beispiel-Aufträge an die Test Kanzlei an.
 * Usage: pnpm exec tsx scripts/seed-test-kanzlei-more-auftraege.ts
 */
async function main() {
  const { and, eq } = await import("drizzle-orm");
  const { createStaffMessageRow } = await import(
    "../lib/staff-messages/storage"
  );
  const { dueDateForStaffMessagePriority } = await import(
    "../lib/staff-messages/types"
  );
  const { db } = await import("../lib/db");
  const { matters, tenants, users } = await import("../lib/db/schema");
  const { withTenantDb } = await import("../lib/tenant/db");

  const [tenant] = await db
    .select({ id: tenants.id, name: tenants.name })
    .from(tenants)
    .where(eq(tenants.slug, "test-kanzlei"))
    .limit(1);
  if (!tenant) throw new Error("test-kanzlei fehlt");

  const [jason] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenant.id),
        eq(users.email, "jason.kleuster@it-roof.com")
      )
    )
    .limit(1);
  const [elizabeth] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenant.id),
        eq(users.email, "elizabeth@it-roof.com")
      )
    )
    .limit(1);
  if (!jason || !elizabeth) throw new Error("Jason/Elizabeth fehlen");

  const matterRows = await withTenantDb(tenant.id, async (tx) =>
    tx
      .select({ id: matters.id, reference: matters.reference })
      .from(matters)
      .where(eq(matters.tenantId, tenant.id))
  );
  const byRef = Object.fromEntries(
    matterRows.map((row) => [row.reference, row.id])
  );
  for (const ref of [
    "2026-R-001",
    "2026-R-014",
    "2026-R-022",
    "2026-R-031",
    "2026-R-044",
  ]) {
    if (!byRef[ref]) {
      throw new Error(`Akte ${ref} fehlt — zuerst seed-test-kanzlei.ts.`);
    }
  }

  type Prio = "sofort" | "heute" | "diese_woche" | "keine";
  type Intent = "erledigen" | "pruefen" | "kenntnis" | "warten";

  const jobs: Array<{
    from: string;
    to: string;
    topicKey: string;
    topic: string;
    priority: Prio;
    intent: Intent;
    body: string;
    matterId: string;
  }> = [
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "brief-email",
      topic: "Brief / E-Mail schreiben",
      priority: "sofort",
      intent: "erledigen",
      body: "Fristende heute 16 Uhr: Einschreiben an Gegenseite Schmidt vorbereiten und zur Unterschrift vorlegen.",
      matterId: byRef["2026-R-014"],
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "bitte-versenden",
      topic: "Bitte versenden",
      priority: "heute",
      intent: "erledigen",
      body: "Vollmacht Hoffmann unterschrieben — bitte eingescannt an das Nachlassgericht schicken.",
      matterId: byRef["2026-R-022"],
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "telefonnotiz",
      topic: "Telefonnotiz / Rückruf",
      priority: "heute",
      intent: "erledigen",
      body: "Herr Becker (Schmidt Immobilien) möchte Rückruf zu den Nebenkostenabrechnungen. Erreichbar bis 12 Uhr.",
      matterId: byRef["2026-R-014"],
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "dokument-pruefen",
      topic: "Dokument zur Prüfung",
      priority: "heute",
      intent: "pruefen",
      body: "Entwurf Vergleichsvorschlag Bayern Bau — bitte Zahlen und Fristen gegenrechnen.",
      matterId: byRef["2026-R-044"],
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "notiz",
      topic: "Nur zur Kenntnis",
      priority: "keine",
      intent: "kenntnis",
      body: "Gerichtstermin Weber ist auf den 24.09.2026 verlegt worden. Kalender ist aktualisiert.",
      matterId: byRef["2026-R-031"],
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "warten",
      topic: "Warten auf Extern",
      priority: "diese_woche",
      intent: "warten",
      body: "Gutachten Müller noch ausstehend — bitte beim Sachverständigen nachfassen.",
      matterId: byRef["2026-R-001"],
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "brief-email",
      topic: "Brief / E-Mail schreiben",
      priority: "diese_woche",
      intent: "erledigen",
      body: "Bitte Entwurf Anwaltsschreiben an Bayern Bau (Zahlungsaufforderung Stufe 2).",
      matterId: byRef["2026-R-044"],
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "bitte-nachbessern",
      topic: "Bitte nachbessern",
      priority: "sofort",
      intent: "erledigen",
      body: "Im Schriftsatz Weber stimmt die Adresse des Arbeitgebers nicht. Bitte korrigieren.",
      matterId: byRef["2026-R-031"],
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "telefonnotiz",
      topic: "Telefonnotiz / Rückruf",
      priority: "sofort",
      intent: "erledigen",
      body: "Nachlassgericht Nürnberg: Rückruf wegen fehlender Anlage zum Erbscheinantrag Hoffmann.",
      matterId: byRef["2026-R-022"],
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "bitte-versenden",
      topic: "Bitte versenden",
      priority: "heute",
      intent: "erledigen",
      body: "Terminbestätigung Güteverhandlung Weber an Mandanten und Gegenseite per E-Mail.",
      matterId: byRef["2026-R-031"],
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "dokument-pruefen",
      topic: "Dokument zur Prüfung",
      priority: "diese_woche",
      intent: "pruefen",
      body: "Mietvertrag-Auszug Königstraße 12 — bitte Kündigungsfrist prüfen.",
      matterId: byRef["2026-R-014"],
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "notiz",
      topic: "Nur zur Kenntnis",
      priority: "keine",
      intent: "kenntnis",
      body: "Frau Wagner ab Montag zwei Wochen im Urlaub. Vertretung: Herr Klein.",
      matterId: byRef["2026-R-001"],
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "brief-email",
      topic: "Brief / E-Mail schreiben",
      priority: "heute",
      intent: "erledigen",
      body: "Zwischennachricht an Frau Hoffmann: Nachlassverzeichnis eingegangen.",
      matterId: byRef["2026-R-022"],
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "warten",
      topic: "Warten auf Extern",
      priority: "keine",
      intent: "warten",
      body: "Versicherung Bayern Bau hat Aktenzeichen angefordert — Wiedervorlage in 10 Tagen.",
      matterId: byRef["2026-R-044"],
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "custom",
      topic: "Akte anlegen / Unterlagen sortieren",
      priority: "diese_woche",
      intent: "erledigen",
      body: "Neue Korrespondenz Schmidt bitte in die Akte heften und Register aktualisieren.",
      matterId: byRef["2026-R-014"],
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "custom",
      topic: "Frist notieren",
      priority: "sofort",
      intent: "erledigen",
      body: "Einspruchsfrist Weber endet am 18.09. — bitte in Fristenkontrolle eintragen.",
      matterId: byRef["2026-R-031"],
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "bitte-versenden",
      topic: "Bitte versenden",
      priority: "heute",
      intent: "erledigen",
      body: "Honorarnote Müller Maschinenbau freigegeben — heute per E-Mail und Post.",
      matterId: byRef["2026-R-001"],
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "telefonnotiz",
      topic: "Telefonnotiz / Rückruf",
      priority: "heute",
      intent: "erledigen",
      body: "Sachverständiger Müller: Ortstermin nächste Woche Di 10 Uhr — bitte zusagen.",
      matterId: byRef["2026-R-001"],
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "dokument-pruefen",
      topic: "Dokument zur Prüfung",
      priority: "sofort",
      intent: "pruefen",
      body: "Schriftsatz Schmidt (Räumung) final — Anlagenliste und Zustellungsurkunden prüfen.",
      matterId: byRef["2026-R-014"],
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "brief-email",
      topic: "Brief / E-Mail schreiben",
      priority: "diese_woche",
      intent: "erledigen",
      body: "An Bayern Bau: Bitte um aktuelle Aufmaßliste zur Werklohnforderung.",
      matterId: byRef["2026-R-044"],
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "bitte-nachbessern",
      topic: "Bitte nachbessern",
      priority: "heute",
      intent: "erledigen",
      body: "Im Entwurf Nachlass Hoffmann fehlt noch die Aufstellung der Konten. Bitte ergänzen.",
      matterId: byRef["2026-R-022"],
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "telefonnotiz",
      topic: "Telefonnotiz / Rückruf",
      priority: "sofort",
      intent: "erledigen",
      body: "Gegenseite Schmidt hat angerufen — Vergleichsangebot mündlich. Bitte Rückruf dokumentieren.",
      matterId: byRef["2026-R-014"],
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "bitte-versenden",
      topic: "Bitte versenden",
      priority: "heute",
      intent: "erledigen",
      body: "Ladung Güteverhandlung Weber ausgedruckt — bitte heute per Boten zum Gericht.",
      matterId: byRef["2026-R-031"],
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "dokument-pruefen",
      topic: "Dokument zur Prüfung",
      priority: "diese_woche",
      intent: "pruefen",
      body: "Lieferantenvertrag Müller Version 3 — Haftungsklausel Abschnitt 9 nochmal gegenlesen.",
      matterId: byRef["2026-R-001"],
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "notiz",
      topic: "Nur zur Kenntnis",
      priority: "keine",
      intent: "kenntnis",
      body: "Bayern Bau hat Teilzahlung 12.000 € angekündigt für nächste Woche.",
      matterId: byRef["2026-R-044"],
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "warten",
      topic: "Warten auf Extern",
      priority: "diese_woche",
      intent: "warten",
      body: "Erbscheinantrag Hoffmann: Warte auf Gerichtsbeschluss. Bitte wöchentlich nachhalten.",
      matterId: byRef["2026-R-022"],
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "brief-email",
      topic: "Brief / E-Mail schreiben",
      priority: "heute",
      intent: "erledigen",
      body: "Mandantin Hoffmann bittet um kurzen Statusbericht — bitte 5–6 Sätze formulieren.",
      matterId: byRef["2026-R-022"],
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "custom",
      topic: "Termin vereinbaren",
      priority: "heute",
      intent: "erledigen",
      body: "Besprechung Müller Maschinenbau nächste Woche — bitte 2 Terminvorschläge an Frau Wagner.",
      matterId: byRef["2026-R-001"],
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "custom",
      topic: "Unterlagen anfordern",
      priority: "diese_woche",
      intent: "erledigen",
      body: "Für Bayern Bau fehlen noch die Abschlagsrechnungen 3 und 4 — bitte beim Justiziar anfordern.",
      matterId: byRef["2026-R-044"],
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "bitte-versenden",
      topic: "Bitte versenden",
      priority: "sofort",
      intent: "erledigen",
      body: "Eilantrag Weber fertig — bitte noch heute per beA einreichen und Quittung ablegen.",
      matterId: byRef["2026-R-031"],
    },
  ];

  let created = 0;
  for (const job of jobs) {
    const result = await createStaffMessageRow(tenant.id, job.from, {
      ballHolderId: job.to,
      topicKey: job.topicKey,
      topic: job.topic,
      priority: job.priority,
      dueDate: dueDateForStaffMessagePriority(job.priority) || null,
      intent: job.intent,
      body: job.body,
      module: "legal",
      matterId: job.matterId,
    });
    if ("error" in result) {
      throw new Error(`${job.topic}: ${result.error}`);
    }
    created += 1;
  }

  console.log(`+${created} Aufträge für ${tenant.name} angelegt.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
