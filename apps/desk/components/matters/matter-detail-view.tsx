"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { useAreaBasePath } from "@/lib/area/use-area-path";
import type { MatterRecord } from "@/lib/clients/types";
import {
  LETTER_KIND_LABELS,
  LETTER_STATUS_LABELS,
  type LetterRecord,
} from "@/lib/letters/types";
import { updateMatter } from "@/lib/matters/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function MatterDetailView({
  matter,
  letters,
}: {
  matter: MatterRecord;
  letters: LetterRecord[];
}) {
  const router = useRouter();
  const basePath = useAreaBasePath() ?? "";
  const [title, setTitle] = useState(matter.title);
  const [reference, setReference] = useState(matter.reference);
  const [notes, setNotes] = useState(matter.notes);
  const [isPending, startTransition] = useTransition();

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateMatter(matter.id, {
        title,
        reference,
        notes,
        module: matter.module,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Akte gespeichert.");
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
        <Link href={`${basePath}/akten`}>
          <ArrowLeftIcon data-icon="inline-start" />
          Zurück zu Akten
        </Link>
      </Button>

      <PageHeader
        title={title}
        description={`${matter.clientName}${
          reference ? ` · ${reference}` : ""
        }`}
      >
        <Button asChild className="h-10 rounded-none px-4">
          <Link href={`${basePath}/schreiben/neu?matter=${matter.id}`}>
            <PlusIcon data-icon="inline-start" />
            Schreiben
          </Link>
        </Button>
      </PageHeader>

      <form onSubmit={handleSave} className="surface-card space-y-4 p-6">
        <h2 className="font-heading text-lg font-medium tracking-tight">Akte</h2>
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
          <Label htmlFor="matter-reference">Aktenzeichen</Label>
          <Input
            id="matter-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            className="h-11 rounded-none"
            placeholder="optional"
          />
        </div>
        <div className="border-t border-border/70" />
        <div className="space-y-2">
          <Label htmlFor="matter-notes">Notiz</Label>
          <Textarea
            id="matter-notes"
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

      <section className="space-y-4">
        <h2 className="font-heading text-xl font-medium tracking-tight">
          Dokumente
        </h2>
        {letters.length === 0 ? (
          <div className="surface-card border-dashed p-8 text-center text-sm text-muted-foreground">
            Noch keine Schreiben in dieser Akte.
          </div>
        ) : (
          <ul className="space-y-3">
            {letters.map((letter) => (
              <li key={letter.id} className="surface-card space-y-1 p-5">
                <Link
                  href={`${basePath}/schreiben/${letter.id}/bearbeiten`}
                  className="font-heading text-lg font-medium tracking-tight hover:underline"
                >
                  {letter.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {LETTER_KIND_LABELS[letter.kind]} ·{" "}
                  {LETTER_STATUS_LABELS[letter.status]}
                  {letter.assignedToName
                    ? ` · ${letter.assignedToName}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
