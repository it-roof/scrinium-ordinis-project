const CONTACT_MAIL =
  "mailto:hello@scrinium-ordinis.de?subject=KI-Schulung%20Rechtsanwalt%20%E2%80%93%20Termin%20anfragen&body=Guten%20Tag%2C%0A%0Awir%20interessieren%20uns%20f%C3%BCr%20die%20KI-Schulung%20f%C3%BCr%20Rechtsanw%C3%A4lte.%0A%0AKanzlei%3A%0ATeilnehmerzahl%3A%0ABevorzugtes%20Format%20(Halbtag%2FTag%2C%20vor%20Ort%2Fremote)%3A%0AWunschtermin%20%2F%20Zeitfenster%3A%0A%0AMit%20freundlichen%20Gr%C3%BC%C3%9Fen%0A";

export const kiSchulungMeta = {
  title: "KI-Schulung für Rechtsanwälte",
  description:
    "Praxis-Schulung für Rechtsanwälte und Kanzleiteams: Verschwiegenheit und DSGVO beachten, Pseudonymisierung vor dem Prompt, Sachverhalt und Schriftsatz mit KI vorbereiten — inkl. Checkliste und Kanzleistandard.",
  path: "/ki-schulung-rechtsanwalt",
} as const;

export const kiSchulungNav = [
  { href: "#nutzen", label: "Nutzen" },
  { href: "#inhalte", label: "Inhalte" },
  { href: "#ablauf", label: "Ablauf" },
  { href: "#preise", label: "Preise" },
  { href: "#kontakt", label: "Termin" },
] as const;

export const kiSchulungProductHero = {
  eyebrow: "Mandatsbearbeitung mit KI",
  title: "KI-Schulung für Rechtsanwälte.",
  lead:
    "Intensivschulung für Rechtsanwälte und Kanzleien. Bearbeiten Sie das Mandat vom Erstkontakt bis zum Abschluss. Erreichen Sie Effizienzgewinne mithilfe der KI in den Bereichen Zeitaufwendung, Profitabilität und Wissen — mit Endkontrolle beim Anwender.",
  primaryCta: { href: "#preise", label: "Schulung anfragen" },
  secondaryCta: { href: "#ablauf", label: "Ablauf ansehen" },
  imageSrc: "/generated/ki-schulung-hero.jpg",
  imageAlt: "Heller Kanzleiarbeitsplatz mit Akte und Laptop",
  floatCards: [
    {
      label: "Schulung",
      text: "Halbtags oder ganztags, vor Ort oder online",
    },
    {
      label: "Praxisnahe Übung",
      text: "Mandat mithilfe von KI vom Erstkontakt bis zum Abschluss bearbeiten",
    },
    {
      label: "Ergebnis",
      text: "Klarer Ablauf und Arbeitsregeln für Ihr Team — sofort einsetzbar",
    },
  ],
};

export const kiSchulungTrust = {
  lead: "Kanzleien, mit denen wir bereits arbeiten.",
  logos: [
    {
      name: "Dr. Schneiderbanger & Kollegen",
      src: "/logos/schneiderbanger.png",
      href: "https://www.dr-schneiderbanger.de/",
    },
  ],
};

export const kiSchulungFeatureRows = {
  items: [
    {
      title: "Weniger Zeitverlust in der Fallbearbeitung.",
      body: "Mit einem klaren Ablauf können Sie Sachverhalt, Gliederung und Entwurf schneller vorbereiten — und behalten die rechtliche Endkontrolle. Die Schulung zeigt, wo KI in der Akte Zeit spart, ohne den Fall aus der Hand zu geben.",
      points: [
        "Schnellerer Einstieg in den Sachverhalt",
        "Entwürfe und Gliederungen zügiger aufsetzen",
        "Prüfung bleibt beim Berufsträger",
      ],
      imageSrc: "/generated/ki-schulung-rules.jpg",
      imageAlt: "Drei Aktenmappen auf dem Konferenztisch — gemeinsamer Standard",
      cta: { href: "#ablauf", label: "Ablauf ansehen" },
    },
    {
      title: "Unterstützung beim Sachverhalt — Endkontrolle bleibt bei Ihnen.",
      body: "Die Schulung zeigt, wie Sie KI im Kanzleialltag DSGVO- und BRAO-konform nutzen — ohne Verschwiegenheit und Datenschutz zu gefährden. Die rechtliche Endkontrolle bleibt bei Ihnen als Berufsträger.",
      points: [
        "DSGVO-konformer Umgang mit Daten",
        "BRAO und Verschwiegenheit (§ 203 StGB) beachten",
        "Endkontrolle bleibt beim Berufsträger",
      ],
      imageSrc: "/generated/ki-schulung-write.jpg",
      imageAlt: "Schreibplatz mit Block, Stift und Tablet — Entwurf und Prüfung",
      cta: { href: "#inhalte", label: "Inhalte ansehen" },
    },
    {
      title: "Übung an Praxis und Ihrem Fachgebiet.",
      body: "Sie lernen, das Mandat von Anfang bis Ende zu bearbeiten — und übertragen die Methode auf das Rechtsgebiet Ihrer Kanzlei. Auf Wunsch an anonymisierten eigenen Fällen.",
      points: [
        "Das Mandat von Anfang bis Ende bearbeiten",
        "Anwendung im Fachgebiet Ihres Teams",
        "Von der Übung in den Kanzleialltag",
      ],
      imageSrc: "/generated/ki-schulung-case.jpg",
      imageAlt: "Besprechungsraum mit Akte zwischen zwei Stühlen",
      cta: { href: "#ablauf", label: "Ablauf ansehen" },
    },
  ],
};

export const kiSchulungFeatureCards = {
  heading: "Was die Schulung vermittelt",
  lead:
    "Bausteine für Schriftsatz, Akte und Team — aus der Schulung für Rechtsanwälte, im Kanzleialltag einsetzbar.",
  items: [
    {
      title: "Pseudonym-Checkliste",
      description:
        "Namen, Aktenzeichen, Beträge, Parteibezeichnungen — was vor dem Prompt zu entfernen ist.",
    },
    {
      title: "Prompt-Muster",
      description:
        "Für Sachverhalt, Schriftsatz, Gegenargumente und Mandantenschreiben.",
    },
    {
      title: "Prüfprotokoll",
      description:
        "Wie KI-Ausgabe gelesen und verantwortet wird, bevor sie in den Schriftsatz eingeht.",
    },
    {
      title: "Rollen & Freigabe",
      description:
        "Partner, Associate, Sekretariat — wer promptet, wer prüft, wer freigibt.",
    },
    {
      title: "Berufsgeheimnis, § 203 StGB & DSGVO",
      description:
        "Erlaubte und riskante Use-Cases. Wann Auftragsverarbeitung nötig ist.",
    },
    {
      title: "Format",
      description:
        "1–12 Personen einer Kanzlei. Halbtag oder Tag — vor Ort oder online.",
    },
  ],
};

export const kiSchulungQuote = {
  heading: "Was Berufsträger sagen",
  items: [
    {
      value: "Klarheit",
      quote:
        "Durch klare Freigaben und Pseudonym-Regeln konnten wir KI im Schriftsatz-Alltag nutzen — ohne dass Associates allein experimentieren.",
      attribution: "Managing Partner",
      role: "Wirtschaftsrechtskanzlei",
    },
    {
      value: "Prüfung",
      quote:
        "Die Zeit bis zum belastbaren Entwurf ist kürzer geworden. Die rechtliche Prüfung bleibt bei uns — das war die Bedingung.",
      attribution: "Rechtsanwältin",
      role: "Sozietät",
    },
    {
      value: "Umsetzung",
      quote:
        "Checkliste und Musterprompts lagen am Abend vor. Am nächsten Werktag in der Akte eingesetzt.",
      attribution: "Partnerin",
      role: "12 Berufsträger",
    },
  ],
};

export const kiSchulungDeepDive = {
  heading: "Ergebnis der Schulung: Arbeitsstandard",
  lead:
    "Nach der Schulung haben Sie einen kurzen, gemeinsamen Standard für Ihr Team — kein weiteres Tool, das niemand öffnet.",
  imageAlt: "Arbeitsstandard und Checkliste in der Kanzlei",
  points: [
    {
      title: "Derselbe Ablauf für alle",
      description:
        "Aufgabe wählen, Kontext bauen, pseudonymisieren, prompten, prüfen — unabhängig davon, wer im Team sitzt.",
    },
    {
      title: "Auf eine Seite gebracht",
      description:
        "Rollen, Freigabe und Grenzen (§ 203 / DSGVO) in einem 1-Seiter, den Sie intern weitergeben können.",
    },
  ],
};

export const kiSchulungAgenda = {
  heading: "Ablauf der Schulung für Rechtsanwälte",
  lead:
    "So führt die Schulung Rechtsanwälte und Kanzleiteam Schritt für Schritt an das Thema heran: zuerst Rahmen und Regeln, dann Grundlagen, dann Übung am Fall — zugeschnitten auf die Fachgebiete Ihrer Kanzlei. Vor Ort oder online.",
  items: [
    {
      year: "01",
      title: "Vorgespräch",
      description:
        "Einstieg: Wir klären Arbeitsbereiche und Fachgebiete Ihrer Kanzlei. Daraus entsteht die Ausrichtung der Schulung — bevor es in die Inhalte geht.",
    },
    {
      year: "02",
      title: "Vorwort & Compliance",
      description:
        "Gemeinsamer Start: Datenschutz, Verschwiegenheitspflicht und gesetzliche Grenzen. Damit ist klar, unter welchem Rahmen Sie mit KI arbeiten dürfen.",
    },
    {
      year: "03",
      title: "KI-Grundlagen",
      description:
        "Heranführen an die Technik: Was KI kann und wo ihre Grenzen liegen — Theorie und erste Praxis für den Kanzleialltag.",
    },
    {
      year: "04",
      title: "KI-Bibliothek",
      description:
        "Von der Idee zur Anwendung: Muster, Abläufe und wiederkehrende Bausteine, die Sie im Alltag wiederfinden und nutzen können.",
    },
    {
      year: "05",
      title: "Sachverhalt üben",
      description:
        "Erste Realübung: An einem Beispiel-Sachverhalt eines Mandanten wenden Sie das Gelernte an — unter Anleitung, mit Prüfung.",
    },
    {
      year: "06",
      title: "Sachverhalt abschließen",
      description:
        "Vertiefung: Ein Mandanten-Sachverhalt wird vollständig bearbeitet — von der Aufgabe über Prompt und Pseudonym bis zur Endkontrolle.",
    },
    {
      year: "07",
      title: "Fachgebiet der Kanzlei",
      description:
        "Transfer: Dieselbe Methode im eigenen Rechtsgebiet Ihres Teams — damit der Nutzen nicht abstrakt bleibt.",
    },
    {
      year: "08",
      title: "Fragen & Wünsche",
      description:
        "Abschluss im Raum: Offene Fragen, konkrete Wünsche, was Sie als Nächstes im Team festziehen wollen.",
    },
    {
      year: "09",
      title: "Optional: KI-Support",
      description:
        "Danach bei Bedarf: telefonisch oder per Online-Termin Unterstützung bei der Anwendung. Abrechnung nach Stundensatz.",
      badge: "Optional",
    },
  ],
};

export const kiSchulungMetrics = {
  heading: "Format",
  lead: "Damit Sie intern entscheiden können.",
  items: [
    { value: "4–8 Std.", label: "Halbtag oder ganzer Tag" },
    { value: "1–12", label: "Teilnehmende einer Kanzlei" },
    { value: "DE", label: "Vor Ort oder online" },
    { value: "1 Wo.", label: "Unterlagen danach" },
  ],
};

export const kiSchulungAudience = {
  heading: "Für wen",
  forTitle: "Geeignet, wenn Sie …",
  forItems: [
    "als Rechtsanwalt oder Partner KI verantworten wollen",
    "Associates und Sekretariat mitnehmen",
    "Verschwiegenheit und Qualität verbindlich regeln wollen",
    "mit Checkliste und Standard weiterarbeiten wollen",
  ],
  againstTitle: "Weniger geeignet, wenn Sie …",
  againstItems: [
    "Mandatsdaten im Klartext an öffentliche KI geben wollen",
    "nur Prompt-Tricks ohne Regeln suchen",
    "eine reine Software-Demo erwarten",
    "KI-Ausgabe ungeprüft übernehmen wollen",
  ],
};

export const kiSchulungIntegrations = {
  heading: "Einbindung in Ihren Kanzleialltag",
  lead:
    "Die Schulung für Rechtsanwälte knüpft an Ihre bestehenden Abläufe an — Akte, Schriftsatz, Korrespondenz und die Tools, die Sie bereits nutzen. Kein Systemwechsel nötig; die Methode lässt sich in den Alltag integrieren.",
  cta: { href: "#preise", label: "Schulung anfragen" },
  imageAlt: "Werkzeuge und Abläufe im Kanzlei-Alltag",
};

export const kiSchulungMidCta = {
  eyebrow: "Nächster Schritt",
  title: "Vorgespräch statt Pitch.",
  body: "Kurz klären: Teilnehmerzahl, Format, ob Halbtag ausreicht. Danach ein Terminvorschlag.",
  primaryCta: { href: "#preise", label: "Termin anfragen" },
  secondaryCta: { href: "#ablauf", label: "Ablauf" },
};

export const kiSchulungFaq = {
  heading: "FAQ",
  items: [
    {
      question: "Dürfen Mandatsdaten in die KI?",
      answer:
        "Im Klartext an öffentliche Dienste in der Regel nein. Wir klären Pseudonymisierung, Auftragsverarbeitung und Use-Cases, die Sie besser lassen.",
    },
    {
      question: "Brauchen wir Scrinium?",
      answer:
        "Nein. Optional als Praxisbeispiel — ohne Kaufzwang.",
    },
    {
      question: "Eigene Akten üben?",
      answer:
        "Ja, vorab anonymisiert oder pseudonymisiert. Sonst arbeiten wir mit Musterfällen.",
    },
    {
      question: "Was kostet es?",
      answer:
        "500 € netto pro Teilnehmer zuzüglich 19 % MwSt. (595 € brutto). Ab 8 Teilnehmern gelten 10 % Mengenrabatt auf die Netto-Summe. Im Kalkulator sehen Sie Rabatt, Netto, MwSt. und Brutto live.",
    },
    {
      question: "Wie läuft die Terminfindung?",
      answer:
        "Über die Anfrage auf der Seite oder per E-Mail. Wir melden uns mit Terminvorschlägen — in der Regel innerhalb eines Werktags.",
    },
  ],
};

export const kiSchulungRelated = {
  heading: "Weitere Themen",
  items: [
    {
      title: "KI für Rechtsanwälte",
      description:
        "Kanzlei-KI-Chat für den Arbeitsalltag — eigene Produktseite folgt.",
      href: "/ki-schulung-rechtsanwalt#preise",
    },
    {
      title: "Pseudonymisierung in der Praxis",
      description:
        "Mandatsdaten schützen, bevor sie in ein KI-System gelangen.",
      href: "/ki-schulung-rechtsanwalt#inhalte",
    },
    {
      title: "Arbeitsstandard Freigabe",
      description:
        "Rollen und Regeln für Partner, Associates und Sekretariat.",
      href: "/ki-schulung-rechtsanwalt#standard",
    },
    {
      title: "Ablauf der Schulung",
      description:
        "Von Vorgespräch über Compliance bis zur Übung am Sachverhalt.",
      href: "/ki-schulung-rechtsanwalt#ablauf",
    },
    {
      title: "Berufsgeheimnis & Use-Cases",
      description:
        "Welche Anwendungen vertretbar sind — und welche Sie besser lassen.",
      href: "/ki-schulung-rechtsanwalt#inhalte",
    },
    {
      title: "Scrinium Desk",
      description:
        "Optional: die Kanzlei-Plattform als Praxisbeispiel — ohne Kaufzwang.",
      href: "https://app.scrinium-ordinis.de",
    },
  ],
};

/** Konkretes Angebot + Teilnehmer-Kalkulator — inhaltlich unverändert lassen */
export const kiSchulungPricing = {
  eyebrow: "Angebot · KI-Schulung für Rechtsanwälte",
  heading: "Klarer Preis. Pro Teilnehmer.",
  lead:
    "Die Schulung für Ihre Kanzlei findet vor Ort oder online statt — gleicher Schulungspreis. Bei Vor-Ort-Terminen werden Fahrtkosten zusätzlich berechnet.",
  pricePerParticipant: 500,
  currencyLabel: "EUR",
  minParticipants: 1,
  maxParticipants: 12,
  defaultParticipants: 1,
  unitLabel: "pro Teilnehmer",
  totalLabel: "Gesamt netto",
  vatRate: 0.19,
  vatLabel: "MwSt. 19 %",
  netLabel: "netto",
  grossLabel: "Gesamt brutto",
  volumeDiscountFrom: 8,
  volumeDiscountRate: 0.1,
  volumeDiscountLabel: "Mengenrabatt 10 %",
  includes: [
    "Vor Ort oder online — Sie wählen das Format",
    "Halbtag oder ganzer Tag",
    "Ab 8 Teilnehmern: 10 % Mengenrabatt auf die Netto-Summe",
    "Checkliste, Prompt-Muster und 1-Seiten-Standard",
    "Unterlagen innerhalb einer Woche nach der Schulung",
  ],
  notes: [
    "1–12 Teilnehmende einer Kanzlei.",
    "Ab 8 Teilnehmern: 10 % Rabatt auf die Netto-Summe, MwSt. danach.",
    "Vor Ort: Fahrtkosten zusätzlich — nach Entfernung und Absprache.",
    "Online: keine Fahrtkosten.",
  ],
  onSiteTravelNote:
    "Bei Vor Ort werden Fahrtkosten zusätzlich berechnet (nach Entfernung, vor der Buchung transparent).",
  primaryCta: { href: CONTACT_MAIL, label: "Schulung anfragen" },
  formats: [
    { id: "vor-ort", label: "Vor Ort" },
    { id: "online", label: "Online" },
  ],
  defaultFormatId: "vor-ort",
  durations: [
    { id: "halbtag", label: "Halbtag" },
    { id: "tag", label: "Ganzer Tag" },
  ],
  defaultDurationId: "halbtag",
  inquirySource: "ki-schulung-preise",
} as const;

/** Statische Preisliste unter dem Kalkulator */
export const kiSchulungPriceList = {
  eyebrow: "Preisliste",
  heading: "Detaillierte Preise.",
  lead:
    "Alle Beträge pro Teilnehmer. Vor Ort und online zum gleichen Schulungspreis. MwSt. zusätzlich.",
  items: [
    {
      label: "Schulung Halbtag",
      detail: "Vor Ort oder online · pro Teilnehmer",
      price: "500 € netto",
      note: "595 € brutto inkl. 19 % MwSt.",
    },
    {
      label: "Schulung ganzer Tag",
      detail: "Vor Ort oder online · pro Teilnehmer",
      price: "500 € netto",
      note: "595 € brutto inkl. 19 % MwSt.",
    },
    {
      label: "Mengenrabatt ab 8 Teilnehmern",
      detail: "Auf die Netto-Summe der Schulung",
      price: "−10 %",
    },
    {
      label: "Fahrtkosten (nur vor Ort)",
      detail: "Nach Entfernung und Absprache · vor der Buchung transparent",
      price: "zusätzlich",
    },
    {
      label: "Online-Format",
      detail: "Kein Anfahrtsaufwand",
      price: "keine Fahrtkosten",
    },
    {
      label: "Teilnehmerzahl",
      detail: "Eine Kanzlei pro Termin",
      price: "1–12 Personen",
    },
    {
      label: "Unterlagen",
      detail: "Checkliste, Prompt-Muster und 1-Seiten-Standard",
      price: "im Preis enthalten",
    },
  ],
  footnotes: [
    "Preise gelten für die KI-Schulung für Rechtsanwälte und Kanzleiteams.",
    "MwSt. 19 % wird auf die Netto-Summe berechnet; Mengenrabatt vor MwSt.",
  ],
} as const;

export const kiSchulungFinalCta = {
  heading: "Fragen zur KI-Schulung für Rechtsanwälte?",
  lead: "Im Vorgespräch klären wir Teilnehmerzahl, Format und Termin. Unverbindlich — wir melden uns mit einem Vorschlag.",
  primaryCta: { href: "#preise", label: "Schulung anfragen" },
  secondaryCta: { href: "tel:+491758793838", label: "Anrufen" },
  images: [{}, {}, {}],
};

export const kiSchulungClosing = {
  lineOne: "Was ist Ihr",
  lineTwo: "nächster Schritt?",
  href: CONTACT_MAIL,
};

/** Legacy aliases for older imports / OG */
export const kiSchulungMedia = {
  imageSrc: kiSchulungProductHero.imageSrc,
  imageAlt: kiSchulungProductHero.imageAlt,
};
