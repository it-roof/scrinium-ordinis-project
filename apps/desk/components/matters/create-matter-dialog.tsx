"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MatterRecord } from "@/lib/clients/types";
import type { ContentModule } from "@/lib/db/schema";
import { createMatter } from "@/lib/matters/actions";

export type MatterClientOption = {
  id: string;
  name: string;
};

const EMPTY_FORM = {
  clientId: "",
  title: "",
  reference: "",
};

export function CreateMatterDialog({
  open,
  onOpenChange,
  clients,
  module,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: MatterClientOption[];
  module: ContentModule;
  onCreated: (matter: MatterRecord) => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setForm(EMPTY_FORM);
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      reset();
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.clientId) {
      toast.error("Bitte einen Mandanten wählen.");
      return;
    }
    startTransition(async () => {
      const result = await createMatter({
        clientId: form.clientId,
        title: form.title,
        reference: form.reference,
        notes: "",
        module,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      onCreated(result.item);
      toast.success("Akte angelegt.");
      handleOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className="brand-lab-root brand-alba brand-alba-manrope gap-0 overflow-hidden rounded-[1.15rem] border p-0 sm:max-w-lg"
        style={{
          borderColor: "var(--b-line)",
          background: "var(--b-bg-elev)",
          color: "var(--b-ink)",
        }}
      >
        <form onSubmit={handleSubmit} className="lab-matters-dialog flex flex-col">
          <div
            className="space-y-1 border-b px-6 py-5 pr-12"
            style={{ borderColor: "var(--b-line)" }}
          >
            <DialogHeader className="gap-1.5">
              <DialogTitle className="b-display text-[1.25rem] font-medium tracking-[-0.015em]">
                Neue Akte
              </DialogTitle>
              <DialogDescription className="b-meta">
                Mandant, Titel und optional Aktenzeichen.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5">
            <div className="grid gap-1.5">
              <label
                htmlFor="matter-client"
                className="b-meta font-medium"
                style={{ color: "var(--b-muted)" }}
              >
                Mandant
              </label>
              <select
                id="matter-client"
                value={form.clientId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    clientId: event.target.value,
                  }))
                }
                required
                className="lab-matters-field"
              >
                <option value="" disabled>
                  Mandant wählen
                </option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="matter-title"
                className="b-meta font-medium"
                style={{ color: "var(--b-muted)" }}
              >
                Titel
              </label>
              <input
                id="matter-title"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                className="lab-matters-field"
                autoFocus
                required
                placeholder="z. B. Mietrecht Müller"
              />
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="matter-reference"
                className="b-meta font-medium"
                style={{ color: "var(--b-muted)" }}
              >
                Aktenzeichen
              </label>
              <input
                id="matter-reference"
                value={form.reference}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    reference: event.target.value,
                  }))
                }
                className="lab-matters-field"
                placeholder="optional"
              />
            </div>
          </div>

          <div
            className="flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end"
            style={{ borderColor: "var(--b-line)" }}
          >
            <button
              type="button"
              className="b-btn b-btn-secondary"
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="b-btn b-btn-primary"
              disabled={isPending || clients.length === 0}
            >
              {isPending ? "Speichern…" : "Speichern"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
