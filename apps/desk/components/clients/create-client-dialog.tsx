"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createClient, createPerson } from "@/lib/clients/actions";
import {
  CLIENT_KINDS,
  PERSON_SALUTATIONS,
  type ClientKind,
  type ClientRecord,
} from "@/lib/clients/types";
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

const EMPTY_COMPANY = {
  name: "",
  street: "",
  postalCode: "",
  city: "",
  country: "Deutschland",
};

const EMPTY_PERSON = {
  salutation: "Herr",
  firstName: "",
  lastName: "",
  role: "",
  street: "",
  postalCode: "",
  city: "",
  country: "Deutschland",
  email: "",
  phone: "",
};

const fieldClass = "h-10 rounded-none";
/** SelectTrigger defaults to h-8/rounded-lg — match Input fields. */
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

type Step = "kind" | "company" | "company-person" | "person";

export function CreateClientDialog({
  open,
  onOpenChange,
  onClientCreated,
  onPersonCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: (client: ClientRecord) => void;
  onPersonCreated: (clientId: string) => void;
}) {
  const [step, setStep] = useState<Step>("kind");
  const [company, setCompany] = useState(EMPTY_COMPANY);
  const [person, setPerson] = useState(EMPTY_PERSON);
  const [createdClient, setCreatedClient] = useState<ClientRecord | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setStep("kind");
    setCompany(EMPTY_COMPANY);
    setPerson(EMPTY_PERSON);
    setCreatedClient(null);
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      reset();
    }
  }

  function finish() {
    reset();
    onOpenChange(false);
  }

  function chooseKind(kind: ClientKind) {
    setPerson(EMPTY_PERSON);
    setCompany(EMPTY_COMPANY);
    setStep(kind === "company" ? "company" : "person");
  }

  function handleCreateCompany(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createClient({
        kind: "company",
        ...company,
        salutation: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        mobile: "",
        notes: "",
        module: "legal",
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      onClientCreated(result.item);
      setCreatedClient(result.item);
      setStep("company-person");
      toast.success("Firma angelegt.");
    });
  }

  function handleCreateContact(event: React.FormEvent) {
    event.preventDefault();
    if (!createdClient) {
      return;
    }
    startTransition(async () => {
      const result = await createPerson({
        clientId: createdClient.id,
        ...person,
        mobile: "",
        notes: "",
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      onPersonCreated(createdClient.id);
      toast.success("Person angelegt.");
      finish();
    });
  }

  function handleCreatePersonClient(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createClient({
        kind: "person",
        name: "",
        salutation: person.salutation,
        firstName: person.firstName,
        lastName: person.lastName,
        street: person.street,
        postalCode: person.postalCode,
        city: person.city,
        country: person.country,
        email: person.email,
        phone: person.phone,
        mobile: "",
        notes: "",
        module: "legal",
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      onClientCreated(result.item);
      toast.success("Privatperson angelegt.");
      finish();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className="gap-0 overflow-hidden rounded-none p-0 sm:max-w-xl"
      >
        {step === "kind" ? (
          <div className="flex flex-col">
            <div className="space-y-1 border-b border-border/70 px-6 py-5 pr-12">
              <DialogHeader className="gap-1">
                <DialogTitle className="text-lg">Neuer Mandant</DialogTitle>
                <DialogDescription>
                  Firma mit Kontaktpersonen oder Privatperson.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="grid gap-3 px-6 py-5 sm:grid-cols-2">
              {CLIENT_KINDS.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => chooseKind(entry.value)}
                  className="border border-border/80 bg-background px-4 py-5 text-left transition-colors hover:border-foreground/40 hover:bg-muted/40"
                >
                  <p className="font-heading text-base font-medium tracking-tight">
                    {entry.label}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {entry.value === "company"
                      ? "Unternehmen, optional mit Ansprechpartnern"
                      : "Natürliche Person als Mandant"}
                  </p>
                </button>
              ))}
            </div>
            <div className="flex justify-end border-t border-border/70 bg-muted/40 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-none px-5"
                onClick={() => handleOpenChange(false)}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        ) : null}

        {step === "company" ? (
          <form onSubmit={handleCreateCompany} className="flex flex-col">
            <div className="space-y-1 border-b border-border/70 px-6 py-5 pr-12">
              <DialogHeader className="gap-1">
                <DialogTitle className="text-lg">Neue Firma</DialogTitle>
                <DialogDescription>
                  Firmendaten und Adresse — danach optional eine Person.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="grid gap-x-4 gap-y-3 px-6 py-5 sm:grid-cols-6">
              <Field label="Firma" htmlFor="client-name" className="sm:col-span-6">
                <Input
                  id="client-name"
                  value={company.name}
                  onChange={(event) =>
                    setCompany((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className={fieldClass}
                  autoFocus
                  required
                />
              </Field>
              <Field
                label="Straße und Hausnummer"
                htmlFor="client-street"
                className="sm:col-span-6"
              >
                <Input
                  id="client-street"
                  value={company.street}
                  onChange={(event) =>
                    setCompany((prev) => ({
                      ...prev,
                      street: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </Field>
              <Field label="PLZ" htmlFor="client-postal" className="sm:col-span-2">
                <Input
                  id="client-postal"
                  value={company.postalCode}
                  onChange={(event) =>
                    setCompany((prev) => ({
                      ...prev,
                      postalCode: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </Field>
              <Field label="Ort" htmlFor="client-city" className="sm:col-span-4">
                <Input
                  id="client-city"
                  value={company.city}
                  onChange={(event) =>
                    setCompany((prev) => ({ ...prev, city: event.target.value }))
                  }
                  className={fieldClass}
                />
              </Field>
              <Field
                label="Land"
                htmlFor="client-country"
                className="sm:col-span-6"
              >
                <Input
                  id="client-country"
                  value={company.country}
                  onChange={(event) =>
                    setCompany((prev) => ({
                      ...prev,
                      country: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </Field>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border/70 bg-muted/40 px-6 py-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-none px-5"
                disabled={isPending}
                onClick={() => setStep("kind")}
              >
                Zurück
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-11 rounded-none px-5"
              >
                Speichern und weiter
              </Button>
            </div>
          </form>
        ) : null}

        {step === "company-person" ? (
          <form onSubmit={handleCreateContact} className="flex flex-col">
            <div className="space-y-1 border-b border-border/70 px-6 py-5 pr-12">
              <DialogHeader className="gap-1">
                <DialogTitle className="text-lg">Person hinzufügen</DialogTitle>
                <DialogDescription>
                  Optional für {createdClient?.name ?? "diese Firma"}.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="grid gap-x-4 gap-y-3 px-6 py-5 sm:grid-cols-6">
              <Field
                label="Anrede"
                htmlFor="contact-salutation"
                className="sm:col-span-2"
              >
                <Select
                  value={person.salutation || undefined}
                  onValueChange={(value) =>
                    setPerson((prev) => ({ ...prev, salutation: value }))
                  }
                >
                  <SelectTrigger
                    id="contact-salutation"
                    className={selectFieldClass}
                  >
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERSON_SALUTATIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Vorname"
                htmlFor="contact-first-name"
                className="sm:col-span-2"
              >
                <Input
                  id="contact-first-name"
                  value={person.firstName}
                  onChange={(event) =>
                    setPerson((prev) => ({
                      ...prev,
                      firstName: event.target.value,
                    }))
                  }
                  className={fieldClass}
                  autoFocus
                  required
                />
              </Field>
              <Field
                label="Nachname"
                htmlFor="contact-last-name"
                className="sm:col-span-2"
              >
                <Input
                  id="contact-last-name"
                  value={person.lastName}
                  onChange={(event) =>
                    setPerson((prev) => ({
                      ...prev,
                      lastName: event.target.value,
                    }))
                  }
                  className={fieldClass}
                  required
                />
              </Field>
              <Field
                label="Funktion"
                htmlFor="contact-role"
                className="sm:col-span-6"
              >
                <Input
                  id="contact-role"
                  value={person.role}
                  onChange={(event) =>
                    setPerson((prev) => ({ ...prev, role: event.target.value }))
                  }
                  className={fieldClass}
                  placeholder="z. B. GF"
                />
              </Field>
              <Field
                label="Straße und Hausnummer"
                htmlFor="contact-street"
                className="sm:col-span-6"
              >
                <Input
                  id="contact-street"
                  value={person.street}
                  onChange={(event) =>
                    setPerson((prev) => ({
                      ...prev,
                      street: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </Field>
              <Field label="PLZ" htmlFor="contact-postal" className="sm:col-span-2">
                <Input
                  id="contact-postal"
                  value={person.postalCode}
                  onChange={(event) =>
                    setPerson((prev) => ({
                      ...prev,
                      postalCode: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </Field>
              <Field label="Ort" htmlFor="contact-city" className="sm:col-span-4">
                <Input
                  id="contact-city"
                  value={person.city}
                  onChange={(event) =>
                    setPerson((prev) => ({ ...prev, city: event.target.value }))
                  }
                  className={fieldClass}
                />
              </Field>
              <Field
                label="Land"
                htmlFor="contact-country"
                className="sm:col-span-6"
              >
                <Input
                  id="contact-country"
                  value={person.country}
                  onChange={(event) =>
                    setPerson((prev) => ({
                      ...prev,
                      country: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </Field>
              <Field
                label="E-Mail"
                htmlFor="contact-email"
                className="sm:col-span-6"
              >
                <Input
                  id="contact-email"
                  type="email"
                  value={person.email}
                  onChange={(event) =>
                    setPerson((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </Field>
              <Field
                label="Telefon"
                htmlFor="contact-phone"
                className="sm:col-span-6"
              >
                <Input
                  id="contact-phone"
                  value={person.phone}
                  onChange={(event) =>
                    setPerson((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </Field>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border/70 bg-muted/40 px-6 py-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-none px-5"
                disabled={isPending}
                onClick={finish}
              >
                Überspringen
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-11 rounded-none px-5"
              >
                Person speichern
              </Button>
            </div>
          </form>
        ) : null}

        {step === "person" ? (
          <form onSubmit={handleCreatePersonClient} className="flex flex-col">
            <div className="space-y-1 border-b border-border/70 px-6 py-5 pr-12">
              <DialogHeader className="gap-1">
                <DialogTitle className="text-lg">Neue Privatperson</DialogTitle>
                <DialogDescription>
                  Stammdaten und Adresse der natürlichen Person.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="grid gap-x-4 gap-y-3 px-6 py-5 sm:grid-cols-6">
              <Field
                label="Anrede"
                htmlFor="person-salutation"
                className="sm:col-span-2"
              >
                <Select
                  value={person.salutation || undefined}
                  onValueChange={(value) =>
                    setPerson((prev) => ({ ...prev, salutation: value }))
                  }
                >
                  <SelectTrigger
                    id="person-salutation"
                    className={selectFieldClass}
                  >
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERSON_SALUTATIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Vorname"
                htmlFor="person-first-name"
                className="sm:col-span-2"
              >
                <Input
                  id="person-first-name"
                  value={person.firstName}
                  onChange={(event) =>
                    setPerson((prev) => ({
                      ...prev,
                      firstName: event.target.value,
                    }))
                  }
                  className={fieldClass}
                  autoFocus
                  required
                />
              </Field>
              <Field
                label="Nachname"
                htmlFor="person-last-name"
                className="sm:col-span-2"
              >
                <Input
                  id="person-last-name"
                  value={person.lastName}
                  onChange={(event) =>
                    setPerson((prev) => ({
                      ...prev,
                      lastName: event.target.value,
                    }))
                  }
                  className={fieldClass}
                  required
                />
              </Field>
              <Field
                label="Straße und Hausnummer"
                htmlFor="person-street"
                className="sm:col-span-6"
              >
                <Input
                  id="person-street"
                  value={person.street}
                  onChange={(event) =>
                    setPerson((prev) => ({
                      ...prev,
                      street: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </Field>
              <Field label="PLZ" htmlFor="person-postal" className="sm:col-span-2">
                <Input
                  id="person-postal"
                  value={person.postalCode}
                  onChange={(event) =>
                    setPerson((prev) => ({
                      ...prev,
                      postalCode: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </Field>
              <Field label="Ort" htmlFor="person-city" className="sm:col-span-4">
                <Input
                  id="person-city"
                  value={person.city}
                  onChange={(event) =>
                    setPerson((prev) => ({ ...prev, city: event.target.value }))
                  }
                  className={fieldClass}
                />
              </Field>
              <Field
                label="Land"
                htmlFor="person-country"
                className="sm:col-span-6"
              >
                <Input
                  id="person-country"
                  value={person.country}
                  onChange={(event) =>
                    setPerson((prev) => ({
                      ...prev,
                      country: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </Field>
              <Field
                label="E-Mail"
                htmlFor="person-email"
                className="sm:col-span-6"
              >
                <Input
                  id="person-email"
                  type="email"
                  value={person.email}
                  onChange={(event) =>
                    setPerson((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </Field>
              <Field
                label="Telefon"
                htmlFor="person-phone"
                className="sm:col-span-6"
              >
                <Input
                  id="person-phone"
                  value={person.phone}
                  onChange={(event) =>
                    setPerson((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </Field>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border/70 bg-muted/40 px-6 py-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-none px-5"
                disabled={isPending}
                onClick={() => setStep("kind")}
              >
                Zurück
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-11 rounded-none px-5"
              >
                Speichern
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
