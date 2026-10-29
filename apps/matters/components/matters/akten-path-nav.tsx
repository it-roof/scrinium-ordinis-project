"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AKTEN_PATH } from "@/lib/matters/paths";

export function AktenPathNav({
  clientName,
  clientHref,
  matterTitle,
  onMatterClick,
  onMenu,
  trailing,
}: {
  clientName?: string;
  clientHref?: string;
  matterTitle?: string;
  onMatterClick?: () => void;
  onMenu?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-3 sm:px-5">
      {onMenu ? (
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted lg:hidden"
          onClick={onMenu}
          aria-label="Menü öffnen"
        >
          <MenuIcon className="size-4" />
        </button>
      ) : null}
      <nav
        aria-label="Pfad"
        className="flex min-w-0 flex-1 items-center text-[13px] text-muted-foreground"
      >
        <Link href={AKTEN_PATH} className="shrink-0 hover:text-foreground">
          Akten
        </Link>
        {clientName ? (
          <>
            <span className="px-1.5 text-border">/</span>
            {clientHref && matterTitle ? (
              <Link
                href={clientHref}
                className="min-w-0 max-w-[12rem] truncate hover:text-foreground sm:max-w-[16rem]"
              >
                {clientName}
              </Link>
            ) : (
              <span className="min-w-0 truncate text-foreground">
                {clientName}
              </span>
            )}
          </>
        ) : null}
        {matterTitle ? (
          <>
            <span className="px-1.5 text-border">/</span>
            <button
              type="button"
              className="min-w-0 truncate text-foreground hover:text-foreground/80"
              onClick={onMatterClick}
            >
              {matterTitle}
            </button>
          </>
        ) : null}
      </nav>
      {trailing}
    </header>
  );
}
