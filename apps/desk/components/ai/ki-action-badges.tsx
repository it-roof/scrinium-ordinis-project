"use client";

import { productBadgesForChat, type ProductChatSlot } from "@/lib/ai/product-actions";
import { cn } from "@/lib/utils";

export function KiActionBadges({
  slot,
  onAction,
  disabled,
}: {
  slot: ProductChatSlot;
  onAction?: (actionId: string) => void;
  disabled?: boolean;
}) {
  const badges = productBadgesForChat(slot);
  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="lab-chat-badges flex flex-wrap gap-2" role="toolbar" aria-label="Aktionen">
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
