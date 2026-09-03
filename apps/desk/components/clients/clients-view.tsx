"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { CreateClientDialog } from "@/components/clients/create-client-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { useAreaBasePath } from "@/lib/area/use-area-path";
import { deleteClient } from "@/lib/clients/actions";
import {
  clientKindLabel,
  formatClientName,
  type ClientRecord,
} from "@/lib/clients/types";
import { Button } from "@/components/ui/button";

function formatAddress(item: ClientRecord) {
  const line = [item.postalCode, item.city].filter(Boolean).join(" ");
  return [item.street, line].filter(Boolean).join(", ");
}

function metaLine(item: ClientRecord) {
  const parts: string[] = [clientKindLabel(item.kind)];
  if (item.kind === "company") {
    parts.push(
      `${item.personCount} Person${item.personCount === 1 ? "" : "en"}`
    );
  }
  parts.push(`${item.matterCount} Akte${item.matterCount === 1 ? "" : "n"}`);
  const address = formatAddress(item);
  if (address) {
    parts.push(address);
  }
  return parts.join(" · ");
}

export function ClientsView({ initialItems }: { initialItems: ClientRecord[] }) {
  const router = useRouter();
  const basePath = useAreaBasePath() ?? "";
  const [items, setItems] = useState(initialItems);
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteClient(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Mandant gelöscht.");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <PageHeader
        title="Mandanten"
        description="Firmen und Privatpersonen mit zugeordneten Akten."
      >
        <Button
          type="button"
          className="h-10 rounded-none px-4"
          onClick={() => setCreateOpen(true)}
        >
          <PlusIcon data-icon="inline-start" />
          Mandant
        </Button>
      </PageHeader>

      <CreateClientDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            router.refresh();
          }
        }}
        onClientCreated={(client) => {
          setItems((prev) =>
            [...prev, client].sort((a, b) =>
              formatClientName(a).localeCompare(formatClientName(b), "de")
            )
          );
        }}
        onPersonCreated={(clientId) => {
          setItems((prev) =>
            prev.map((item) =>
              item.id === clientId
                ? { ...item, personCount: item.personCount + 1 }
                : item
            )
          );
        }}
      />

      {items.length === 0 ? (
        <div className="surface-card border-dashed p-10 text-center text-sm text-muted-foreground">
          Noch keine Mandanten.
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
                  href={`${basePath}/mandanten/${item.id}`}
                  className="font-heading text-lg font-medium tracking-tight hover:underline"
                >
                  {formatClientName(item)}
                </Link>
                <p className="text-sm text-muted-foreground">{metaLine(item)}</p>
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
