import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type V1PromptsPageFrameProps = {
  children: ReactNode;
  className?: string;
};

/** Gemeinsamer Premium-Rahmen für alle Prompt-Seiten unter /v1. */
export function V1PromptsPageFrame({
  children,
  className,
}: V1PromptsPageFrameProps) {
  return (
    <div className={cn("v1-prompt-atelier flex flex-1 flex-col", className)}>
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-5 py-8 md:gap-12 md:px-8 md:py-12 lg:px-10">
        {children}
      </div>
    </div>
  );
}

type V1PromptsPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function V1PromptsPageHeader({
  eyebrow = "Bibliothek",
  title,
  description,
  actions,
  className,
}: V1PromptsPageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="max-w-2xl space-y-3">
        <p className="text-[0.68rem] font-medium tracking-[0.22em] text-[var(--v1-ink-soft)] uppercase">
          {eyebrow}
        </p>
        <h1 className="font-heading text-[1.85rem] leading-[1.15] font-normal tracking-[-0.02em] text-[var(--v1-ink)] md:text-[2.35rem]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-xl text-[0.95rem] leading-relaxed text-[var(--v1-ink-soft)] md:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
