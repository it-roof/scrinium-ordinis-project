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
import { createClient, createPerson } from "@/lib/clients/actions";
import {
  CLIENT_KINDS,
  PERSON_SALUTATIONS,
  type ClientKind,
  type ClientRecord,
} from "@/lib/clients/types";
import type { ContentModule } from "@/lib/db/schema";
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

type Step = "kind" | "company" | "company-person" | "person";

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
    <div className={cn("grid gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="b-meta font-medium"
        style={{ color: "var(--b-muted)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function DialogShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <div
        className="space-y-1 border-b px-6 py-5 pr-12"
        style={{ borderColor: "var(--b-line)" }}
      >
        <DialogHeader className="gap-1.5">
          <DialogTitle className="b-display text-[1.25rem] font-medium tracking-[-0.015em]">
            {title}
          </DialogTitle>
          <DialogDescription className="b-meta">{description}</DialogDescription>
        </DialogHeader>
      </div>
      {children}
      <div
        className="flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end"
        style={{ borderColor: "var(--b-line)" }}
      >
        {footer}
      </div>
    </div>
  );
}

export function CreateClientDialog({
  open,
  onOpenChange,
  module,
  onClientCreated,
  onPersonCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: ContentModule;
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
        module,
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
    if (!createdClient) return;
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
        module,
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
        className="brand-lab-root brand-alba brand-alba-manrope gap-0 overflow-hidden rounded-[1.15rem] border p-0 sm:max-w-xl"
        style={{
          borderColor: "var(--b-line)",
          background: "var(--b-bg-elev)",
          color: "var(--b-ink)",
        }}
      >
        {step === "kind" ? (
          <DialogShell
            title="Neuer Mandant"
            description="Firma mit Kontaktpersonen oder Privatperson."
            footer={
              <button
                type="button"
                className="b-btn b-btn-secondary"
                onClick={() => handleOpenChange(false)}
              >
                Abbrechen
              </button>
            }
          >
            <div className="grid gap-3 px-6 py-5 sm:grid-cols-2">
              {CLIENT_KINDS.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => chooseKind(entry.value)}
                  className="lab-choice"
                >
                  <span className="b-display text-[1.0625rem] font-medium tracking-[-0.01em]">
                    {entry.label}
                  </span>
                  <span className="b-meta">
                    {entry.value === "company"
                      ? "Unternehmen, optional mit Ansprechpartnern"
                      : "Natürliche Person als Mandant"}
                  </span>
                </button>
              ))}
            </div>
          </DialogShell>
        ) : null}

        {step === "company" ? (
          <form onSubmit={handleCreateCompany}>
            <DialogShell
              title="Neue Firma"
              description="Firmendaten und Adresse — danach optional eine Person."
              footer={
                <>
                  <button
                    type="button"
                    className="b-btn b-btn-secondary"
                    disabled={isPending}
                    onClick={() => setStep("kind")}
                  >
                    Zurück
                  </button>
                  <button
                    type="submit"
                    className="b-btn b-btn-primary"
                    disabled={isPending}
                  >
                    {isPending ? "Speichern…" : "Speichern und weiter"}
                  </button>
                </>
              }
            >
              <div className="grid gap-4 px-6 py-5 sm:grid-cols-6">
                <Field label="Firma" htmlFor="client-name" className="sm:col-span-6">
                  <input
                    id="client-name"
                    value={company.name}
                    onChange={(e) =>
                      setCompany((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="lab-field"
                    autoFocus
                    required
                  />
                </Field>
                <Field
                  label="Straße und Hausnummer"
                  htmlFor="client-street"
                  className="sm:col-span-6"
                >
                  <input
                    id="client-street"
                    value={company.street}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        street: e.target.value,
                      }))
                    }
                    className="lab-field"
                  />
                </Field>
                <Field label="PLZ" htmlFor="client-postal" className="sm:col-span-2">
                  <input
                    id="client-postal"
                    value={company.postalCode}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        postalCode: e.target.value,
                      }))
                    }
                    className="lab-field"
                  />
                </Field>
                <Field label="Ort" htmlFor="client-city" className="sm:col-span-4">
                  <input
                    id="client-city"
                    value={company.city}
                    onChange={(e) =>
                      setCompany((prev) => ({ ...prev, city: e.target.value }))
                    }
                    className="lab-field"
                  />
                </Field>
                <Field
                  label="Land"
                  htmlFor="client-country"
                  className="sm:col-span-6"
                >
                  <input
                    id="client-country"
                    value={company.country}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        country: e.target.value,
                      }))
                    }
                    className="lab-field"
                  />
                </Field>
              </div>
            </DialogShell>
          </form>
        ) : null}

        {step === "company-person" ? (
          <form onSubmit={handleCreateContact}>
            <DialogShell
              title="Person hinzufügen"
              description={`Optional für ${createdClient?.name ?? "diese Firma"}.`}
              footer={
                <>
                  <button
                    type="button"
                    className="b-btn b-btn-secondary"
                    disabled={isPending}
                    onClick={finish}
                  >
                    Überspringen
                  </button>
                  <button
                    type="submit"
                    className="b-btn b-btn-primary"
                    disabled={isPending}
                  >
                    {isPending ? "Speichern…" : "Person speichern"}
                  </button>
                </>
              }
            >
              <div className="grid gap-4 px-6 py-5 sm:grid-cols-6">
                <Field
                  label="Anrede"
                  htmlFor="contact-salutation"
                  className="sm:col-span-2"
                >
                  <select
                    id="contact-salutation"
                    value={person.salutation}
                    onChange={(e) =>
                      setPerson((prev) => ({
                        ...prev,
                        salutation: e.target.value,
                      }))
                    }
                    className="lab-field"
                  >
                    {PERSON_SALUTATIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Vorname"
                  htmlFor="contact-first-name"
                  className="sm:col-span-2"
                >
                  <input
                    id="contact-first-name"
                    value={person.firstName}
                    onChange={(e) =>
                      setPerson((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    className="lab-field"
                    autoFocus
                    required
                  />
                </Field>
                <Field
                  label="Nachname"
                  htmlFor="contact-last-name"
                  className="sm:col-span-2"
                >
                  <input
                    id="contact-last-name"
                    value={person.lastName}
                    onChange={(e) =>
                      setPerson((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    className="lab-field"
                    required
                  />
                </Field>
                <Field
                  label="Funktion"
                  htmlFor="contact-role"
                  className="sm:col-span-6"
                >
                  <input
                    id="contact-role"
                    value={person.role}
                    onChange={(e) =>
                      setPerson((prev) => ({ ...prev, role: e.target.value }))
                    }
                    className="lab-field"
                    placeholder="z. B. GF"
                  />
                </Field>
                <Field
                  label="Straße und Hausnummer"
                  htmlFor="contact-street"
                  className="sm:col-span-6"
                >
                  <input
                    id="contact-street"
                    value={person.street}
                    onChange={(e) =>
                      setPerson((prev) => ({
                        ...prev,
                        street: e.target.value,
                      }))
                    }
                    className="lab-field"
                  />
                </Field>
                <Field
                  label="PLZ"
                  htmlFor="contact-postal"
                  className="sm:col-span-2"
                >
                  <input
                    id="contact-postal"
                    value={person.postalCode}
                    onChange={(e) =>
                      setPerson((prev) => ({
                        ...prev,
                        postalCode: e.target.value,
                      }))
                    }
                    className="lab-field"
                  />
                </Field>
                <Field
                  label="Ort"
                  htmlFor="contact-city"
                  className="sm:col-span-4"
                >
                  <input
                    id="contact-city"
                    value={person.city}
                    onChange={(e) =>
                      setPerson((prev) => ({ ...prev, city: e.target.value }))
                    }
                    className="lab-field"
                  />
                </Field>
                <Field
                  label="Land"
                  htmlFor="contact-country"
                  className="sm:col-span-6"
                >
                  <input
                    id="contact-country"
                    value={person.country}
                    onChange={(e) =>
                      setPerson((prev) => ({
                        ...prev,
                        country: e.target.value,
                      }))
                    }
                    className="lab-field"
                  />
                </Field>
                <Field
                  label="E-Mail"
                  htmlFor="contact-email"
                  className="sm:col-span-6"
                >
                  <input
                    id="contact-email"
                    type="email"
                    value={person.email}
                    onChange={(e) =>
                      setPerson((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="lab-field"
                  />
                </Field>
                <Field
                  label="Telefon"
                  htmlFor="contact-phone"
                  className="sm:col-span-6"
                >
                  <input
                    id="contact-phone"
                    value={person.phone}
                    onChange={(e) =>
                      setPerson((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    className="lab-field"
                  />
                </Field>
              </div>
            </DialogShell>
          </form>
        ) : null}

        {step === "person" ? (
          <form onSubmit={handleCreatePersonClient}>
            <DialogShell
              title="Neue Privatperson"
              description="Stammdaten und Adresse."
              footer={
                <>
                  <button
                    type="button"
                    className="b-btn b-btn-secondary"
                    disabled={isPending}
                    onClick={() => setStep("kind")}
                  >
                    Zurück
                  </button>
                  <button
                    type="submit"
                    className="b-btn b-btn-primary"
                    disabled={isPending}
                  >
                    {isPending ? "Speichern…" : "Speichern"}
                  </button>
                </>
              }
            >
              <div className="grid gap-4 px-6 py-5 sm:grid-cols-6">
                <Field
                  label="Anrede"
                  htmlFor="person-salutation"
                  className="sm:col-span-2"
                >
                  <select
                    id="person-salutation"
                    value={person.salutation}
                    onChange={(e) =>
                      setPerson((prev) => ({
                        ...prev,
                        salutation: e.target.value,
                      }))
                    }
                    className="lab-field"
                  >
                    {PERSON_SALUTATIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Vorname"
                  htmlFor="person-first-name"
                  className="sm:col-span-2"
                >
                  <input
                    id="person-first-name"
                    value={person.firstName}
                    onChange={(e) =>
                      setPerson((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    className="lab-field"
                    autoFocus
                    required
                  />
                </Field>
                <Field
                  label="Nachname"
                  htmlFor="person-last-name"
                  className="sm:col-span-2"
                >
                  <input
                    id="person-last-name"
                    value={person.lastName}
                    onChange={(e) =>
                      setPerson((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    className="lab-field"
                    required
                  />
                </Field>
                <Field
                  label="Straße und Hausnummer"
                  htmlFor="person-street"
                  className="sm:col-span-6"
                >
                  <input
                    id="person-street"
                    value={person.street}
                    onChange={(e) =>
                      setPerson((prev) => ({
                        ...prev,
                        street: e.target.value,
                      }))
                    }
                    className="lab-field"
                  />
                </Field>
                <Field
                  label="PLZ"
                  htmlFor="person-postal"
                  className="sm:col-span-2"
                >
                  <input
                    id="person-postal"
                    value={person.postalCode}
                    onChange={(e) =>
                      setPerson((prev) => ({
                        ...prev,
                        postalCode: e.target.value,
                      }))
                    }
                    className="lab-field"
                  />
                </Field>
                <Field
                  label="Ort"
                  htmlFor="person-city"
                  className="sm:col-span-4"
                >
                  <input
                    id="person-city"
                    value={person.city}
                    onChange={(e) =>
                      setPerson((prev) => ({ ...prev, city: e.target.value }))
                    }
                    className="lab-field"
                  />
                </Field>
                <Field
                  label="Land"
                  htmlFor="person-country"
                  className="sm:col-span-6"
                >
                  <input
                    id="person-country"
                    value={person.country}
                    onChange={(e) =>
                      setPerson((prev) => ({
                        ...prev,
                        country: e.target.value,
                      }))
                    }
                    className="lab-field"
                  />
                </Field>
                <Field
                  label="E-Mail"
                  htmlFor="person-email"
                  className="sm:col-span-6"
                >
                  <input
                    id="person-email"
                    type="email"
                    value={person.email}
                    onChange={(e) =>
                      setPerson((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="lab-field"
                  />
                </Field>
                <Field
                  label="Telefon"
                  htmlFor="person-phone"
                  className="sm:col-span-6"
                >
                  <input
                    id="person-phone"
                    value={person.phone}
                    onChange={(e) =>
                      setPerson((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    className="lab-field"
                  />
                </Field>
              </div>
            </DialogShell>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
