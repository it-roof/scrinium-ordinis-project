"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  getAiConsentForClient,
  grantAiConsent,
  revokeAiConsent,
  type AiConsentView,
} from "@/lib/ai/consent-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_LABEL: Record<AiConsentView["status"], string> = {
  none: "Keine",
  granted: "Erteilt",
  revoked: "Widerrufen",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Berlin",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function ClientAiConsentSection({
  clientId,
  initialConsent,
}: {
  clientId: string;
  initialConsent: AiConsentView;
}) {
  const [consent, setConsent] = useState(initialConsent);
  const [waiver43e, setWaiver43e] = useState(false);
  const [evidence, setEvidence] = useState("");
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const result = await getAiConsentForClient(clientId);
      if (result.success) {
        setConsent(result.consent);
      }
    });
  }

  function handleGrant() {
    startTransition(async () => {
      const result = await grantAiConsent({
        clientId,
        waiver43e,
        evidence: evidence.trim() || undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setConsent(result.consent);
      setWaiver43e(false);
      setEvidence("");
      toast.success("KI-Einwilligung erfasst.");
    });
  }

  function handleRevoke() {
    startTransition(async () => {
      const result = await revokeAiConsent(clientId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setConsent(result.consent);
      toast.success("Widerruf erfasst — KI-Aufrufe sind gesperrt.");
      refresh();
    });
  }

  return (
    <section className="surface-card space-y-4 p-6">
      <div>
        <h2 className="font-heading text-lg font-medium tracking-tight">
          KI-Einwilligung
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ohne erteilte Einwilligung werden keine KI-Aufrufe für diesen Mandanten
          ausgeführt.
        </p>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd className="font-medium">{STATUS_LABEL[consent.status]}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Zuletzt geändert</dt>
          <dd className="font-medium">{formatDate(consent.createdAt)}</dd>
        </div>
        {consent.status === "granted" ? (
          <>
            <div>
              <dt className="text-muted-foreground">Erteilt am</dt>
              <dd className="font-medium">{formatDate(consent.grantedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Verzicht § 43e Abs. 6 BRAO</dt>
              <dd className="font-medium">
                {consent.waiver43e ? "Ja" : "Nein"}
              </dd>
            </div>
          </>
        ) : null}
        {consent.evidence ? (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Nachweis</dt>
            <dd className="font-medium break-all">{consent.evidence}</dd>
          </div>
        ) : null}
      </dl>

      {consent.status !== "granted" ? (
        <div className="space-y-4 border-t border-border/70 pt-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="waiver-43e"
              checked={waiver43e}
              onCheckedChange={(checked) => setWaiver43e(checked === true)}
              className="mt-0.5"
            />
            <Label htmlFor="waiver-43e" className="leading-snug font-normal">
              Verzicht nach § 43e Abs. 6 BRAO erklärt
            </Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="consent-evidence">Nachweis (optional)</Label>
            <Input
              id="consent-evidence"
              value={evidence}
              onChange={(event) => setEvidence(event.target.value)}
              className="h-11 rounded-none"
              placeholder="Verweis auf hochgeladene Einwilligung / Aktennotiz"
            />
          </div>
          <Button
            type="button"
            disabled={isPending}
            onClick={handleGrant}
            className="h-11 rounded-none px-5"
          >
            Einwilligung erfassen
          </Button>
        </div>
      ) : (
        <div className="border-t border-border/70 pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={handleRevoke}
            className="h-11 rounded-none px-5"
          >
            Widerruf erfassen
          </Button>
        </div>
      )}
    </section>
  );
}
