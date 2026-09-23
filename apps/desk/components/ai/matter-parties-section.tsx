"use client";

import { useState, useTransition } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  createMatterPartyAction,
  deleteMatterPartyAction,
} from "@/lib/ai/parties-actions";
import type { MatterPartyRecord } from "@/lib/ai/parties-storage";
import type { MatterPartyRole } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_LABELS: Record<MatterPartyRole, string> = {
  opponent: "Gegner",
  party: "Beteiligter",
  other: "Sonstige",
};

const EMPTY_FORM = {
  role: "opponent" as MatterPartyRole,
  kind: "company" as "company" | "person",
  name: "",
  firstName: "",
  lastName: "",
  city: "",
};

export function MatterPartiesSection({
  matterId,
  initialParties,
}: {
  matterId: string;
  initialParties: MatterPartyRecord[];
}) {
  const [parties, setParties] = useState(initialParties);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createMatterPartyAction(matterId, form);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setParties((prev) => [...prev, result.item]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success("Partei hinzugefügt.");
    });
  }

  function handleDelete(partyId: string) {
    startTransition(async () => {
      const result = await deleteMatterPartyAction(partyId, matterId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setParties((prev) => prev.filter((p) => p.id !== partyId));
      toast.success("Partei entfernt.");
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-medium tracking-tight">
            Gegner &amp; Beteiligte
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Bekannte Namen für die Pseudonymisierung vor KI-Aufrufen.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-none px-4"
          onClick={() => setShowForm((v) => !v)}
        >
          <PlusIcon data-icon="inline-start" />
          Partei
        </Button>
      </div>

      {showForm ? (
        <form onSubmit={handleCreate} className="surface-card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Rolle</Label>
              <Select
                value={form.role}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    role: value as MatterPartyRole,
                  }))
                }
              >
                <SelectTrigger className="h-11 w-full rounded-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as MatterPartyRole[]).map(
                    (role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Art</Label>
              <Select
                value={form.kind}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    kind: value as "company" | "person",
                  }))
                }
              >
                <SelectTrigger className="h-11 w-full rounded-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Firma</SelectItem>
                  <SelectItem value="person">Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.kind === "company" ? (
            <div className="space-y-2">
              <Label htmlFor="party-name">Firmenname</Label>
              <Input
                id="party-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="h-11 rounded-none"
                required
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="party-first">Vorname</Label>
                <Input
                  id="party-first"
                  value={form.firstName}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      firstName: event.target.value,
                    }))
                  }
                  className="h-11 rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="party-last">Nachname</Label>
                <Input
                  id="party-last"
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      lastName: event.target.value,
                    }))
                  }
                  className="h-11 rounded-none"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="party-city">Ort (optional)</Label>
            <Input
              id="party-city"
              value={form.city}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, city: event.target.value }))
              }
              className="h-11 rounded-none"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isPending}
              className="h-11 rounded-none px-5"
            >
              Hinzufügen
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 rounded-none"
              onClick={() => {
                setShowForm(false);
                setForm(EMPTY_FORM);
              }}
            >
              Abbrechen
            </Button>
          </div>
        </form>
      ) : null}

      {parties.length === 0 ? (
        <div className="surface-card border-dashed p-8 text-center text-sm text-muted-foreground">
          Noch keine Gegner oder Beteiligten.
        </div>
      ) : (
        <ul className="space-y-3">
          {parties.map((party) => (
            <li
              key={party.id}
              className="surface-card flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">
                  {party.kind === "person"
                    ? [party.firstName, party.lastName].filter(Boolean).join(" ") ||
                      party.name
                    : party.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {ROLE_LABELS[party.role]}
                  {party.city ? ` · ${party.city}` : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => handleDelete(party.id)}
                className="text-muted-foreground"
              >
                <Trash2Icon data-icon="inline-start" />
                Entfernen
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
