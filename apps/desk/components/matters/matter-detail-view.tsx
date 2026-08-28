"use client";

import Link from "next/link";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { useAreaBasePath } from "@/lib/area/use-area-path";
import type { MatterRecord } from "@/lib/clients/types";
import {
  LETTER_KIND_LABELS,
  LETTER_STATUS_LABELS,
  type LetterRecord,
} from "@/lib/letters/types";
import { Button } from "@/components/ui/button";

export function MatterDetailView({
  matter,
  letters,
}: {
  matter: MatterRecord;
  letters: LetterRecord[];
}) {
  const basePath = useAreaBasePath() ?? "";

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
        title={matter.title}
        description={`${matter.clientName}${
          matter.reference ? ` · ${matter.reference}` : ""
        }`}
      >
        <Button asChild className="h-10 rounded-none px-4">
          <Link href={`${basePath}/schreiben/neu?matter=${matter.id}`}>
            <PlusIcon data-icon="inline-start" />
            Schreiben
          </Link>
        </Button>
      </PageHeader>

      {matter.notes ? (
        <p className="text-sm text-muted-foreground">{matter.notes}</p>
      ) : null}

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
