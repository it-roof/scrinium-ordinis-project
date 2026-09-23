"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createIntakeInviteAction,
  revokeIntakeInviteAction,
  sendIntakeInviteMailAction,
} from "@/lib/intake/actions";
import type { IntakeInviteListItem } from "@/lib/intake/storage";

const STATUS_LABEL: Record<string, string> = {
  open: "Offen",
  submitted: "Ausgefüllt",
  revoked: "Widerrufen",
  expired: "Abgelaufen",
};

export function IntakeListView({
  initialItems,
}: {
  initialItems: IntakeInviteListItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  async function createInvite(): Promise<
    { inviteId: string; url: string } | null
  > {
    const result = await createIntakeInviteAction({
      recipientEmail: email,
      recipientName: name,
    });
    if (!result.ok) {
      toast.error(result.error);
      return null;
    }
    setLastUrl(result.url);
    setEmail("");
    setName("");
    router.refresh();
    return { inviteId: result.inviteId, url: result.url };
  }

  function copyLink() {
    if (!email.trim()) {
      toast.error("Bitte eine E-Mail angeben.");
      return;
    }
    startTransition(async () => {
      const created = await createInvite();
      if (!created) return;
      try {
        await navigator.clipboard.writeText(created.url);
        toast.success("Link erstellt und kopiert.");
      } catch {
        toast.success("Link erstellt — bitte unten kopieren.");
      }
    });
  }

  function sendMail() {
    if (!email.trim()) {
      toast.error("Bitte eine E-Mail angeben.");
      return;
    }
    startTransition(async () => {
      const created = await createInvite();
      if (!created) return;
      const result = await sendIntakeInviteMailAction({
        inviteId: created.inviteId,
        url: created.url,
      });
      if (!result.ok) {
        toast.error(result.error);
        try {
          await navigator.clipboard.writeText(created.url);
          toast.message("Link wurde in die Zwischenablage kopiert.");
        } catch {
          // ignore
        }
        return;
      }
      toast.success("E-Mail gesendet.");
    });
  }

  function revoke(inviteId: string) {
    startTransition(async () => {
      const result = await revokeIntakeInviteAction(inviteId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Einladung widerrufen.");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pt-12 pb-14 md:px-10 md:pt-14">
      <header className="flex max-w-2xl flex-col">
        <h1 className="b-display b-title font-medium tracking-[-0.02em]">
          Mandats-Aufnahmebogen
        </h1>
        <p className="b-lead mt-2 max-w-none text-[1.0625rem] leading-[1.55] md:mt-2.5">
          E-Mail eintragen und Einladung senden.
        </p>
      </header>

      <section className="mt-10 space-y-4">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            sendMail();
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-Mail des Mandanten"
            autoComplete="off"
            autoFocus
            required
            className="h-12 w-full rounded-xl border bg-transparent px-4 text-base outline-none"
            style={{
              borderColor: "var(--b-line)",
              color: "var(--b-ink)",
              background: "var(--b-bg-elev)",
            }}
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            autoComplete="off"
            className="h-11 w-full rounded-xl border bg-transparent px-4 text-[0.9375rem] outline-none"
            style={{
              borderColor: "var(--b-line)",
              color: "var(--b-ink)",
              background: "var(--b-bg-elev)",
            }}
          />
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              className="b-btn b-btn-primary disabled:opacity-40"
              disabled={pending || !email.trim()}
            >
              {pending ? "…" : "Per E-Mail senden"}
            </button>
            <button
              type="button"
              className="b-btn b-btn-ghost disabled:opacity-40"
              disabled={pending || !email.trim()}
              onClick={copyLink}
            >
              Nur Link kopieren
            </button>
          </div>
        </form>

        {lastUrl ? (
          <p className="b-meta break-all pt-1">
            Zuletzt: {lastUrl}
          </p>
        ) : null}
      </section>

      <section className="mt-14 space-y-5">
        <h2 className="b-display text-[1.3125rem] font-medium tracking-[-0.015em]">
          Einladungen
        </h2>
        {initialItems.length === 0 ? (
          <p className="b-meta">Noch keine Einladungen.</p>
        ) : (
          <ul className="grid gap-3.5">
            {initialItems.map((item) => (
              <li key={item.id}>
                <article className="lab-function-card flex flex-col gap-4 border p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="b-meta text-[0.75rem]">
                      {STATUS_LABEL[item.status] ?? item.status}
                      {" · "}
                      {new Date(item.createdAt).toLocaleDateString("de-DE")}
                    </p>
                    <p className="b-display mt-2 truncate text-[1.125rem] font-medium tracking-[-0.01em]">
                      {item.recipientName || item.recipientEmail}
                    </p>
                    {item.recipientName ? (
                      <p className="b-meta mt-1 truncate">{item.recipientEmail}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    <Link
                      href={`/aufnahmebogen/${item.id}`}
                      className="text-[0.875rem] font-semibold tracking-[0.01em]"
                      style={{ color: "var(--b-accent)" }}
                    >
                      Öffnen
                    </Link>
                    {item.status === "open" ? (
                      <button
                        type="button"
                        className="b-btn b-btn-ghost disabled:opacity-40"
                        disabled={pending}
                        onClick={() => revoke(item.id)}
                      >
                        Widerrufen
                      </button>
                    ) : null}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
