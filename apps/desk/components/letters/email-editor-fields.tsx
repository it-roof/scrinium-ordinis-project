"use client";

import { SendIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PlaceholderHighlightInput,
  PlaceholderHighlightTextarea,
} from "@/components/letters/placeholder-highlight-field";
import { cn } from "@/lib/utils";

type EmailEditorFieldsProps = {
  className?: string;
  contentLocked?: boolean;
  subject: string;
  body: string;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  recipientEmail?: string;
  onRecipientEmailChange?: (value: string) => void;
  ccEmail?: string;
  onCcEmailChange?: (value: string) => void;
  senderFrom?: string;
  disabled?: boolean;
  isPending?: boolean;
  canSend?: boolean;
  onSend?: () => void;
};

function ComposeRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[5.5rem_minmax(0,1fr)] border-b border-border/70 sm:grid-cols-[6.5rem_minmax(0,1fr)]",
        className
      )}
    >
      <div className="flex items-center bg-muted/25 px-3 py-2.5 text-sm text-muted-foreground">
        {label}
      </div>
      <div className="flex min-w-0 items-center px-3 py-2">{children}</div>
    </div>
  );
}

const composeInputClass =
  "h-9 w-full rounded-none border-0 border-b border-transparent bg-transparent px-0 shadow-none focus-visible:border-foreground/35 focus-visible:ring-0";

export function EmailEditorFields({
  className,
  contentLocked = false,
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  recipientEmail = "",
  onRecipientEmailChange,
  ccEmail = "",
  onCcEmailChange,
  senderFrom = "SMTP in Einstellungen hinterlegen",
  disabled = false,
  isPending = false,
  canSend = false,
  onSend,
}: EmailEditorFieldsProps) {
  const fieldsDisabled = disabled || contentLocked;

  return (
    <div
      className={cn(
        "flex flex-col border border-border/80 bg-background shadow-[var(--shadow-soft)]",
        className
      )}
    >
      {onRecipientEmailChange ? (
        <ComposeRow label="An">
          <Input
            id="email-field-recipient"
            type="email"
            value={recipientEmail}
            disabled={fieldsDisabled}
            onChange={(event) => onRecipientEmailChange(event.target.value)}
            placeholder="empfaenger@example.de"
            className={composeInputClass}
            autoComplete="email"
          />
        </ComposeRow>
      ) : null}

      {onCcEmailChange ? (
        <ComposeRow label="Kopie">
          <Input
            id="email-field-cc"
            type="email"
            value={ccEmail}
            disabled={fieldsDisabled}
            onChange={(event) => onCcEmailChange(event.target.value)}
            placeholder="optional@example.de"
            className={composeInputClass}
            autoComplete="email"
          />
        </ComposeRow>
      ) : null}

      <ComposeRow label="Von">
        <p
          className={cn(
            "min-h-9 w-full truncate py-1 text-sm",
            senderFrom.includes("Einstellungen")
              ? "text-muted-foreground italic"
              : "text-foreground"
          )}
        >
          {senderFrom}
        </p>
      </ComposeRow>

      <ComposeRow label="Betreff">
        <PlaceholderHighlightInput
          id="email-field-subject"
          value={subject}
          disabled={fieldsDisabled}
          onChange={onSubjectChange}
          placeholder="Betreffzeile"
          className={composeInputClass}
        />
      </ComposeRow>

      <div className="border-t border-border/70 px-3 py-3 sm:px-4">
        <PlaceholderHighlightTextarea
          id="email-field-body"
          value={body}
          disabled={fieldsDisabled}
          onChange={onBodyChange}
          placeholder="E-Mail-Text…"
          minRows={14}
        />
      </div>

      {!contentLocked ? (
      <div className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-muted/20 px-3 py-2.5">
        <Button
          type="button"
          disabled={disabled || isPending || !canSend}
          onClick={onSend}
          className="h-9 rounded-none px-4"
        >
          <SendIcon data-icon="inline-start" className="size-4" />
          Senden
        </Button>
        <Button
          type="submit"
          variant="outline"
          disabled={disabled || isPending}
          className="h-9 rounded-none px-4"
        >
          Speichern
        </Button>
      </div>
      ) : null}
    </div>
  );
}
