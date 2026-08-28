"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ClientEmailMatch, ClientRecipientOption } from "@/lib/clients/types";
import { clientKindLabel } from "@/lib/clients/types";
import type { ContentModule } from "@/lib/db/schema";
import {
  listClientRecipientOptions,
  lookupRecipientClient,
} from "@/lib/letters/actions";
import {
  EMAIL_MULTILINE_PLACEHOLDERS,
  EMAIL_PLACEHOLDER_HINTS,
  listOpenEmailPlaceholders,
} from "@/lib/letters/email-template";
import { applyPlaceholders } from "@/lib/letters/placeholders";

type EmailPlaceholderPanelProps = {
  subject: string;
  body: string;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  recipientEmail: string;
  module: ContentModule;
  matterId: string;
  onSuggestMatter?: (matterId: string) => void;
  onRecipientEmailChange: (value: string) => void;
  contentLocked?: boolean;
  pickerDisabled?: boolean;
  disabled?: boolean;
};

function recipientOptionToMatch(option: ClientRecipientOption): ClientEmailMatch {
  return {
    clientId: option.clientId,
    clientName: option.clientName,
    clientKind: option.clientKind,
    matchedEmail: option.email,
    matchVia: option.contact ? "contact" : "client",
    contact: option.contact,
    matters: option.matters,
  };
}

function ClientMatchCard({
  match,
  matterId,
  onSuggestMatter,
}: {
  match: ClientEmailMatch;
  matterId: string;
  onSuggestMatter?: (matterId: string) => void;
}) {
  return (
    <div className="mt-2 space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{match.clientName}</p>
        <p className="text-xs text-muted-foreground">
          {clientKindLabel(match.clientKind)}
          {match.matchVia === "contact" && match.contact ? (
            <>
              {" "}
              · Kontakt: {match.contact.name}
              {match.contact.role ? ` (${match.contact.role})` : ""}
            </>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground">{match.matchedEmail}</p>
      </div>

      {match.matters.length === 0 ? (
        <p className="text-xs text-muted-foreground">Keine Akte hinterlegt.</p>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Akte</p>
          <select
            value={matterId}
            disabled={!onSuggestMatter}
            onChange={(event) => onSuggestMatter?.(event.target.value)}
            className="flex h-9 w-full rounded-none border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Ohne Akte</option>
            {match.matters.map((matter) => (
              <option key={matter.id} value={matter.id}>
                {matter.reference ? `${matter.reference} — ` : ""}
                {matter.title}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function EmailClientMatchSection({
  recipientEmail,
  module,
  matterId,
  onSuggestMatter,
  onRecipientEmailChange,
  contentLocked = false,
  pickerDisabled = false,
}: {
  recipientEmail: string;
  module: ContentModule;
  matterId: string;
  onSuggestMatter?: (matterId: string) => void;
  onRecipientEmailChange: (value: string) => void;
  contentLocked?: boolean;
  pickerDisabled?: boolean;
}) {
  const [matches, setMatches] = useState<ClientEmailMatch[]>([]);
  const [manualMatch, setManualMatch] = useState<ClientEmailMatch | null>(null);
  const [lookupEmail, setLookupEmail] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [options, setOptions] = useState<ClientRecipientOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const autoAppliedRef = useRef<string | null>(null);

  useEffect(() => {
    const email = recipientEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMatches([]);
      setLookupEmail(null);
      return;
    }

    const timer = window.setTimeout(() => {
      void lookupRecipientClient(email, module).then((result) => {
        if (!result.success) {
          setMatches([]);
          setLookupEmail(email);
          return;
        }
        setMatches(result.matches);
        setLookupEmail(email);
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [recipientEmail, module]);

  useEffect(() => {
    if (!manualMatch) {
      return;
    }
    const normalized = recipientEmail.trim().toLowerCase();
    if (normalized !== manualMatch.matchedEmail) {
      setManualMatch(null);
    }
  }, [recipientEmail, manualMatch]);

  useEffect(() => {
    if (!pickerOpen) {
      return;
    }
    if (options.length > 0 || optionsLoading) {
      return;
    }

    setOptionsLoading(true);
    void listClientRecipientOptions(module).then((result) => {
      setOptionsLoading(false);
      if (result.success) {
        setOptions(result.options);
      }
    });
  }, [module, options.length, optionsLoading, pickerOpen]);

  useEffect(() => {
    if (!onSuggestMatter || matterId.trim()) {
      return;
    }
    const activeMatch = matches[0] ?? manualMatch;
    if (!activeMatch || activeMatch.matters.length !== 1) {
      return;
    }
    const email = lookupEmail ?? manualMatch?.matchedEmail ?? null;
    if (!email) {
      return;
    }
    const suggestedId = activeMatch.matters[0].id;
    const key = `${email}:${suggestedId}`;
    if (autoAppliedRef.current === key) {
      return;
    }
    autoAppliedRef.current = key;
    onSuggestMatter(suggestedId);
  }, [lookupEmail, manualMatch, matches, matterId, onSuggestMatter]);

  const activeMatch = matches[0] ?? manualMatch;

  const filteredOptions = useMemo(() => {
    const query = pickerQuery.trim().toLowerCase();
    if (!query) {
      return options;
    }
    return options.filter((option) => {
      const haystack = [
        option.clientName,
        option.email,
        option.contact?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [options, pickerQuery]);

  function openPicker() {
    if (pickerDisabled) {
      return;
    }
    setPickerOpen(true);
    setPickerQuery("");
  }

  function selectOption(option: ClientRecipientOption) {
    const match = recipientOptionToMatch(option);
    setManualMatch(match);
    setPickerOpen(false);
    setPickerQuery("");
    if (contentLocked) {
      if (option.matters.length === 1) {
        onSuggestMatter?.(option.matters[0].id);
      } else {
        onSuggestMatter?.("");
      }
      return;
    }
    onRecipientEmailChange(option.email);
  }

  function handlePickerBlur() {
    window.setTimeout(() => setPickerOpen(false), 150);
  }

  const pickerDropdown = pickerOpen ? (
    <div className="relative z-20 mt-2 w-full min-w-[16rem]">
      <Input
        value={pickerQuery}
        onChange={(event) => setPickerQuery(event.target.value)}
        onBlur={handlePickerBlur}
        placeholder="Mandant suchen…"
        autoComplete="off"
        autoFocus
        className="h-10 rounded-none bg-background"
      />
      <ul className="mt-1 max-h-52 overflow-y-auto border border-border bg-background shadow-md">
        {optionsLoading ? (
          <li className="px-3 py-2.5 text-sm text-muted-foreground">Laden…</li>
        ) : filteredOptions.length === 0 ? (
          <li className="px-3 py-2.5 text-sm text-muted-foreground">Kein Treffer</li>
        ) : (
          filteredOptions.map((option) => (
            <li key={`${option.clientId}:${option.email}`}>
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted/50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
              >
                <span className="block font-medium">{option.clientName}</span>
                <span className="block text-xs text-muted-foreground">
                  {option.contact
                    ? `${option.contact.name} · ${option.email}`
                    : option.email}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  ) : null;

  return (
    <div className="shrink-0 border-b border-border/60 px-5 py-5">
      <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
        Mandant
      </p>

      {activeMatch ? (
        <div className="space-y-2">
          <ClientMatchCard
            match={activeMatch}
            matterId={matterId}
            onSuggestMatter={onSuggestMatter}
          />
          {contentLocked ? (
            <button
              type="button"
              disabled={pickerDisabled}
              onClick={openPicker}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
            >
              Mandant ändern
            </button>
          ) : null}
          {pickerDropdown}
        </div>
      ) : (
        <div className="relative mt-2">
          <button
            type="button"
            disabled={pickerDisabled}
            onClick={openPicker}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
          >
            unzugeordnet
          </button>
          {pickerDropdown}
        </div>
      )}
    </div>
  );
}

function EmailPlaceholderWizard({
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  disabled,
}: {
  subject: string;
  body: string;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const open = useMemo(
    () => listOpenEmailPlaceholders(subject, body),
    [subject, body]
  );

  const current = open[0] ?? null;

  useEffect(() => {
    setDraft("");
  }, [current]);

  function applyCurrent() {
    if (!current || !draft.trim()) {
      return;
    }
    const values = { [current]: draft.trim() };
    onSubjectChange(applyPlaceholders(subject, values));
    onBodyChange(applyPlaceholders(body, values));
    setDraft("");
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
      <h2 className="font-heading text-base font-medium tracking-tight">
        Platzhalter ersetzen
      </h2>

      {disabled ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {open.length === 0
            ? "Alle Platzhalter ersetzt."
            : "Platzhalter können nach dem Versand nicht mehr bearbeitet werden."}
        </p>
      ) : open.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Alle Platzhalter ersetzt.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="font-mono text-sm">{`{{${current}}}`}</p>

          {EMAIL_MULTILINE_PLACEHOLDERS.has(current) ? (
            <Textarea
              id={`email-ph-${current}`}
              value={draft}
              disabled={disabled}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                EMAIL_PLACEHOLDER_HINTS[current] ?? "Wert eingeben…"
              }
              rows={4}
              className="min-h-24 rounded-none text-sm leading-relaxed"
            />
          ) : (
            <Input
              id={`email-ph-${current}`}
              value={draft}
              disabled={disabled}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                EMAIL_PLACEHOLDER_HINTS[current] ?? "Wert eingeben…"
              }
              className="h-10 rounded-none"
              onKeyDown={(event) => {
                if (event.key === "Enter" && draft.trim()) {
                  event.preventDefault();
                  applyCurrent();
                }
              }}
            />
          )}

          <Button
            type="button"
            disabled={disabled || !draft.trim()}
            onClick={applyCurrent}
            className="h-10 w-full rounded-none"
          >
            Ersetzen & weiter
            <ArrowRightIcon data-icon="inline-end" className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function EmailPlaceholderPanel({
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  recipientEmail,
  module,
  matterId,
  onSuggestMatter,
  onRecipientEmailChange,
  contentLocked = false,
  pickerDisabled = false,
  disabled = false,
}: EmailPlaceholderPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <EmailClientMatchSection
        recipientEmail={recipientEmail}
        module={module}
        matterId={matterId}
        onSuggestMatter={onSuggestMatter}
        onRecipientEmailChange={onRecipientEmailChange}
        contentLocked={contentLocked}
        pickerDisabled={pickerDisabled}
      />
      <EmailPlaceholderWizard
        subject={subject}
        body={body}
        onSubjectChange={onSubjectChange}
        onBodyChange={onBodyChange}
        disabled={disabled}
      />
    </div>
  );
}
