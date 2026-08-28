"use client";

import { useState } from "react";
import { UserRoundIcon } from "lucide-react";

import type { LetterColleague } from "@/lib/letters/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type LetterWorkflowForkProps = {
  colleagues: LetterColleague[];
  currentUserId: string;
  onEdit: () => void;
  onAssign: (input: {
    assignedTo: string;
    intent: "bearbeiten" | "pruefung";
  }) => void;
  busy?: boolean;
  /** Direkt zur Personenwahl (z. B. aus der Sidebar). */
  startAt?: "choose" | "assign";
};

export function LetterWorkflowFork({
  colleagues,
  currentUserId,
  onEdit,
  onAssign,
  busy = false,
  startAt = "choose",
}: LetterWorkflowForkProps) {
  const [mode, setMode] = useState<"choose" | "assign">(startAt);
  const [assignedTo, setAssignedTo] = useState(
    () => colleagues.find((c) => c.id !== currentUserId)?.id ?? currentUserId
  );
  const [intent, setIntent] = useState<"bearbeiten" | "pruefung">("bearbeiten");

  const others = colleagues.filter((c) => c.id !== currentUserId);

  if (mode === "choose") {
    return (
      <div className="surface-card space-y-5 border-foreground/20 p-6 md:p-8">
        <div className="space-y-1">
          <p className="font-heading text-xl font-medium tracking-tight">
            Wie weiter?
          </p>
          <p className="text-sm text-muted-foreground">
            Schreiben selbst bearbeiten oder an eine Person in der Kanzlei
            geben — auch zur Prüfung oder Freigabe.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            disabled={busy}
            onClick={onEdit}
            className="h-14 rounded-none px-5 text-base"
          >
            Schreiben bearbeiten
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || colleagues.length === 0}
            onClick={() => setMode("assign")}
            className="h-14 rounded-none px-5 text-base"
          >
            <UserRoundIcon data-icon="inline-start" />
            Delegieren
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card space-y-5 border-foreground/20 p-6 md:p-8">
      <div className="space-y-1">
        <p className="font-heading text-xl font-medium tracking-tight">
          An Person geben
        </p>
        <p className="text-sm text-muted-foreground">
          Bidirektional — Anwalt und Mitarbeiter können sich Schreiben
          gegenseitig zuweisen.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="letter-assign-user">Person</Label>
        <select
          id="letter-assign-user"
          value={assignedTo}
          onChange={(event) => setAssignedTo(event.target.value)}
          className="flex h-11 w-full rounded-none border border-input bg-transparent px-3 text-sm"
        >
          {colleagues.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
              {person.id === currentUserId ? " (ich)" : ""}
              {` · ${person.email}`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Zweck</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setIntent("bearbeiten")}
            className={cn(
              "rounded-none border px-4 py-3 text-left text-sm transition-colors",
              intent === "bearbeiten"
                ? "border-foreground bg-muted/40"
                : "border-border/70 hover:border-foreground/25"
            )}
          >
            <span className="block font-medium">Zur Bearbeitung</span>
            <span className="text-muted-foreground">
              Person arbeitet am Entwurf weiter.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIntent("pruefung")}
            className={cn(
              "rounded-none border px-4 py-3 text-left text-sm transition-colors",
              intent === "pruefung"
                ? "border-foreground bg-muted/40"
                : "border-border/70 hover:border-foreground/25"
            )}
          >
            <span className="block font-medium">Zur Prüfung / Freigabe</span>
            <span className="text-muted-foreground">
              Z. B. Mitarbeiter → Anwalt.
            </span>
          </button>
        </div>
        {others.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Noch keine weiteren Nutzer in der Kanzlei — Zuweisung an sich selbst
            ist möglich.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            if (startAt === "assign") {
              onEdit();
              return;
            }
            setMode("choose");
          }}
          className="h-11 rounded-none px-4"
        >
          Zurück
        </Button>
        <Button
          type="button"
          disabled={busy || !assignedTo}
          onClick={() => onAssign({ assignedTo, intent })}
          className="h-11 rounded-none px-4"
        >
          Zuweisen und speichern
        </Button>
      </div>
    </div>
  );
}
