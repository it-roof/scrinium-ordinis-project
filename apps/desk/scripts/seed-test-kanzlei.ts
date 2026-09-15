import { config } from "dotenv";

config({ path: ".env.local" });

/**
 * Realistische Demo-Daten nur für Tenant `test-kanzlei`.
 * Idempotent: bricht ab, wenn bereits Mandanten existieren (außer --force).
 *
 * Usage: pnpm exec tsx scripts/seed-test-kanzlei.ts [--force]
 */
async function main() {
  const { and, eq, sql, count } = await import("drizzle-orm");
  const { createClientRow, createPersonRow } = await import(
    "../lib/clients/storage"
  );
  const { createMatterRow } = await import("../lib/matters/storage");
  const { createPromptRow } = await import("../lib/prompts/storage");
  const { createStaffMessageRow } = await import(
    "../lib/staff-messages/storage"
  );
  const { createTextBlockRow } = await import("../lib/text-blocks/storage");
  const { dueDateForStaffMessagePriority, resolveStaffMessageDueDate } =
    await import("../lib/staff-messages/types");
  const { db } = await import("../lib/db");
  const { clients, tenants, users } = await import("../lib/db/schema");
  const { withTenantDb } = await import("../lib/tenant/db");

  const force = process.argv.includes("--force");

  const [tenant] = await db
    .select({ id: tenants.id, name: tenants.name, slug: tenants.slug })
    .from(tenants)
    .where(eq(tenants.slug, "test-kanzlei"))
    .limit(1);

  if (!tenant) {
    throw new Error("Tenant test-kanzlei nicht gefunden.");
  }

  const [jason] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenant.id),
        eq(users.email, "jason.kleuster@it-roof.com")
      )
    )
    .limit(1);

  const [elizabeth] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenant.id),
        eq(users.email, "elizabeth@it-roof.com")
      )
    )
    .limit(1);

  if (!jason || !elizabeth) {
    throw new Error(
      "Jason und/oder Elizabeth fehlen in test-kanzlei. Zuerst User anlegen."
    );
  }

  const existingClients = await withTenantDb(tenant.id, async (tx) => {
    const [row] = await tx
      .select({ value: count() })
      .from(clients)
      .where(eq(clients.tenantId, tenant.id));
    return Number(row?.value ?? 0);
  });

  if (existingClients > 0 && !force) {
    console.log(
      `Abbruch: test-kanzlei hat bereits ${existingClients} Mandanten. Mit --force erneut seedern (löscht Demo-Inhalt nicht).`
    );
    process.exit(0);
  }

  if (force && existingClients > 0) {
    await withTenantDb(tenant.id, async (tx) => {
      await tx.execute(
        sql`delete from staff_message_events where tenant_id = ${tenant.id}`
      );
      await tx.execute(
        sql`delete from staff_message_files where tenant_id = ${tenant.id}`
      );
      await tx.execute(
        sql`delete from staff_messages where tenant_id = ${tenant.id}`
      );
      await tx.execute(
        sql`delete from matters where tenant_id = ${tenant.id}`
      );
      await tx.execute(
        sql`delete from client_persons where tenant_id = ${tenant.id}`
      );
      await tx.execute(sql`delete from clients where tenant_id = ${tenant.id}`);
      await tx.execute(
        sql`delete from prompt_tag_assignments
            where prompt_id in (select id from prompts where tenant_id = ${tenant.id})`
      );
      await tx.execute(sql`delete from prompts where tenant_id = ${tenant.id}`);
      await tx.execute(
        sql`delete from prompt_tags where tenant_id = ${tenant.id}`
      );
      await tx.execute(
        sql`delete from text_block_tag_assignments
            where text_block_id in (select id from text_blocks where tenant_id = ${tenant.id})`
      );
      await tx.execute(
        sql`delete from text_blocks where tenant_id = ${tenant.id}`
      );
      await tx.execute(
        sql`delete from text_block_tags where tenant_id = ${tenant.id}`
      );
    });
    console.log("Bestehende Demo-Daten gelöscht.");
  }

  // Beide Rollen sollen dieselben freigeschalteten Bereiche sehen.
  await db
    .update(users)
    .set({ allowedModules: null })
    .where(eq(users.tenantId, tenant.id));

  await db
    .update(tenants)
    .set({ enabledModules: ["legal", "administration"] })
    .where(eq(tenants.id, tenant.id));

  const emptyPerson = {
    salutation: "",
    firstName: "",
    lastName: "",
    street: "",
    postalCode: "",
    city: "",
    country: "Deutschland",
    email: "",
    phone: "",
    mobile: "",
    notes: "",
  };

  const mueller = await createClientRow(tenant.id, jason.id, {
    kind: "company",
    name: "Müller Maschinenbau GmbH",
    ...emptyPerson,
    street: "Industriestraße 18",
    postalCode: "80339",
    city: "München",
    email: "info@mueller-maschinenbau.example",
    phone: "+49 89 1234560",
    notes: "Langjähriger Mandant — Vertrags- und Gesellschaftsrecht.",
    module: "legal",
  });

  await createPersonRow(tenant.id, jason.id, {
    clientId: mueller.id,
    salutation: "Frau",
    firstName: "Petra",
    lastName: "Wagner",
    role: "Geschäftsführerin",
    street: "Industriestraße 18",
    postalCode: "80339",
    city: "München",
    country: "Deutschland",
    email: "p.wagner@mueller-maschinenbau.example",
    phone: "+49 89 1234561",
    mobile: "+49 170 1112233",
    notes: "",
  });

  const schmidt = await createClientRow(tenant.id, jason.id, {
    kind: "company",
    name: "Schmidt & Partner Immobilien GmbH",
    ...emptyPerson,
    street: "Königstraße 12",
    postalCode: "90402",
    city: "Nürnberg",
    email: "kanzlei@schmidt-immobilien.example",
    phone: "+49 911 555010",
    notes: "Immobilien- und Mietrecht.",
    module: "legal",
  });

  await createPersonRow(tenant.id, jason.id, {
    clientId: schmidt.id,
    salutation: "Herr",
    firstName: "Thomas",
    lastName: "Becker",
    role: "Prokurist",
    street: "Königstraße 12",
    postalCode: "90402",
    city: "Nürnberg",
    country: "Deutschland",
    email: "t.becker@schmidt-immobilien.example",
    phone: "+49 911 555011",
    mobile: "",
    notes: "",
  });

  const hoffmann = await createClientRow(tenant.id, jason.id, {
    kind: "person",
    name: "Anna Hoffmann",
    salutation: "Frau",
    firstName: "Anna",
    lastName: "Hoffmann",
    street: "Gartenweg 7",
    postalCode: "90489",
    city: "Nürnberg",
    country: "Deutschland",
    email: "anna.hoffmann@example.com",
    phone: "+49 911 334455",
    mobile: "+49 172 9988776",
    notes: "Erbrecht / Nachlass.",
    module: "legal",
  });

  const weber = await createClientRow(tenant.id, jason.id, {
    kind: "person",
    name: "Dr. Markus Weber",
    salutation: "Herr",
    firstName: "Markus",
    lastName: "Weber",
    street: "Ludwigstraße 4",
    postalCode: "80539",
    city: "München",
    country: "Deutschland",
    email: "markus.weber@example.com",
    phone: "",
    mobile: "+49 151 4455667",
    notes: "Arbeitsrecht — Kündigungsschutz.",
    module: "legal",
  });

  const bayernBau = await createClientRow(tenant.id, jason.id, {
    kind: "company",
    name: "Bayern Bau AG",
    ...emptyPerson,
    street: "Baustellenallee 2",
    postalCode: "86150",
    city: "Augsburg",
    email: "recht@bayern-bau.example",
    phone: "+49 821 7788990",
    notes: "Baurecht / VOB.",
    module: "legal",
  });

  await createPersonRow(tenant.id, jason.id, {
    clientId: bayernBau.id,
    salutation: "Herr",
    firstName: "Stefan",
    lastName: "Richter",
    role: "Justiziar",
    street: "Baustellenallee 2",
    postalCode: "86150",
    city: "Augsburg",
    country: "Deutschland",
    email: "s.richter@bayern-bau.example",
    phone: "+49 821 7788991",
    mobile: "",
    notes: "",
  });

  const matterMueller = await createMatterRow(tenant.id, jason.id, {
    clientId: mueller.id,
    title: "Vertragsprüfung Lieferantenvertrag",
    reference: "2026-R-001",
    notes: "Rahmenvertrag mit Zulieferer — Klauseln Haftungsbegrenzung prüfen.",
    module: "legal",
  });

  const matterSchmidt = await createMatterRow(tenant.id, jason.id, {
    clientId: schmidt.id,
    title: "Mietstreit Objekt Königstraße 12",
    reference: "2026-R-014",
    notes: "Gewerberaummiete — Räumungsklage vorbereiten.",
    module: "legal",
  });

  const matterHoffmann = await createMatterRow(tenant.id, jason.id, {
    clientId: hoffmann.id,
    title: "Nachlassangelegenheit Hoffmann",
    reference: "2026-R-022",
    notes: "Erbscheinverfahren; Nachlassverzeichnis fehlt noch.",
    module: "legal",
  });

  const matterWeber = await createMatterRow(tenant.id, jason.id, {
    clientId: weber.id,
    title: "Kündigungsschutzklage",
    reference: "2026-R-031",
    notes: "Klagefrist beachten; Güteverhandlung terminiert.",
    module: "legal",
  });

  const matterBayern = await createMatterRow(tenant.id, jason.id, {
    clientId: bayernBau.id,
    title: "Werklohnforderung Baustelle Nord",
    reference: "2026-R-044",
    notes: "Offene Forderung ca. 48.000 €; Mahnung versendet.",
    module: "legal",
  });

  if (
    !matterMueller ||
    !matterSchmidt ||
    !matterHoffmann ||
    !matterWeber ||
    !matterBayern
  ) {
    throw new Error("Akte konnte nicht angelegt werden.");
  }

  const jobs: Array<{
    from: string;
    to: string;
    topicKey: string;
    topic: string;
    priority: "sofort" | "heute" | "diese_woche" | "keine";
    intent: "erledigen" | "pruefen" | "kenntnis" | "warten";
    body: string;
    matterId: string | null;
  }> = [
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "telefonnotiz",
      topic: "Telefonnotiz / Rückruf",
      priority: "sofort",
      intent: "erledigen",
      body: "Frau Hoffmann hat angerufen: Nachlassverzeichnis kommt morgen per Post. Bitte Rückruf heute Nachmittag.",
      matterId: matterHoffmann.id,
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "bitte-versenden",
      topic: "Bitte versenden",
      priority: "heute",
      intent: "erledigen",
      body: "Mahnung Königstraße 12 ist freigegeben — bitte heute noch per Einschreiben raus.",
      matterId: matterSchmidt.id,
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "bitte-nachbessern",
      topic: "Bitte nachbessern",
      priority: "heute",
      intent: "erledigen",
      body: "Im Entwurf an Müller fehlt noch die Klausel zur Schriftform. Bitte kurz ergänzen, dann versende ich.",
      matterId: matterMueller.id,
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "brief-email",
      topic: "Brief / E-Mail schreiben",
      priority: "heute",
      intent: "erledigen",
      body: "Bitte Frau Wagner (Müller Maschinenbau) eine kurze Bestätigung zum geprüften Lieferantenvertrag schicken — Entwurf liegt in der Akte.",
      matterId: matterMueller.id,
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "dokument-pruefen",
      topic: "Dokument zur Prüfung",
      priority: "diese_woche",
      intent: "pruefen",
      body: "Klageentwurf Kündigungsschutz Weber — bitte auf Fristen und Anlagen prüfen, bevor wir einreichen.",
      matterId: matterWeber.id,
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "warten",
      topic: "Warten auf Extern",
      priority: "diese_woche",
      intent: "warten",
      body: "Wir warten auf die Stellungnahme der Gegenseite im Mietstreit Schmidt. Bitte nachhalten.",
      matterId: matterSchmidt.id,
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "notiz",
      topic: "Nur zur Kenntnis",
      priority: "keine",
      intent: "kenntnis",
      body: "Bayern Bau: Werklohnforderung auf Wiedervorlage gesetzt. Keine Aktion nötig, nur zur Info.",
      matterId: matterBayern.id,
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "dokument-pruefen",
      topic: "Dokument zur Prüfung",
      priority: "heute",
      intent: "pruefen",
      body: "Vergleichsentwurf Bayern Bau — bitte Zahlen kurz gegenrechnen.",
      matterId: matterBayern.id,
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "brief-email",
      topic: "Brief / E-Mail schreiben",
      priority: "sofort",
      intent: "erledigen",
      body: "Fristende heute 16 Uhr: Einschreiben an Gegenseite Schmidt vorbereiten und zur Unterschrift vorlegen.",
      matterId: matterSchmidt.id,
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "bitte-versenden",
      topic: "Bitte versenden",
      priority: "heute",
      intent: "erledigen",
      body: "Vollmacht Hoffmann unterschrieben — bitte eingescannt an das Nachlassgericht schicken.",
      matterId: matterHoffmann.id,
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "telefonnotiz",
      topic: "Telefonnotiz / Rückruf",
      priority: "heute",
      intent: "erledigen",
      body: "Herr Becker (Schmidt Immobilien) möchte Rückruf zu den Nebenkostenabrechnungen. Erreichbar bis 12 Uhr.",
      matterId: matterSchmidt.id,
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "bitte-nachbessern",
      topic: "Bitte nachbessern",
      priority: "sofort",
      intent: "erledigen",
      body: "Im Schriftsatz Weber stimmt die Adresse des Arbeitgebers nicht. Bitte korrigieren und neu ausdrucken.",
      matterId: matterWeber.id,
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "telefonnotiz",
      topic: "Telefonnotiz / Rückruf",
      priority: "sofort",
      intent: "erledigen",
      body: "Nachlassgericht Nürnberg: Rückruf erbeten wegen fehlender Anlage zum Erbscheinantrag Hoffmann.",
      matterId: matterHoffmann.id,
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "bitte-versenden",
      topic: "Bitte versenden",
      priority: "heute",
      intent: "erledigen",
      body: "Terminbestätigung Güteverhandlung Weber an Mandanten und Gegenseite per E-Mail rausschicken.",
      matterId: matterWeber.id,
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "dokument-pruefen",
      topic: "Dokument zur Prüfung",
      priority: "diese_woche",
      intent: "pruefen",
      body: "Mietvertrag-Auszug Königstraße 12 eingescannt — bitte prüfen, ob Kündigungsfrist passt.",
      matterId: matterSchmidt.id,
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "notiz",
      topic: "Nur zur Kenntnis",
      priority: "keine",
      intent: "kenntnis",
      body: "Frau Wagner ist ab Montag zwei Wochen im Urlaub. Vertretung: Herr Klein (gleiche Firma).",
      matterId: matterMueller.id,
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "brief-email",
      topic: "Brief / E-Mail schreiben",
      priority: "heute",
      intent: "erledigen",
      body: "Kurze Zwischennachricht an Frau Hoffmann: Nachlassverzeichnis eingegangen, wir melden uns nach Prüfung.",
      matterId: matterHoffmann.id,
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "warten",
      topic: "Warten auf Extern",
      priority: "keine",
      intent: "warten",
      body: "Versicherung Bayern Bau hat Aktenzeichen angefordert — Antwort abwarten, Wiedervorlage in 10 Tagen.",
      matterId: matterBayern.id,
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "custom",
      topic: "Akte anlegen / Unterlagen sortieren",
      priority: "diese_woche",
      intent: "erledigen",
      body: "Neue Korrespondenz Schmidt vom Wochenende bitte in die Akte heften und Register aktualisieren.",
      matterId: matterSchmidt.id,
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "custom",
      topic: "Frist notieren",
      priority: "sofort",
      intent: "erledigen",
      body: "Einspruchsfrist Weber endet am 18.09. — bitte in der Fristenkontrolle eintragen und mir bestätigen.",
      matterId: matterWeber.id,
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "bitte-versenden",
      topic: "Bitte versenden",
      priority: "heute",
      intent: "erledigen",
      body: "Honorarnote Müller Maschinenbau freigegeben — bitte heute per E-Mail und Post versenden.",
      matterId: matterMueller.id,
    },
    {
      from: elizabeth.id,
      to: jason.id,
      topicKey: "telefonnotiz",
      topic: "Telefonnotiz / Rückruf",
      priority: "heute",
      intent: "erledigen",
      body: "Sachverständiger Müller hat angerufen: Ortstermin nächste Woche Dienstag 10 Uhr — bitte zusagen oder Alternativtermin.",
      matterId: matterMueller.id,
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "dokument-pruefen",
      topic: "Dokument zur Prüfung",
      priority: "sofort",
      intent: "pruefen",
      body: "Schriftsatz Schmidt (Räumung) final — bitte Anlagenliste und Zustellungsurkunden prüfen.",
      matterId: matterSchmidt.id,
    },
    {
      from: jason.id,
      to: elizabeth.id,
      topicKey: "brief-email",
      topic: "Brief / E-Mail schreiben",
      priority: "diese_woche",
      intent: "erledigen",
      body: "An Bayern Bau: Bitte um aktuelle Aufmaßliste zur Werklohnforderung — höflicher Erinnerungsbrief.",
      matterId: matterBayern.id,
    },
  ];

  for (const job of jobs) {
    const dueRaw = dueDateForStaffMessagePriority(job.priority);
    const result = await createStaffMessageRow(tenant.id, job.from, {
      ballHolderId: job.to,
      topicKey: job.topicKey,
      topic: job.topic,
      priority: job.priority,
      dueDate: resolveStaffMessageDueDate(dueRaw),
      intent: job.intent,
      body: job.body,
      module: "legal",
      matterId: job.matterId,
    });
    if ("error" in result) {
      throw new Error(`Auftrag fehlgeschlagen (${job.topic}): ${result.error}`);
    }
  }

  // ── Prompt-Bibliothek (Rechtsanwalt) ─────────────────────────────────────
  const promptSeeds: Array<{
    title: string;
    content: string;
    tags: string[];
  }> = [
    {
      title: "Schriftsatz — Kernaussagen extrahieren",
      content:
        "Fasse den folgenden Schriftsatz in fünf Bullet Points zusammen. Markiere Fristen, Anträge und strittige Punkte getrennt.",
      tags: ["Schriftsatz", "Analyse"],
    },
    {
      title: "Mandantentelefonat — Gesprächsnotiz",
      content:
        "Formuliere aus den Stichpunkten eine kurze, professionelle Gesprächsnotiz für die Akte: Anrufer, Anliegen, zugesagte nächsten Schritte, offene Fragen.",
      tags: ["Telefon", "Akte"],
    },
    {
      title: "Vergleichsvorschlag höflich formulieren",
      content:
        "Formuliere einen höflichen Vergleichsvorschlag an die Gegenseite. Ton: sachlich, ohne Schuldeingeständnis. Lasse Platzhalter für Betrag und Frist.",
      tags: ["Vergleich", "Korrespondenz"],
    },
    {
      title: "Fristkontrolle — Checkliste",
      content:
        "Erstelle eine Checkliste zur Fristkontrolle für die genannte Angelegenheit: berechnete Frist, Zustellung, Wiedervorlage, Verantwortliche.",
      tags: ["Frist", "Checkliste"],
    },
    {
      title: "Klageentwurf — Gliederung",
      content:
        "Schlage eine klare Gliederung für einen Klageentwurf vor (Parteien, Sachverhalt, Anträge, Begründung). Nutze nur die gelieferten Fakten.",
      tags: ["Klage", "Entwurf"],
    },
    {
      title: "E-Mail an Mandanten — Zwischenstand",
      content:
        "Schreibe eine kurze E-Mail an den Mandanten mit Zwischenstand: was erledigt ist, was noch offen ist, nächster Termin. Kein Juristendeutsch.",
      tags: ["Mandant", "E-Mail"],
    },
    {
      title: "Vertragsprüfung — Risikohinweise",
      content:
        "Prüfe den Vertragsentwurf auf typische Risiken (Haftung, Kündigung, Schriftform, Gerichtsstand). Liste nur konkrete Fundstellen mit kurzer Begründung.",
      tags: ["Vertrag", "Prüfung"],
    },
    {
      title: "Nachlass — fehlende Unterlagen",
      content:
        "Erstelle eine höfliche Liste fehlender Unterlagen für ein Erbscheinsverfahren, die wir dem Mandanten schicken können.",
      tags: ["Nachlass", "Mandant"],
    },
  ];

  for (const prompt of promptSeeds) {
    await createPromptRow(tenant.id, prompt);
  }

  // ── Textbausteine (Sekretär(in)) ─────────────────────────────────────────
  const textBlockSeeds: Array<{
    title: string;
    content: string;
    module: "general" | "legal" | "administration";
    tags: string[];
  }> = [
    {
      title: "Briefkopf — Absenderzeile",
      content:
        "Test Kanzlei\nRechtsanwälte\nMusterstraße 1\n80331 München\nTel. +49 89 0000000\nkanzlei@test-kanzlei.example",
      module: "general",
      tags: ["Brief", "Vorlage"],
    },
    {
      title: "Schlussformel — mit freundlichen Grüßen",
      content:
        "Mit freundlichen Grüßen\n\n___________________________\nTest Kanzlei",
      module: "general",
      tags: ["Brief", "Schluss"],
    },
    {
      title: "Empfangsbestätigung Unterlagen",
      content:
        "hiermit bestätigen wir den Erhalt Ihrer Unterlagen vom [Datum]. Wir prüfen diese und melden uns in Kürze bei Ihnen.",
      module: "legal",
      tags: ["Mandant", "Bestätigung"],
    },
    {
      title: "Terminbestätigung Güteverhandlung",
      content:
        "hiermit bestätigen wir den Termin zur Güteverhandlung am [Datum] um [Uhrzeit] vor dem [Gericht]. Bitte bringen Sie alle relevanten Unterlagen mit.",
      module: "legal",
      tags: ["Termin", "Gericht"],
    },
    {
      title: "Mahnung — höfliche Zahlungserinnerung",
      content:
        "trotz unserer Rechnung vom [Datum] ist der Betrag von [Betrag] € noch nicht bei uns eingegangen. Wir bitten um Überweisung binnen 10 Tagen.",
      module: "legal",
      tags: ["Mahnung", "Forderung"],
    },
    {
      title: "Vollmacht — Begleitschreiben",
      content:
        "anbei übersenden wir die unterzeichnete Vollmacht zur Verwendung in der Angelegenheit [Aktenzeichen]. Für Rückfragen stehen wir gerne zur Verfügung.",
      module: "legal",
      tags: ["Vollmacht", "Versand"],
    },
    {
      title: "Urlaubsvertretung — Standardhinweis",
      content:
        "in der Zeit vom [Datum] bis [Datum] ist [Name] nicht erreichbar. Die Vertretung übernimmt [Vertretung], erreichbar unter derselben Nummer.",
      module: "administration",
      tags: ["Vertretung", "Organisation"],
    },
    {
      title: "Aktenzeichen-Zeile",
      content: "Unser Zeichen: [Aktenzeichen]\nIhr Zeichen: [Gegenseite]",
      module: "legal",
      tags: ["Akte", "Brief"],
    },
    {
      title: "Einschreiben — Begleitvermerk",
      content:
        "Dieses Schreiben geht Ihnen per Einschreiben/Rückschein zu. Eine Kopie verbleibt in der Akte.",
      module: "legal",
      tags: ["Versand", "Einschreiben"],
    },
    {
      title: "Telefonnotiz — Vorlage",
      content:
        "Anruf von: [Name]\nDatum/Uhrzeit: [Datum]\nAnliegen: [Kurz]\nRückruf erbeten: ja/nein\nWeitergeleitet an: [Kollege]",
      module: "general",
      tags: ["Telefon", "Notiz"],
    },
  ];

  for (const block of textBlockSeeds) {
    await createTextBlockRow(tenant.id, block);
  }

  console.log("Test Kanzlei befüllt (RA + Sekretär(in)):");
  console.log(`  Tenant:         ${tenant.name} (${tenant.slug})`);
  console.log("  Bereiche:       Recht, Verwaltung (ohne Fachfunktionen)");
  console.log("  Mandanten:      5  → Sekretär(in)");
  console.log("  Akten:          5  → Sekretär(in)");
  console.log(`  Textbausteine:  ${textBlockSeeds.length}  → Sekretär(in)`);
  console.log(`  Prompts:        ${promptSeeds.length}  → Rechtsanwalt`);
  console.log(`  Aufgaben:       ${jobs.length}  → beide (Jason ↔ Elizabeth)`);
  console.log("  User:           Jason (RA) ↔ Elizabeth (Sekretär(in))");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
