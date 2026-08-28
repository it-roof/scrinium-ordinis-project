"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  saveMySmtpSettingsAction,
  sendMySmtpTestEmailAction,
} from "@/lib/smtp/actions";
import type { UserSmtpSettingsPublic } from "@/lib/smtp/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SmtpSettingsForm({
  initial,
  defaultFromName,
  defaultFromEmail,
}: {
  initial: UserSmtpSettingsPublic | null;
  defaultFromName: string;
  defaultFromEmail: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [testing, startTest] = useTransition();

  const [host, setHost] = useState(initial?.host ?? "");
  const [port, setPort] = useState(
    initial?.port != null ? String(initial.port) : ""
  );
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState("");
  const [fromName, setFromName] = useState(initial?.fromName ?? "");
  const [fromEmail, setFromEmail] = useState(initial?.fromEmail ?? "");
  const [hasPassword, setHasPassword] = useState(Boolean(initial?.hasPassword));
  const [hasSavedSettings, setHasSavedSettings] = useState(Boolean(initial));
  const [testTo, setTestTo] = useState(defaultFromEmail);

  const busy = pending || testing;
  const canTest = hasSavedSettings;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const portTrimmed = port.trim();
    let parsedPort: number | null = null;
    if (portTrimmed) {
      parsedPort = Number.parseInt(portTrimmed, 10);
      if (!Number.isFinite(parsedPort)) {
        toast.error("Bitte einen gültigen Port angeben.");
        return;
      }
    }

    startTransition(async () => {
      const result = await saveMySmtpSettingsAction({
        host,
        port: parsedPort,
        username,
        password: password || undefined,
        fromName,
        fromEmail,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setPassword("");
      setHasPassword(result.item.hasPassword);
      setHasSavedSettings(true);
      toast.success("SMTP-Einstellungen gespeichert.");
      router.refresh();
    });
  }

  function onTest() {
    startTest(async () => {
      const result = await sendMySmtpTestEmailAction({ to: testTo });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Testmail an ${result.to} gesendet.`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="surface-card space-y-6 p-6">
      <div>
        <h2 className="font-heading text-lg font-medium tracking-tight">
          E-Mail-Versand (SMTP)
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="smtp-host">SMTP-Host</Label>
          <Input
            id="smtp-host"
            value={host}
            onChange={(event) => setHost(event.target.value)}
            placeholder="smtp.beispiel.de"
            autoComplete="off"
            className="h-10 rounded-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtp-port">Port</Label>
          <Input
            id="smtp-port"
            type="number"
            min={1}
            max={65535}
            value={port}
            onChange={(event) => setPort(event.target.value)}
            placeholder="587"
            className="h-10 rounded-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtp-username">Benutzername</Label>
          <Input
            id="smtp-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="name@beispiel.de"
            autoComplete="off"
            className="h-10 rounded-none"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="smtp-password">
            Passwort{" "}
            {hasPassword ? (
              <span className="font-normal text-muted-foreground">
                (leer lassen = unverändert)
              </span>
            ) : null}
          </Label>
          <Input
            id="smtp-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            placeholder={hasPassword ? "••••••••" : undefined}
            className="h-10 rounded-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtp-from-name">Absendername</Label>
          <Input
            id="smtp-from-name"
            value={fromName}
            onChange={(event) => setFromName(event.target.value)}
            placeholder={defaultFromName || "Vor- und Nachname"}
            className="h-10 rounded-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtp-from-email">Absender-E-Mail</Label>
          <Input
            id="smtp-from-email"
            type="email"
            value={fromEmail}
            onChange={(event) => setFromEmail(event.target.value)}
            placeholder={defaultFromEmail || "name@beispiel.de"}
            className="h-10 rounded-none"
          />
        </div>
      </div>

      <div className="space-y-3 border-t border-border/60 pt-4">
        <div className="space-y-2">
          <Label htmlFor="smtp-test-to">Testmail an</Label>
          <Input
            id="smtp-test-to"
            type="email"
            value={testTo}
            onChange={(event) => setTestTo(event.target.value)}
            placeholder="empfaenger@beispiel.de"
            className="h-10 rounded-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={busy}
            className="h-10 rounded-none px-4"
          >
            {pending ? "Wird gespeichert…" : "Speichern"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !canTest}
            onClick={onTest}
            className="h-10 rounded-none px-4"
          >
            {testing ? "Test wird gesendet…" : "Testmail senden"}
          </Button>
        </div>
      </div>
    </form>
  );
}
