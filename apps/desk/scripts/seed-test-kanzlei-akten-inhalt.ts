import { config } from "dotenv";
import { randomUUID } from "node:crypto";

config({ path: ".env.local" });

/**
 * Ergänzt test-kanzlei um Gegner, Schreiben und Akten-Dokumente (S3).
 * Voraussetzung: Mandanten/Akten aus seed-test-kanzlei.ts.
 *
 * Usage: pnpm exec tsx scripts/seed-test-kanzlei-akten-inhalt.ts [--force]
 */
function pdfBytes(title: string, lines: string[]): Uint8Array {
  const escape = (value: string) =>
    value
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/[^\x20-\x7E]/g, "?");

  const contentLines = [
    "BT",
    "/F1 14 Tf",
    "50 750 Td",
    `(${escape(title)}) Tj`,
    "/F1 11 Tf",
    "0 -28 Td",
    ...lines.flatMap((line, index) => {
      const escaped = `(${escape(line)}) Tj`;
      return index === 0 ? [escaped] : ["0 -16 Td", escaped];
    }),
    "ET",
  ];
  const stream = contentLines.join("\n");
  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n",
    `4 0 obj<< /Length ${Buffer.byteLength(stream, "utf8")} >>stream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

async function main() {
  const { and, eq, sql } = await import("drizzle-orm");
  const { createLetterRow } = await import("../lib/letters/storage");
  const {
    createMatterFileRow,
    matterFileObjectKey,
  } = await import("../lib/matters/files-storage");
  const { uploadObject } = await import("../lib/storage/s3");
  const { db } = await import("../lib/db");
  const {
    letters,
    matterFiles,
    matterParties,
    matters,
    tenants,
    users,
  } = await import("../lib/db/schema");
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
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenant.id),
        eq(users.email, "jason.kleuster@it-roof.com")
      )
    )
    .limit(1);

  if (!jason) {
    throw new Error("User jason.kleuster@it-roof.com fehlt in test-kanzlei.");
  }

  const matterRows = await withTenantDb(tenant.id, async (tx) =>
    tx
      .select({
        id: matters.id,
        title: matters.title,
        reference: matters.reference,
      })
      .from(matters)
      .where(eq(matters.tenantId, tenant.id))
  );

  const byRef = new Map(
    matterRows
      .filter((row) => row.reference.trim())
      .map((row) => [row.reference.trim(), row])
  );

  const required = [
    "2026-R-001",
    "2026-R-014",
    "2026-R-022",
    "2026-R-031",
    "2026-R-044",
  ] as const;

  for (const ref of required) {
    if (!byRef.has(ref)) {
      throw new Error(
        `Akte ${ref} fehlt — zuerst: pnpm exec tsx scripts/seed-test-kanzlei.ts`
      );
    }
  }

  const matterMueller = byRef.get("2026-R-001")!;
  const matterSchmidt = byRef.get("2026-R-014")!;
  const matterHoffmann = byRef.get("2026-R-022")!;
  const matterWeber = byRef.get("2026-R-031")!;
  const matterBayern = byRef.get("2026-R-044")!;

  if (force) {
    await withTenantDb(tenant.id, async (tx) => {
      await tx.execute(
        sql`delete from matter_files where tenant_id = ${tenant.id}`
      );
      await tx.execute(
        sql`delete from matter_parties where tenant_id = ${tenant.id}`
      );
      await tx.execute(
        sql`delete from letters where tenant_id = ${tenant.id}`
      );
    });
    console.log("Bestehende Parteien, Schreiben und Akten-Dateien gelöscht.");
  } else {
    const existing = await withTenantDb(tenant.id, async (tx) => {
      const parties = await tx
        .select({ id: matterParties.id })
        .from(matterParties)
        .where(eq(matterParties.tenantId, tenant.id))
        .limit(1);
      const docs = await tx
        .select({ id: matterFiles.id })
        .from(matterFiles)
        .where(eq(matterFiles.tenantId, tenant.id))
        .limit(1);
      const letterRows = await tx
        .select({ id: letters.id })
        .from(letters)
        .where(eq(letters.tenantId, tenant.id))
        .limit(1);
      return {
        parties: parties.length > 0,
        files: docs.length > 0,
        letters: letterRows.length > 0,
      };
    });
    if (existing.parties && existing.files && existing.letters) {
      console.log(
        "Akten-Inhalt schon vorhanden. Mit --force neu erzeugen."
      );
      process.exit(0);
    }
  }

  async function insertParty(input: {
    matterId: string;
    role: "opponent" | "party" | "other";
    kind: "company" | "person";
    name: string;
    firstName?: string;
    lastName?: string;
    street?: string;
    postalCode?: string;
    city?: string;
  }) {
    await withTenantDb(tenant.id, async (tx) => {
      await tx.insert(matterParties).values({
        tenantId: tenant.id,
        matterId: input.matterId,
        role: input.role,
        kind: input.kind,
        name: input.name,
        firstName: input.firstName ?? "",
        lastName: input.lastName ?? "",
        street: input.street ?? "",
        postalCode: input.postalCode ?? "",
        city: input.city ?? "",
      });
    });
  }

  async function insertFile(input: {
    matterId: string;
    filename: string;
    mimeType: string;
    body: Uint8Array;
  }) {
    const fileId = randomUUID();
    const storageKey = matterFileObjectKey(
      tenant.id,
      input.matterId,
      fileId,
      input.filename
    );
    await uploadObject(storageKey, input.body, input.mimeType);
    const row = await createMatterFileRow({
      tenantId: tenant.id,
      userId: jason.id,
      matterId: input.matterId,
      module: "legal",
      storageKey,
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.body.byteLength,
    });
    if (!row) {
      throw new Error(`Datei ${input.filename} konnte nicht gespeichert werden.`);
    }
  }

  // ── Parteien ────────────────────────────────────────────────────────────
  await insertParty({
    matterId: matterMueller.id,
    role: "opponent",
    kind: "company",
    name: "Nordstahl Zuliefer AG",
    street: "Hafenring 9",
    postalCode: "20457",
    city: "Hamburg",
  });
  await insertParty({
    matterId: matterSchmidt.id,
    role: "opponent",
    kind: "person",
    name: "Klaus Berger",
    firstName: "Klaus",
    lastName: "Berger",
    street: "Königstraße 12",
    postalCode: "90402",
    city: "Nürnberg",
  });
  await insertParty({
    matterId: matterHoffmann.id,
    role: "party",
    kind: "person",
    name: "Lisa Hoffmann",
    firstName: "Lisa",
    lastName: "Hoffmann",
    street: "Gartenweg 7",
    postalCode: "90489",
    city: "Nürnberg",
  });
  await insertParty({
    matterId: matterWeber.id,
    role: "opponent",
    kind: "company",
    name: "TechNova Solutions GmbH",
    street: "Maximilianstraße 35",
    postalCode: "80539",
    city: "München",
  });
  await insertParty({
    matterId: matterBayern.id,
    role: "opponent",
    kind: "company",
    name: "SubBau Süd GmbH",
    street: "Werkstraße 4",
    postalCode: "86165",
    city: "Augsburg",
  });

  // ── Schreiben ───────────────────────────────────────────────────────────
  await createLetterRow(tenant.id, jason.id, {
    title: "Anschreiben Lieferantenvertrag",
    kind: "schreiben",
    subject: "Vertragsentwurf — Bitte um Stellungnahme",
    salutation: "Sehr geehrte Damen und Herren,",
    body: "anbei übersenden wir den überarbeiteten Entwurf des Lieferantenvertrags. Bitte prüfen Sie insbesondere die Haftungsklauseln in Ziffer 8 und die Kündigungsregelung in Ziffer 12.\n\nFür Rückfragen stehen wir gerne zur Verfügung.",
    closing: "Mit freundlichen Grüßen",
    module: "legal",
    matterId: matterMueller.id,
    recipientEmail: "einkauf@nordstahl.example",
  });

  await createLetterRow(tenant.id, jason.id, {
    title: "Räumungsaufforderung Gewerberaum",
    kind: "schreiben",
    subject: "Aufforderung zur Räumung — Königstraße 12",
    salutation: "Sehr geehrter Herr Berger,",
    body: "trotz mehrfacher Mahnung sind die rückständigen Mieten nicht ausgeglichen. Wir fordern Sie auf, die Gewerbefläche bis zum 30.04.2026 geräumt und besenrein zurückzugeben.\n\nAndernfalls werden wir Klage erheben und die Kosten dem Mieter auferlegen lassen.",
    closing: "Mit freundlichen Grüßen",
    module: "legal",
    matterId: matterSchmidt.id,
  });

  await createLetterRow(tenant.id, jason.id, {
    title: "Aktennotiz Güteverhandlung",
    kind: "aktennotiz",
    subject: "Vorbereitung Güteverhandlung Weber ./. TechNova",
    salutation: "",
    body: "Güteverhandlung vor dem ArbG München terminiert. Mandant bringt Arbeitsvertrag, Abmahnungen und Zeugnis mit. Vergleichsspielraum bis zwei Bruttomonatsgehälter freigegeben.",
    closing: "",
    module: "legal",
    matterId: matterWeber.id,
  });

  await createLetterRow(tenant.id, jason.id, {
    title: "Zahlungserinnerung Werklohn",
    kind: "email",
    subject: "Erinnerung offene Werklohnforderung Baustelle Nord",
    salutation: "Sehr geehrte Damen und Herren,",
    body: "trotz unserer Rechnung vom 12.01.2026 ist der Betrag von 48.320,00 EUR noch nicht eingegangen. Wir bitten um Überweisung binnen zehn Tagen unter Angabe des Aktenzeichens 2026-R-044.",
    closing: "Mit freundlichen Grüßen",
    module: "legal",
    matterId: matterBayern.id,
    recipientEmail: "buchhaltung@subbau-sued.example",
  });

  await createLetterRow(tenant.id, jason.id, {
    title: "Nachlass — Bitte um Unterlagen",
    kind: "schreiben",
    subject: "Nachlassangelegenheit Hoffmann — fehlende Belege",
    salutation: "Sehr geehrte Frau Hoffmann,",
    body: "für das Erbscheinverfahren benötigen wir noch das Nachlassverzeichnis sowie Kontoauszüge der letzten zwölf Monate. Bitte übersenden Sie die Unterlagen digital oder per Post.",
    closing: "Mit freundlichen Grüßen",
    module: "legal",
    matterId: matterHoffmann.id,
  });

  // ── Dokumente (PDF + TXT) ───────────────────────────────────────────────
  const docs: Array<{
    matterId: string;
    filename: string;
    mimeType: string;
    body: Uint8Array;
  }> = [
    {
      matterId: matterMueller.id,
      filename: "Lieferantenvertrag-Entwurf.pdf",
      mimeType: "application/pdf",
      body: pdfBytes("Lieferantenvertrag - Entwurf", [
        "Akte: 2026-R-001  |  Mueller Maschinenbau GmbH",
        "Gegenseite: Nordstahl Zuliefer AG",
        "",
        "1. Vertragsgegenstand: Lieferung von Stahlteilen",
        "2. Laufzeit: 24 Monate ab Unterzeichnung",
        "3. Haftung: Begrenzt auf Auftragswert je Lieferung",
        "4. Kuendigung: 3 Monate zum Quartalsende",
        "",
        "Hinweis: Demo-PDF fuer Test Kanzlei.",
      ]),
    },
    {
      matterId: matterMueller.id,
      filename: "Vertragsnotiz.txt",
      mimeType: "text/plain; charset=utf-8",
      body: new TextEncoder().encode(
        [
          "Vertragsnotiz — Müller Maschinenbau GmbH",
          "Aktenzeichen: 2026-R-001",
          "",
          "Offene Punkte:",
          "- Haftungsbegrenzung in Ziffer 8 noch zu eng",
          "- Audit-Rechte beim Zulieferer fehlen",
          "- Preisgleitklausel vom Mandanten gewünscht",
          "",
          "Nächster Schritt: Gegenentwurf an Nordstahl senden.",
        ].join("\n")
      ),
    },
    {
      matterId: matterSchmidt.id,
      filename: "Mietvertrag-Auszug.pdf",
      mimeType: "application/pdf",
      body: pdfBytes("Mietvertrag - Auszug", [
        "Akte: 2026-R-014  |  Schmidt & Partner Immobilien",
        "Mieter: Klaus Berger",
        "Objekt: Koenigstrasse 12, Nuernberg",
        "",
        "Monatsmiete netto: 3.850,00 EUR",
        "Rueckstand: 3 Monate",
        "Kuendigung: ordentlich zum 31.03.2026",
        "",
        "Demo-PDF fuer Test Kanzlei.",
      ]),
    },
    {
      matterId: matterSchmidt.id,
      filename: "Mahnung-Februar.txt",
      mimeType: "text/plain; charset=utf-8",
      body: new TextEncoder().encode(
        [
          "Mahnung — Gewerberaum Königstraße 12",
          "Aktenzeichen: 2026-R-014",
          "",
          "Fällig seit: 01.12.2025, 01.01.2026, 01.02.2026",
          "Gesamtrückstand: 11.550,00 EUR zzgl. Nebenkosten",
          "",
          "Zustellung der letzten Mahnung: 10.02.2026 per Einschreiben.",
        ].join("\n")
      ),
    },
    {
      matterId: matterHoffmann.id,
      filename: "Nachlassverzeichnis-Entwurf.pdf",
      mimeType: "application/pdf",
      body: pdfBytes("Nachlassverzeichnis - Entwurf", [
        "Akte: 2026-R-022  |  Anna Hoffmann",
        "Erblasser: Hans Hoffmann, verstorben 14.11.2025",
        "",
        "Aktiva (vorlaeufig):",
        "- Girokonto Sparkasse: ca. 12.400 EUR",
        "- Eigentumswohnung Nuernberg: Verkehrswert offen",
        "- Haushaltsgegenstaende",
        "",
        "Passiva: Bestattungskosten ca. 4.800 EUR",
        "",
        "Demo-PDF fuer Test Kanzlei.",
      ]),
    },
    {
      matterId: matterWeber.id,
      filename: "Kuendigungsschreiben.pdf",
      mimeType: "application/pdf",
      body: pdfBytes("Kuendigungsschreiben Arbeitgeber", [
        "Akte: 2026-R-031  |  Dr. Markus Weber",
        "Arbeitgeber: TechNova Solutions GmbH",
        "",
        "Zugang der Kuendigung: 03.03.2026",
        "Klagefrist: 24.03.2026 (3 Wochen)",
        "Streitgegenstand: Kuendigungsschutz",
        "",
        "Demo-PDF fuer Test Kanzlei.",
      ]),
    },
    {
      matterId: matterWeber.id,
      filename: "Arbeitsvertrag-Auszug.txt",
      mimeType: "text/plain; charset=utf-8",
      body: new TextEncoder().encode(
        [
          "Arbeitsvertrag — Auszug",
          "Mandant: Dr. Markus Weber",
          "Arbeitgeber: TechNova Solutions GmbH",
          "",
          "Beginn: 01.04.2019",
          "Position: Senior Consultant",
          "Jahreszielgehalt: 92.000 EUR",
          "Kündigungsfrist: 3 Monate zum Monatsende",
          "",
          "Abmahnungen laut Akte: 1 (verhaltensbedingt, 2025).",
        ].join("\n")
      ),
    },
    {
      matterId: matterBayern.id,
      filename: "Rechnung-Werklohn.pdf",
      mimeType: "application/pdf",
      body: pdfBytes("Rechnung Werklohn Baustelle Nord", [
        "Akte: 2026-R-044  |  Bayern Bau AG",
        "Schuldner: SubBau Sued GmbH",
        "",
        "Rechnung Nr. BB-2026-118",
        "Betrag: 48.320,00 EUR netto",
        "Leistungszeitraum: Nov 2025 - Jan 2026",
        "Faelligkeit: 26.01.2026",
        "",
        "Demo-PDF fuer Test Kanzlei.",
      ]),
    },
    {
      matterId: matterBayern.id,
      filename: "Aufmassliste.txt",
      mimeType: "text/plain; charset=utf-8",
      body: new TextEncoder().encode(
        [
          "Aufmaßliste — Baustelle Nord",
          "Aktenzeichen: 2026-R-044",
          "",
          "Pos. 1  Rohbauarbeiten Erdgeschoss     18.200,00 EUR",
          "Pos. 2  Stahlbetonarbeiten Obergeschoss 22.450,00 EUR",
          "Pos. 3  Nachträge (genehmigt)            7.670,00 EUR",
          "",
          "Summe netto: 48.320,00 EUR",
        ].join("\n")
      ),
    },
  ];

  for (const doc of docs) {
    await insertFile(doc);
  }

  console.log("Test Kanzlei — Akten-Inhalt ergänzt:");
  console.log(`  Tenant:    ${tenant.name} (${tenant.slug})`);
  console.log("  Parteien:  5");
  console.log("  Schreiben: 5");
  console.log(`  Dateien:   ${docs.length} (PDF/TXT in S3)`);
  console.log("  Akten:     2026-R-001 … 2026-R-044");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
