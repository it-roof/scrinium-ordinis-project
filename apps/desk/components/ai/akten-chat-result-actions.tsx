"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

export type AktenChatResultActionKind =
  | "create-letter"
  | "create-email-text"
  | "send-email"
  | "open-letter"
  | "export-pdf"
  | "export-docx";

type ActionDef = {
  id: AktenChatResultActionKind;
  label: string;
  href?: string;
};

export function AktenChatResultActions({
  actions,
  disabled,
  onAction,
}: {
  actions: ActionDef[];
  disabled?: boolean;
  onAction: (id: AktenChatResultActionKind) => void;
}) {
  if (actions.length === 0) return null;

  return (
    <div
      className="lab-chat-badges flex flex-wrap items-center gap-2 pt-1"
      role="group"
      aria-label="Weiter mit Ergebnis"
    >
      {actions.map((action) =>
        action.href ? (
          <Link
            key={action.id}
            href={action.href}
            className={cn("lab-chat-chip", disabled && "pointer-events-none opacity-50")}
          >
            {action.label}
          </Link>
        ) : (
          <button
            key={action.id}
            type="button"
            className="lab-chat-chip"
            disabled={disabled}
            onClick={() => onAction(action.id)}
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
