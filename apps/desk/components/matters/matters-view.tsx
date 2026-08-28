"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { useAreaBasePath } from "@/lib/area/use-area-path";
import type { MatterRecord } from "@/lib/clients/types";
import { deleteMatter } from "@/lib/matters/actions";
import { Button } from "@/components/ui/button";

export function MattersView({ initialItems }: { initialItems: MatterRecord[] }) {
  const router = useRouter();
  const basePath = useAreaBasePath() ?? "";
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteMatter(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Akte gelöscht.");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <PageHeader
        title="Akten"
        description="Alle Akten im aktuellen Bereich."
      />

      {items.length === 0 ? (
        <div className="surface-card border-dashed p-10 text-center text-sm text-muted-foreground">
          Noch keine Akten. Akten legst du beim Mandanten an.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="surface-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <Link
                  href={`${basePath}/akten/${item.id}`}
                  className="font-heading text-lg font-medium tracking-tight hover:underline"
                >
                  {item.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  <Link
                    href={`${basePath}/mandanten/${item.clientId}`}
                    className="hover:underline"
                  >
                    {item.clientName}
                  </Link>
                  {item.reference ? ` · ${item.reference}` : ""}
                  {` · ${item.letterCount} Dokument`}
                  {item.letterCount === 1 ? "" : "e"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => handleDelete(item.id)}
                className="rounded-none text-destructive"
              >
                <Trash2Icon data-icon="inline-start" />
                Löschen
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
