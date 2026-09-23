import { PRODUCT_NAME } from "@scrinium/brand";

export const dynamic = "force-static";

/** Platzhalter-Datenschutz-Erstinformation bis ein kanzleispezifisches PDF vorliegt. */
export default function DatenschutzErstinformationPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-5 py-12 text-[#1b1b1a]">
      <h1 className="font-heading text-2xl font-medium">
        Datenschutz-Erstinformation
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Diese Seite ist ein Platzhalter für die gesetzliche
        Datenschutz-Erstinformation der Kanzlei im Rahmen des
        Mandats-Aufnahmebogens von {PRODUCT_NAME}.
      </p>
      <p className="text-sm leading-relaxed">
        Die Kanzlei verarbeitet Ihre personenbezogenen Daten zur Anbahnung und
        Durchführung des Mandats. Rechtsgrundlagen sind insbesondere Art. 6 Abs.
        1 lit. b und lit. f DSGVO sowie berufsrechtliche Pflichten. Weitere
        Details erhalten Sie von Ihrer Kanzlei.
      </p>
      <p className="text-sm text-muted-foreground">
        Sie können dieses Fenster schließen und im Formular fortfahren.
      </p>
    </main>
  );
}
