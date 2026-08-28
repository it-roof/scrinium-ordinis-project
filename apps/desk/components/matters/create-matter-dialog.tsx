"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createMatter } from "@/lib/matters/actions";
import type { MatterRecord } from "@/lib/clients/types";

const fieldClass = "h-10 rounded-none";
const selectFieldClass =
  "h-10 w-full rounded-none px-2.5 data-[size=default]:h-10";
const labelClass = "text-xs font-medium text-muted-foreground";

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className={labelClass}>
        {label}
      </Label>
      {children}
    </div>
  );
}

const EMPTY_FORM = {
  clientId: "",
  title: "",
  reference: "",
};

export type MatterClientOption = {
  id: string;
  name: string;
};

export function CreateMatterDialog({
  open,
  onOpenChange,
  clients,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: MatterClientOption[];
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
        module: "legal",
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
        className="gap-0 overflow-hidden rounded-none p-0 sm:max-w-xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="space-y-1 border-b border-border/70 px-6 py-5 pr-12">
            <DialogHeader className="gap-1">
              <DialogTitle className="text-lg">Neue Akte</DialogTitle>
              <DialogDescription>
                Mandant, Titel und optional Aktenzeichen.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-x-4 gap-y-3 px-6 py-5 sm:grid-cols-6">
            <Field label="Mandant" htmlFor="matter-client" className="sm:col-span-6">
              <Select
                value={form.clientId || undefined}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, clientId: value }))
                }
              >
                <SelectTrigger id="matter-client" className={selectFieldClass}>
                  <SelectValue placeholder="Mandant wählen" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Titel" htmlFor="matter-title" className="sm:col-span-6">
              <Input
                id="matter-title"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                className={fieldClass}
                autoFocus
                required
              />
            </Field>
            <Field
              label="Aktenzeichen"
              htmlFor="matter-reference"
              className="sm:col-span-6"
            >
              <Input
                id="matter-reference"
                value={form.reference}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    reference: event.target.value,
                  }))
                }
                className={fieldClass}
                placeholder="optional"
              />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border/70 bg-muted/40 px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-none px-5"
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isPending || clients.length === 0}
              className="h-11 rounded-none px-5"
            >
              Speichern
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
