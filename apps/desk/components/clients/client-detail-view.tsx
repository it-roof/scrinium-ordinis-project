"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeftIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { useAreaBasePath } from "@/lib/area/use-area-path";
import {
  createPerson,
  deletePerson,
  updateClient,
  updatePerson,
} from "@/lib/clients/actions";
import {
  clientKindLabel,
  formatClientName,
  formatPersonListName,
  PERSON_SALUTATIONS,
  type ClientPersonRecord,
  type ClientRecord,
  type MatterRecord,
} from "@/lib/clients/types";
import { createMatter, deleteMatter } from "@/lib/matters/actions";
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
import { Textarea } from "@/components/ui/textarea";

const EMPTY_PERSON_FORM = {
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
  mobile: "",
  notes: "",
};

export function ClientDetailView({
  client,
  initialPersons,
  initialMatters,
}: {
  client: ClientRecord;
  initialPersons: ClientPersonRecord[];
  initialMatters: MatterRecord[];
}) {
  const router = useRouter();
  const basePath = useAreaBasePath() ?? "";
  const isCompany = client.kind === "company";

  const [name, setName] = useState(client.name);
  const [salutation, setSalutation] = useState(client.salutation);
  const [firstName, setFirstName] = useState(client.firstName);
  const [lastName, setLastName] = useState(client.lastName);
  const [street, setStreet] = useState(client.street);
  const [postalCode, setPostalCode] = useState(client.postalCode);
  const [city, setCity] = useState(client.city);
  const [country, setCountry] = useState(client.country);
  const [email, setEmail] = useState(client.email);
  const [phone, setPhone] = useState(client.phone);
  const [mobile, setMobile] = useState(client.mobile);
  const [notes, setNotes] = useState(client.notes);
  const [persons, setPersons] = useState(initialPersons);
  const [matters, setMatters] = useState(initialMatters);
  const [title, setTitle] = useState("");
  const [reference, setReference] = useState("");
  const [showMatterForm, setShowMatterForm] = useState(false);
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [personForm, setPersonForm] = useState(EMPTY_PERSON_FORM);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetPersonForm() {
    setPersonForm(EMPTY_PERSON_FORM);
    setEditingPersonId(null);
    setShowPersonForm(false);
  }

  function startEditPerson(person: ClientPersonRecord) {
    setEditingPersonId(person.id);
    setPersonForm({
      salutation: person.salutation,
      firstName: person.firstName,
      lastName: person.lastName,
      role: person.role,
      street: person.street,
      postalCode: person.postalCode,
      city: person.city,
      country: person.country || "Deutschland",
      email: person.email,
      phone: person.phone,
      mobile: person.mobile,
      notes: person.notes,
    });
    setShowPersonForm(true);
  }

  function handleSaveClient(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateClient(client.id, {
        kind: client.kind,
        name: isCompany ? name : "",
        salutation: isCompany ? "" : salutation,
        firstName: isCompany ? "" : firstName,
        lastName: isCompany ? "" : lastName,
        street,
        postalCode,
        city,
        country,
        email: isCompany ? "" : email,
        phone: isCompany ? "" : phone,
        mobile: isCompany ? "" : mobile,
        notes,
        module: client.module,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Mandant gespeichert.");
      router.refresh();
    });
  }

  function handleSavePerson(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      if (editingPersonId) {
        const result = await updatePerson(editingPersonId, personForm);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        setPersons((prev) =>
          prev
            .map((item) => (item.id === editingPersonId ? result.item : item))
            .sort((a, b) =>
              `${a.lastName} ${a.firstName}`.localeCompare(
                `${b.lastName} ${b.firstName}`,
                "de"
              )
            )
        );
        toast.success("Person gespeichert.");
      } else {
        const result = await createPerson({
          clientId: client.id,
          ...personForm,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        setPersons((prev) =>
          [...prev, result.item].sort((a, b) =>
            `${a.lastName} ${a.firstName}`.localeCompare(
              `${b.lastName} ${b.firstName}`,
              "de"
            )
          )
        );
        toast.success("Person angelegt.");
      }
      resetPersonForm();
      router.refresh();
    });
  }

  function handleDeletePerson(id: string) {
    startTransition(async () => {
      const result = await deletePerson(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setPersons((prev) => prev.filter((item) => item.id !== id));
      if (editingPersonId === id) {
        resetPersonForm();
      }
      toast.success("Person gelöscht.");
      router.refresh();
    });
  }

  function handleCreateMatter(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createMatter({
        clientId: client.id,
        title,
        reference,
        notes: "",
        module: "legal",
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setMatters((prev) => [result.item, ...prev]);
      setTitle("");
      setReference("");
      setShowMatterForm(false);
      toast.success("Akte angelegt.");
      router.refresh();
    });
  }

  function handleDeleteMatter(id: string) {
    startTransition(async () => {
      const result = await deleteMatter(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setMatters((prev) => prev.filter((item) => item.id !== id));
      toast.success("Akte gelöscht.");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-fit px-0 text-muted-foreground hover:text-foreground"
      >
        <Link href={`${basePath}/mandanten`}>
          <ArrowLeftIcon data-icon="inline-start" />
          Zurück zu Mandanten
        </Link>
      </Button>

      <PageHeader
        title={formatClientName(client)}
        description={`${clientKindLabel(client.kind)}${
          isCompany ? ", Personen und Akten." : " und Akten."
        }`}
      />

      <form onSubmit={handleSaveClient} className="surface-card space-y-4 p-6">
        <h2 className="font-heading text-lg font-medium tracking-tight">
          {isCompany ? "Firma" : "Privatperson"}
        </h2>

        {isCompany ? (
          <div className="space-y-2">
            <Label htmlFor="detail-name">Firmenname</Label>
            <Input
              id="detail-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 rounded-none"
              required
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="detail-salutation">Anrede</Label>
              <Select
                value={salutation || undefined}
                onValueChange={setSalutation}
              >
                <SelectTrigger
                  id="detail-salutation"
                  className="h-11 w-full rounded-none px-2.5 data-[size=default]:h-11"
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="detail-first-name">Vorname</Label>
              <Input
                id="detail-first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="h-11 rounded-none"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="detail-last-name">Nachname</Label>
              <Input
                id="detail-last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="h-11 rounded-none"
                required
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="detail-street">Straße und Hausnummer</Label>
          <Input
            id="detail-street"
            value={street}
            onChange={(event) => setStreet(event.target.value)}
            className="h-11 rounded-none"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <div className="space-y-2">
            <Label htmlFor="detail-postal">PLZ</Label>
            <Input
              id="detail-postal"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              className="h-11 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="detail-city">Ort</Label>
            <Input
              id="detail-city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="h-11 rounded-none"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="detail-country">Land</Label>
          <Input
            id="detail-country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className="h-11 rounded-none"
          />
        </div>

        {!isCompany ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="detail-email">E-Mail</Label>
              <Input
                id="detail-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 rounded-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="detail-phone">Telefon</Label>
              <Input
                id="detail-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="h-11 rounded-none"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="detail-mobile">Mobil</Label>
              <Input
                id="detail-mobile"
                value={mobile}
                onChange={(event) => setMobile(event.target.value)}
                className="h-11 rounded-none"
              />
            </div>
          </div>
        ) : null}

        <div className="border-t border-border/70" />
        <div className="space-y-2">
          <Label htmlFor="detail-notes">Notiz</Label>
          <Textarea
            id="detail-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="rounded-none"
          />
        </div>
        <Button
          type="submit"
          disabled={isPending}
          className="h-11 rounded-none px-5"
        >
          Speichern
        </Button>
      </form>

      {isCompany ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-xl font-medium tracking-tight">
              Personen
            </h2>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-none px-4"
              onClick={() => {
                if (showPersonForm && !editingPersonId) {
                  resetPersonForm();
                } else {
                  setEditingPersonId(null);
                  setPersonForm(EMPTY_PERSON_FORM);
                  setShowPersonForm(true);
                }
              }}
            >
              <PlusIcon data-icon="inline-start" />
              Person
            </Button>
          </div>

          {showPersonForm ? (
            <form
              onSubmit={handleSavePerson}
              className="surface-card space-y-4 p-6"
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="person-salutation">Anrede</Label>
                  <Select
                    value={personForm.salutation || undefined}
                    onValueChange={(value) =>
                      setPersonForm((prev) => ({
                        ...prev,
                        salutation: value,
                      }))
                    }
                  >
                    <SelectTrigger
                      id="person-salutation"
                      className="h-11 w-full rounded-none px-2.5 data-[size=default]:h-11"
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="person-first-name">Vorname</Label>
                  <Input
                    id="person-first-name"
                    value={personForm.firstName}
                    onChange={(event) =>
                      setPersonForm((prev) => ({
                        ...prev,
                        firstName: event.target.value,
                      }))
                    }
                    className="h-11 rounded-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="person-last-name">Nachname</Label>
                  <Input
                    id="person-last-name"
                    value={personForm.lastName}
                    onChange={(event) =>
                      setPersonForm((prev) => ({
                        ...prev,
                        lastName: event.target.value,
                      }))
                    }
                    className="h-11 rounded-none"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="person-role">Funktion</Label>
                <Input
                  id="person-role"
                  value={personForm.role}
                  onChange={(event) =>
                    setPersonForm((prev) => ({
                      ...prev,
                      role: event.target.value,
                    }))
                  }
                  className="h-11 rounded-none"
                  placeholder="z. B. Geschäftsführer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="person-street">Straße und Hausnummer</Label>
                <Input
                  id="person-street"
                  value={personForm.street}
                  onChange={(event) =>
                    setPersonForm((prev) => ({
                      ...prev,
                      street: event.target.value,
                    }))
                  }
                  className="h-11 rounded-none"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                <div className="space-y-2">
                  <Label htmlFor="person-postal">PLZ</Label>
                  <Input
                    id="person-postal"
                    value={personForm.postalCode}
                    onChange={(event) =>
                      setPersonForm((prev) => ({
                        ...prev,
                        postalCode: event.target.value,
                      }))
                    }
                    className="h-11 rounded-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="person-city">Ort</Label>
                  <Input
                    id="person-city"
                    value={personForm.city}
                    onChange={(event) =>
                      setPersonForm((prev) => ({
                        ...prev,
                        city: event.target.value,
                      }))
                    }
                    className="h-11 rounded-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="person-country">Land</Label>
                <Input
                  id="person-country"
                  value={personForm.country}
                  onChange={(event) =>
                    setPersonForm((prev) => ({
                      ...prev,
                      country: event.target.value,
                    }))
                  }
                  className="h-11 rounded-none"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="person-email">E-Mail</Label>
                  <Input
                    id="person-email"
                    type="email"
                    value={personForm.email}
                    onChange={(event) =>
                      setPersonForm((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    className="h-11 rounded-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="person-phone">Telefon</Label>
                  <Input
                    id="person-phone"
                    value={personForm.phone}
                    onChange={(event) =>
                      setPersonForm((prev) => ({
                        ...prev,
                        phone: event.target.value,
                      }))
                    }
                    className="h-11 rounded-none"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="person-mobile">Mobil</Label>
                  <Input
                    id="person-mobile"
                    value={personForm.mobile}
                    onChange={(event) =>
                      setPersonForm((prev) => ({
                        ...prev,
                        mobile: event.target.value,
                      }))
                    }
                    className="h-11 rounded-none"
                  />
                </div>
              </div>
              <div className="border-t border-border/70" />
              <div className="space-y-2">
                <Label htmlFor="person-notes">Notiz</Label>
                <Textarea
                  id="person-notes"
                  value={personForm.notes}
                  onChange={(event) =>
                    setPersonForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  rows={2}
                  className="rounded-none"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-11 rounded-none px-5"
                >
                  {editingPersonId ? "Person speichern" : "Person anlegen"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 rounded-none px-4"
                  onClick={resetPersonForm}
                >
                  Abbrechen
                </Button>
              </div>
            </form>
          ) : null}

          {persons.length === 0 ? (
            <div className="surface-card border-dashed p-8 text-center text-sm text-muted-foreground">
              Noch keine Personen dieser Firma.
            </div>
          ) : (
            <ul className="space-y-3">
              {persons.map((person) => (
                <li
                  key={person.id}
                  className="surface-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-heading text-lg font-medium tracking-tight">
                      {formatPersonListName(person)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[
                        person.role,
                        person.email,
                        person.phone || person.mobile,
                        [person.postalCode, person.city]
                          .filter(Boolean)
                          .join(" "),
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Ohne Kontaktdaten"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => startEditPerson(person)}
                      className="rounded-none"
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleDeletePerson(person.id)}
                      className="rounded-none text-destructive"
                    >
                      <Trash2Icon data-icon="inline-start" />
                      Löschen
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-xl font-medium tracking-tight">
            Akten
          </h2>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-none px-4"
            onClick={() => setShowMatterForm((open) => !open)}
          >
            <PlusIcon data-icon="inline-start" />
            Akte
          </Button>
        </div>

        {showMatterForm ? (
          <form
            onSubmit={handleCreateMatter}
            className="surface-card space-y-4 p-6"
          >
            <div className="space-y-2">
              <Label htmlFor="matter-title">Titel</Label>
              <Input
                id="matter-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 rounded-none"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matter-ref">Aktenzeichen</Label>
              <Input
                id="matter-ref"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                className="h-11 rounded-none"
                placeholder="optional"
              />
            </div>
            <Button
              type="submit"
              disabled={isPending}
              className="h-11 rounded-none px-5"
            >
              Akte anlegen
            </Button>
          </form>
        ) : null}

        {matters.length === 0 ? (
          <div className="surface-card border-dashed p-8 text-center text-sm text-muted-foreground">
            Noch keine Akten.
          </div>
        ) : (
          <ul className="space-y-3">
            {matters.map((matter) => (
              <li
                key={matter.id}
                className="surface-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <Link
                    href={`${basePath}/akten/${matter.id}`}
                    className="font-heading text-lg font-medium tracking-tight hover:underline"
                  >
                    {matter.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {matter.reference || "Ohne Aktenzeichen"}
                    {` · ${matter.letterCount} Dokument`}
                    {matter.letterCount === 1 ? "" : "e"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDeleteMatter(matter.id)}
                  className="rounded-none text-destructive"
                >
                  <Trash2Icon data-icon="inline-start" />
                  Löschen
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
