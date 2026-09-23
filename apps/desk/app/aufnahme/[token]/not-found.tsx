import type { CSSProperties } from "react";

import "@/app/neues-design/brand-lab.css";

/** Fallback für unbekannte Routen unter /aufnahme/[token]. */
export default function AufnahmeNotFound() {
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
        <main className="lab-intake flex flex-col items-center justify-center text-center">
          <p className="b-eyebrow" style={{ color: "var(--b-accent)" }}>
            Aufnahmebogen
          </p>
          <h1 className="b-display b-title mt-3 font-medium tracking-[-0.02em]">
            Link ungültig
          </h1>
          <p className="b-lead mx-auto mt-3 max-w-sm">
            Dieser Link funktioniert nicht. Bitte prüfen Sie die Adresse oder
            fragen Sie bei der Kanzlei nach einem neuen Link.
          </p>
        </main>
      </div>
    </div>
  );
}
