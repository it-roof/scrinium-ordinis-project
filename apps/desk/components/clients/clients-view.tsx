"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PlusIcon, SearchIcon } from "lucide-react";

import { CreateClientDialog } from "@/components/clients/create-client-dialog";
import { useAreaBasePath, useAreaFromPath } from "@/lib/area/use-area-path";
import {
  clientKindLabel,
  formatClientName,
  type ClientRecord,
} from "@/lib/clients/types";

function formatListDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatAddress(item: ClientRecord) {
  const line = [item.postalCode, item.city].filter(Boolean).join(" ");
  return [item.street, line].filter(Boolean).join(", ");
}

function metaLine(item: ClientRecord) {
  const parts: string[] = [clientKindLabel(item.kind)];
  if (item.kind === "company" && item.personCount > 0) {
    parts.push(
      `${item.personCount} Person${item.personCount === 1 ? "" : "en"}`
    );
  }
  if (item.matterCount > 0) {
    parts.push(`${item.matterCount} Akte${item.matterCount === 1 ? "" : "n"}`);
  }
  const address = formatAddress(item);
  if (address) {
    parts.push(address);
  }
  return parts.join(" · ");
}

export function ClientsView({ initialItems }: { initialItems: ClientRecord[] }) {
  const basePath = useAreaBasePath() ?? "";
  const area = useAreaFromPath();
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => {
      const name = formatClientName(item).toLowerCase();
      const address = formatAddress(item).toLowerCase();
      const email = item.email.toLowerCase();
      return (
        name.includes(query) ||
        address.includes(query) ||
        email.includes(query) ||
        clientKindLabel(item.kind).toLowerCase().includes(query)
      );
    });
  }, [items, search]);

  return (
    <div className="lab-clients relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pt-12 pb-14 md:px-10 md:pt-14">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="b-display b-title font-medium tracking-[-0.02em]">
              Mandanten
            </h1>
            <p className="b-lead mt-2 max-w-none text-[1.0625rem] leading-[1.55] md:mt-2.5">
              Firmen und Privatpersonen in diesem Bereich.
            </p>
          </div>
          <button
            type="button"
            className="b-btn b-btn-primary shrink-0 gap-1.5 self-start sm:self-auto"
            disabled={!area}
            onClick={() => setCreateOpen(true)}
          >
            <PlusIcon className="size-4" strokeWidth={1.75} />
            Neuer Mandant
          </button>
        </header>

        <div className="mt-10 flex flex-col gap-6">
          {items.length > 0 ? (
            <div className="relative max-w-xl">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
                style={{ color: "var(--b-muted)" }}
                strokeWidth={1.75}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Suchen…"
                aria-label="Mandanten durchsuchen"
                className="lab-prompts-search"
              />
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <div className="lab-function-card border px-6 py-12 text-center">
              <p className="b-display text-[1.125rem] font-medium tracking-[-0.01em]">
                {items.length === 0 ? "Noch keine Mandanten" : "Keine Treffer"}
              </p>
              <p className="b-meta mx-auto mt-2 max-w-sm">
                {items.length === 0
                  ? "Legen Sie Ihren ersten Mandanten an."
                  : "Suche anpassen."}
              </p>
              {items.length === 0 ? (
                <button
                  type="button"
                  className="b-btn b-btn-primary mx-auto mt-6 gap-1.5"
                  disabled={!area}
                  onClick={() => setCreateOpen(true)}
                >
                  <PlusIcon className="size-4" strokeWidth={1.75} />
                  Neuer Mandant
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="grid gap-3.5">
              {filtered.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`${basePath}/mandanten/${item.id}`}
                    className="lab-function-card flex min-w-0 flex-col gap-1.5 border px-5 py-4 sm:px-6 sm:py-5"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="b-display min-w-0 truncate text-[1.125rem] font-medium tracking-[-0.01em]">
                        {formatClientName(item)}
                      </span>
                      <span className="b-meta shrink-0 tabular-nums">
                        {formatListDate(item.updatedAt)}
                      </span>
                    </div>
                    <p
                      className="truncate text-[0.875rem] leading-snug"
                      style={{ color: "var(--b-muted)" }}
                    >
                      {metaLine(item)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {area ? (
        <CreateClientDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          module={area}
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
      ) : null}
    </div>
  );
}
