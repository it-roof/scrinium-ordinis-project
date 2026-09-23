import "server-only";

import type { AiDebugStep, AiDebugTrace } from "@/lib/db/schema";

/** True when AI_DEBUG=1 or AI_DEBUG=true — captures pipeline timeline. */
export function isAiDebugEnabled(): boolean {
  const v = process.env.AI_DEBUG?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function createDebugTraceBuilder(): {
  push: (step: string, detail?: string) => void;
  build: (extra?: Omit<AiDebugTrace, "steps">) => AiDebugTrace;
} {
  const steps: AiDebugStep[] = [];

  return {
    push(step: string, detail?: string) {
      steps.push({
        at: new Date().toISOString(),
        step,
        ...(detail ? { detail } : {}),
      });
    },
    build(extra = {}) {
      return { steps: [...steps], ...extra };
    },
  };
}
