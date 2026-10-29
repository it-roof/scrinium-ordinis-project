export const demoNav = [
  { href: "#home", label: "Home" },
  { href: "#work", label: "Work" },
  { href: "#about", label: "About" },
  { href: "#expertise", label: "Expertise" },
  { href: "#perspectives", label: "Perspectives" },
  { href: "#news", label: "News" },
] as const;

export const demoMediaHero = {
  eyebrow: "Scrinium",
  title: "Klarheit in der Kanzleiarbeit",
};

export const demoFeaturedCards = {
  heading: "Ausgewählte Module",
  viewAllHref: "#featured",
  viewAllLabel: "Alle Module",
  items: [
    {
      eyebrow: "Akten-Chat",
      title: "Ein regulierter Dialog mit optionaler Akte — immer pseudonymisiert vor der KI.",
      href: "#case",
    },
    {
      eyebrow: "Schreiben",
      title: "Entwürfe, die zum Kanzleistil passen — mit Textbausteinen und Prompt-Bibliothek.",
      href: "#case",
    },
    {
      eyebrow: "Dokumentation",
      title: "Sachverhalte strukturieren, statt Notizen zu jagen.",
      href: "#case",
    },
    {
      eyebrow: "Mandanten",
      title: "Bereichsgetrennt Recht und Steuer — eine App, klare Welten.",
      href: "#case",
    },
  ],
};

export const demoManifesto = {
  title: "Das Kanzlei-Werkzeug",
  lead:
    "Scrinium verbindet Dokumentation, Textbausteine und KI-Funktionen zu einem ruhigen Arbeitsplatz für die Kanzlei.",
  paragraphs: [
    "Keine Spielerei. Kein Dashboard-Bloat. Funktionen, die sich in der täglichen Arbeit rechtfertigen — für Teams ab der mittelgroßen Kanzlei.",
    "Daten bleiben strikt getrennt. Bereiche bleiben getrennt. Die Oberfläche bleibt ruhig.",
  ],
};

export const demoTimeline = {
  heading: "Von der Idee zum Werkzeug",
  lead: "Was einmal Handarbeit war, wird schrittweise zum System — ohne die Kanzlei zu überfordern.",
  items: [
    {
      year: "2024",
      title: "Textbausteine",
      description: "Wiederkehrende Formulierungen zentral, bereichsgetrennt.",
    },
    {
      year: "2025",
      title: "Akten & Mandanten",
      description: "Practice-scoped Datenmodell mit klarer Isolation.",
    },
    {
      year: "2025",
      title: "KI mit Pseudonym",
      description: "EU-Modelle, Consent, Residual-Gate — vor dem Prompt.",
    },
    {
      year: "2026",
      title: "Akten-Chat",
      description: "Ein Chat. Aktionen. Kontext aus der Akte.",
    },
    {
      year: "Jetzt",
      title: "Produktfläche",
      description: "Website und Desk in derselben Markensprache.",
    },
  ],
};

export const demoCapabilityTabs = {
  items: [
    {
      id: "akte",
      label: "Akte",
      title: "Die Akte als Arbeitsraum",
      description:
        "Mandanten, Parteien, Dateien und Chat an einem Ort — bereichsbezogen und mandantensicher.",
      href: "#case",
      linkLabel: "Akte erkunden",
    },
    {
      id: "ki",
      label: "KI",
      title: "KI, die in der Kanzlei bestehen darf",
      description:
        "Pseudonymisierung, EU-Region, Audit — und klare Actions statt freiem Prompt-Chaos.",
      href: "#case",
      linkLabel: "KI verstehen",
    },
    {
      id: "text",
      label: "Text",
      title: "Schreiben mit System",
      description:
        "Prompts und Textbausteine als Bibliothek — versionierbar, taggbar, kanzleitauglich.",
      href: "#case",
      linkLabel: "Textbausteine",
    },
    {
      id: "team",
      label: "Team",
      title: "Aufgaben statt Messenger",
      description:
        "Ball und Absicht: zuweisen, übergeben, abschließen — mit optionaler Akte.",
      href: "#case",
      linkLabel: "Aufgaben",
    },
  ],
};

export const demoQuotes = {
  heading: "Unsere Werte · Ihre Worte",
  items: [
    {
      value: "Ruhe",
      quote:
        "Endlich eine Oberfläche, die nicht nach Dashboard schreit — sondern nach Arbeit aussieht.",
      attribution: "Partnerin, mittelgroße Wirtschaftsrechtskanzlei",
    },
    {
      value: "Trennung",
      quote:
        "Recht und Steuer teilen nie dieselbe Inhaltsliste. Das war für uns nicht verhandelbar.",
      attribution: "IT-Verantwortlicher, Multi-Practice-Kanzlei",
    },
    {
      value: "Vertrauen",
      quote:
        "Pseudonym vor Bedrock — und wir sehen im Audit, was passiert ist.",
      attribution: "Datenschutzbeauftragter",
    },
  ],
};

export const demoMetrics = {
  heading: "Ergebnis",
  lead: "Platzhalter-Kennzahlen für die Demo — später durch echte Produktmetriken ersetzen.",
  items: [
    { value: "1", label: "App für viele Kanzleien" },
    { value: "100%", label: "Tenant-Isolation auf Fachdaten" },
    { value: "EU", label: "Modelle und Region für KI" },
    { value: "0", label: "Shared Content über Bereiche hinweg" },
  ],
};

export const demoEditorial = {
  heading: "Aktuelles & Perspektiven",
  viewAllHref: "#news",
  viewAllLabel: "Alle Beiträge",
  items: [
    {
      category: "Produkt",
      title: "Akten-Chat: ein regulierter Dialog statt freier KI-Spielerei",
      href: "#news",
    },
    {
      category: "Sicherheit",
      title: "Warum Pseudonymisierung vor dem Prompt steht — nicht danach",
      href: "#news",
    },
    {
      category: "Design",
      title: "Alba: ruhige Typografie und warme Neutrals für den Desk",
      href: "#news",
    },
    {
      category: "Architektur",
      title: "Practice, Funktion, Rolle — drei Achsen statt schwerem RBAC",
      href: "#news",
    },
  ],
};

export const demoLocations = {
  heading: "Kontakt",
  intro: {
    newProjectsEmail: "hello@scrinium-ordinis.de",
    mediaEmail: "presse@scrinium-ordinis.de",
  },
  items: [
    {
      name: "Produkt",
      address: "Scrinium\nDeutschland",
      contactLabel: "Anfragen",
      contactEmail: "hello@scrinium-ordinis.de",
    },
    {
      name: "Support",
      address: "IT Roof\nJason Kleuster",
      phone: "0175 8793838",
      contactLabel: "Support",
      contactEmail: "jason.kleuster@it-roof.com",
    },
    {
      name: "App",
      address: "Desk-Produktion",
      contactLabel: "Zugang",
      contactEmail: "hello@scrinium-ordinis.de",
    },
  ],
};

export const demoCase = {
  title: "Akten-Chat — Ein Dialog mit System",
  problem:
    "Freie KI-Chats in der Kanzlei erzeugen Risiko: Klartext an Modelle, fehlender Kontext, keine Nachvollziehbarkeit.",
  background:
    "Kanzleien brauchen Unterstützung bei Sachverhalt, Schreiben und Analyse — aber unter DSGVO, mit Mandantentrennung und bereichsweiser Isolation.",
  ambition:
    "Einen einzigen regulierten Chat schaffen, der optional an eine Akte gebunden ist, immer pseudonymisiert und mit klaren Aktionen statt Prompt-Wildwuchs.",
  ideaTitle: "Ein Chat. Akte optional. Immer Pseudonym.",
  ideaBody:
    "Der Akten-Chat verbindet Consent, Pseudonymisierung und Aktionskatalog. Die Akte liefert Kontext — die KI sieht nur das, was sie sehen darf.",
  roles: [
    {
      title: "Produktkonzept",
      description: "Ein Chat statt vieler Tools — Actions als Liste.",
    },
    {
      title: "Datenschutz",
      description: "Pseudonym vor Bedrock, Residual-Gate, Audit.",
    },
    {
      title: "UX",
      description: "Badges, Kontext-Rail, ruhige Alba-Oberfläche.",
    },
    {
      title: "Architektur",
      description: "Tenant-Scope, Practice-Scope, Function-ACL.",
    },
  ],
};

export const demoClosing = {
  lineOne: "Was ist Ihr",
  lineTwo: "nächster Schritt?",
  href: "mailto:hello@scrinium-ordinis.de",
};

/** Home — Statement wie „IMAGINE WHAT'S NEXT“ */
export const demoHomeStatement = {
  lines: ["Klarheit.", "Die Arbeit.", "Das Werkzeug."],
  tone: "bold" as const,
  align: "center" as const,
};

/** Home — thematischer Streifen */
export const demoThematicCarousel = {
  heading: "Am Rand der Kanzleiarbeit",
  items: [
    {
      client: "Akten-Chat",
      title: "Dialog mit System",
      href: "#case",
      tone: "warm" as const,
    },
    {
      client: "Schreiben",
      title: "Entwürfe mit Stil",
      href: "#case",
      tone: "cool" as const,
    },
    {
      client: "Dokumentation",
      title: "Sachverhalt statt Chaos",
      href: "#case",
      tone: "ink" as const,
    },
    {
      client: "Aufgaben",
      title: "Ball und Absicht",
      href: "#case",
      tone: "soft" as const,
    },
    {
      client: "Mandanten",
      title: "Getrennte Welten",
      href: "#case",
      tone: "warm" as const,
    },
  ],
};

/** Work — Split-Statement mit Fade */
export const demoWorkStatement = {
  lines: ["Die Zukunft inspiriert uns", "Wir arbeiten, um zu inspirieren"],
  tone: "fade" as const,
  align: "center" as const,
};

/** Work — Index-Grid */
export const demoWorkIndex = {
  heading: "Ausgewählte Arbeit",
  items: [
    {
      client: "Akten-Chat",
      title: "Ein regulierter Dialog mit optionaler Akte",
      href: "#case",
      tone: "warm" as const,
    },
    {
      client: "Pseudonymisierung",
      title: "Schutz vor dem Prompt — nicht danach",
      href: "#case",
      tone: "ink" as const,
    },
    {
      client: "Textbausteine",
      title: "Wiederkehrende Formulierungen, bereichsgetrennt",
      href: "#case",
      tone: "soft" as const,
    },
    {
      client: "Practice-Routing",
      title: "Recht ≠ Steuer — in URL und Datenmodell",
      href: "#case",
      tone: "cool" as const,
    },
  ],
};

/** About — Awards */
export const demoAwards = {
  heading: "Excellence Recognises Excellence",
  items: [
    { title: "Tenant Isolation", detail: "App-Scope + Postgres RLS auf Fachdaten" },
    { title: "EU KI", detail: "Bedrock EU-Region, eu.* Modell-IDs" },
    { title: "Practice Separation", detail: "Keine gemeinsamen Inhaltslisten über Bereiche" },
    { title: "Enterprise Lightweight", detail: "Standards ohne Bloat" },
  ],
};

/** Expertise — weiches Statement + Liste */
export const demoExpertiseStatement = {
  lines: [
    "Die stärkste Kraft in der Kanzlei ist nicht Technologie.",
    "Es ist Klarheit.",
  ],
  tone: "soft" as const,
  align: "left" as const,
};

export const demoExpertiseList = {
  items: [
    {
      title: "KI-Innovation",
      description:
        "Regulierte KI für Sachverhalt, Schreiben und Analyse — mit Pseudonym, Consent und Audit.",
      href: "#case",
      linkLabel: "Module ansehen",
    },
    {
      title: "Digitale Produktgestaltung",
      description:
        "Desk-Oberflächen im Alba-Rhythmus: ruhig, kanzleitauglich, wenig Chrome.",
      href: "#case",
      linkLabel: "Module ansehen",
    },
    {
      title: "Dokumentation & Text",
      description:
        "Textbausteine, Prompts und Schreiben — versionierbar und bereichsgetrennt.",
      href: "#case",
      linkLabel: "Module ansehen",
    },
    {
      title: "Mandanten & Akten",
      description:
        "Practice-scoped Datenmodell mit strikter Mandantentrennung.",
      href: "#case",
      linkLabel: "Module ansehen",
    },
    {
      title: "Team & Aufgaben",
      description:
        "Zuweisen, übergeben, abschließen — Ball und Absicht statt Messenger.",
      href: "#case",
      linkLabel: "Module ansehen",
    },
  ],
};

/** Perspectives — Index + Detail */
export const demoPerspectiveIntro = {
  label: "Perspectives",
  title: "Es zählt der Gedanke",
  lead: "Menschliche Neugier — endlos multipliziert.",
};

export const demoPerspectiveIndex = {
  items: [
    {
      title: "KI und das Ende linearer Kreativität",
      deck: "Intelligenz ist künstlich. Staunen bleibt unseres.",
      href: "#perspective-article",
    },
    {
      title: "Mehr als Effizienz",
      deck: "Warum KI in der Kanzlei nicht nur beschleunigen sollte.",
      href: "#perspective-article",
    },
    {
      title: "Die Zukunft der Recherche",
      deck: "Von Keyword-Suche zu semantischem Verständnis.",
      href: "#perspective-article",
    },
    {
      title: "Whitespace für Mutige",
      deck: "Weniger Chrome, mehr Klarheit in der Produktfläche.",
      href: "#perspective-article",
    },
    {
      title: "Trennung als Produktprinzip",
      deck: "Recht ≠ Steuer — und warum das kein Filter ist.",
      href: "#perspective-article",
    },
  ],
};

export const demoPerspectiveArticle = {
  label: "Perspectives",
  title: "KI und das Ende linearer Kreativität",
  deck: "Neue Workflows entlarven unsere Frameworks als Bewältigungsstrategie — und öffnen einen dynamischeren Prozess.",
  readTime: "5 Min. Lesezeit",
  pullQuote:
    "Kreativität passiert nicht in sauberen Phasen. Sie passiert in messigen, gleichzeitigen, schnellen Schleifen.",
  author: "Scrinium",
  authorRole: "Produkt & Architektur",
  sections: [
    {
      heading: "Lineare Prozesse sind Fiktion",
      paragraphs: [
        "Etablierte Frameworks erzählen eine Geschichte aus getrennten Divergenz- und Konvergenzphasen. In der Kanzleiarbeit wartet die gute Idee selten höflich auf Phase zwei.",
        "Pseudonymisierung, Consent und Aktionskatalog sind keine Nachgedanken — sie gehören in denselben Loop wie der Entwurf.",
      ],
    },
    {
      heading: "Der Flaschenhals",
      paragraphs: [
        "Gleichzeitiges Erkunden und Validieren war lange teuer. KI verändert die kognitive Bandbreite — aber nur, wenn Menschen Richtung und Urteil behalten.",
      ],
    },
    {
      heading: "Kleine Teams, null Handoffs",
      paragraphs: [
        "Statt Researcher → Strategist → Production verlieren wir Absicht an jeder Übergabe. Ein regulierter Chat mit Akte hält Kontext und Aktion zusammen.",
      ],
    },
    {
      heading: "Die Unordnung annehmen",
      paragraphs: [
        "Statt Doppeldiamant eher Doppelhelix: Agentensysteme und menschliches Urteil verschlungen. Die Kanzlei, die das jetzt gestaltet, definiert, was folgt.",
      ],
    },
  ],
};

/** News — Index + Detail */
export const demoNewsIntro = {
  label: "News",
  lineOne: "Latest &",
  lineTwo: "Greatest",
};

export const demoNewsIndex = {
  heading: "Latest & Greatest",
  items: [
    {
      category: "Recognition",
      title: "Alba-Design als Referenz für alle neuen Desk-Oberflächen",
      date: "7. Okt 2026",
      href: "#news-article",
    },
    {
      category: "Featured",
      title: "Akten-Chat: ein regulierter Dialog statt freier KI-Spielerei",
      date: "1. Okt 2026",
      href: "#news-article",
    },
    {
      category: "Press",
      title: "Warum Pseudonymisierung vor dem Prompt steht",
      date: "22. Sep 2026",
      href: "#news-article",
    },
    {
      category: "Announcement",
      title: "Practice-Routing: Recht und Steuer teilen nie dieselbe Liste",
      date: "10. Sep 2026",
      href: "#news-article",
    },
  ],
};

export const demoNewsArticle = {
  label: "News",
  date: "29. Januar 2026",
  title: "Akten-Chat: Ein Jahr regulierter KI in der Kanzlei",
  deck: "Ein Chat. Akte optional. Immer Pseudonym — und warum das kein Feature, sondern Voraussetzung ist.",
  sections: [
    {
      paragraphs: [
        "Freie KI-Chats in der Kanzlei erzeugen Risiko: Klartext an Modelle, fehlender Kontext, keine Nachvollziehbarkeit. Scrinium setzt dagegen auf einen einzigen regulierten Dialog.",
        "Consent, Pseudonymisierung und Aktionskatalog gehören zusammen — nicht als Nachgedanke hinter dem Prompt.",
      ],
    },
    {
      heading: "Storytelling liegt im System.",
      paragraphs: [
        "Die Akte liefert Kontext. Die KI sieht nur das, was sie sehen darf. Badges und Kontext-Rail machen den Stand sichtbar, ohne die Oberfläche zu überladen.",
      ],
    },
    {
      heading: "Eine gemeinsame Zukunft.",
      paragraphs: [
        "Tenant-Isolation und Practice-Trennung bleiben nicht verhandelbar. Was folgt, ist Vertiefung: mehr Aktionen, klarere Prüfschleifen, ruhigere Oberflächen.",
      ],
    },
  ],
  relatedWork: [
    { title: "Akten-Chat — Dialog mit System", href: "#case" },
    { title: "Pseudonymisierung vor Bedrock", href: "#case" },
  ],
};
