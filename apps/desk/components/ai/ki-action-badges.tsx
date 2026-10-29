"use client";

import { productBadgesForChat, type ProductChatSlot } from "@/lib/ai/product-actions";
import { cn } from "@/lib/utils";

export function KiActionBadges({
  slot,
  onAction,
  disabled,
  leadingLabel,
}: {
  slot: ProductChatSlot;
  onAction?: (actionId: string) => void;
  disabled?: boolean;
  /** z. B. „Vorschläge:“ — in derselben Zeile wie die Badges */
  leadingLabel?: string;
}) {
  const badges = productBadgesForChat(slot);
  if (badges.length === 0) {
    return null;
  }

  return (
    <div
      className="lab-chat-badges flex flex-wrap items-center gap-2"
      role="toolbar"
      aria-label={leadingLabel?.replace(/:$/, "") || "Aktionen"}
    >
      {leadingLabel ? (
        <span className="b-meta shrink-0">{leadingLabel}</span>
      ) : null}
      {badges.map((action) => {
        const planned = action.status === "planned";
        return (
          <button
            key={action.id}
            type="button"
            className={cn("lab-chat-chip", planned && "lab-chat-chip--planned")}
            disabled={disabled || planned}
            title={
              planned
                ? "Folgt in den nächsten Schritten"
                : action.kind === "function"
                  ? "Funktion"
                  : "Prompt-Aktion"
            }
            onClick={() => onAction?.(action.id)}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
