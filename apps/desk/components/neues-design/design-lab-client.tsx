"use client";

import { ConceptSwitcher } from "@/components/neues-design/concept-switcher";
import {
  DESIGN_CONCEPTS,
  type DesignConceptId,
} from "@/components/neues-design/concepts";
import { DashboardAlba } from "@/components/neues-design/dashboard-alba";
import { LabThemeProvider } from "@/components/neues-design/lab-theme";

export function DesignLabClient({ concept }: { concept: DesignConceptId }) {
  const meta = DESIGN_CONCEPTS.find((c) => c.id === concept)!;

  return (
    <LabThemeProvider>
      <div className="brand-alba">
        <div className="sr-only">
          Design-Konzept {meta.name}: {meta.vibe}
        </div>
        <DashboardAlba />
        <ConceptSwitcher active={concept} />
      </div>
    </LabThemeProvider>
  );
}
