import type { CSSProperties, ReactNode } from "react";

import { PublicIntakeForm } from "@/components/intake/public-intake-form";
import { loadPublicIntakeAction } from "@/lib/intake/actions";

import "@/app/neues-design/brand-lab.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div data-lab-appearance="light">
      <div
        className="brand-lab-root brand-alba brand-alba-manrope"
        style={
          {
            "--font-alba-manrope": "var(--font-manrope)",
            "--radius": "0.25rem",
            position: "relative",
            inset: "auto",
            zIndex: "auto",
            minHeight: "100dvh",
            overflow: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
          } as CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
}

function StatusMessage({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead: string;
}) {
  return (
    <main className="lab-intake flex flex-col items-center justify-center text-center">
      <p className="b-eyebrow" style={{ color: "var(--b-accent)" }}>
        {eyebrow}
      </p>
      <h1 className="b-display b-title mt-3 font-medium tracking-[-0.02em]">
        {title}
      </h1>
      <p className="b-lead mx-auto mt-3 max-w-sm">{lead}</p>
    </main>
  );
}

export default async function PublicAufnahmePage({ params }: PageProps) {
  const { token } = await params;
  const data = await loadPublicIntakeAction(token);

  if (data.status === "open") {
    return (
      <PublicShell>
        <PublicIntakeForm
          token={token}
          tenantName={data.tenantName}
          recipientEmail={data.recipientEmail}
          recipientName={data.recipientName}
        />
      </PublicShell>
    );
  }

  if (data.status === "submitted") {
    return (
      <PublicShell>
        <StatusMessage
          eyebrow={data.tenantName}
          title="Bereits ausgefüllt"
          lead="Dieser Aufnahmebogen wurde schon übermittelt. Sie müssen nichts weiter tun — die Kanzlei hat Ihre Angaben."
        />
      </PublicShell>
    );
  }

  const eyebrow = data.tenantName ?? "Aufnahmebogen";
  if (data.reason === "expired") {
    return (
      <PublicShell>
        <StatusMessage
          eyebrow={eyebrow}
          title="Link abgelaufen"
          lead="Dieser Link ist nicht mehr gültig. Bitte wenden Sie sich an die Kanzlei für einen neuen Aufnahmebogen."
        />
      </PublicShell>
    );
  }

  if (data.reason === "revoked") {
    return (
      <PublicShell>
        <StatusMessage
          eyebrow={eyebrow}
          title="Link zurückgezogen"
          lead="Dieser Aufnahmebogen wurde von der Kanzlei zurückgezogen. Bei Fragen melden Sie sich bitte direkt dort."
        />
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <StatusMessage
        eyebrow={eyebrow}
        title="Link ungültig"
        lead="Dieser Link funktioniert nicht. Bitte prüfen Sie die Adresse oder fragen Sie bei der Kanzlei nach einem neuen Link."
      />
    </PublicShell>
  );
}
