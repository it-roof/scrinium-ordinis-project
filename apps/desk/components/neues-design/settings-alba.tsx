"use client";

import type { ReactNode } from "react";

import { AlbaShell, type AlbaShellUser } from "@/components/neues-design/alba-shell";

export function SettingsAlba({
  user,
  tenantName,
  children,
}: {
  user: AlbaShellUser;
  tenantName: string;
  children: ReactNode;
}) {
  return (
    <AlbaShell user={user} tenantName={tenantName}>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pt-12 pb-14 md:px-10 md:pt-14">
        <header className="flex max-w-2xl flex-col">
          <h1 className="b-display b-title font-medium tracking-[-0.02em]">
            Einstellungen
          </h1>
          <p className="b-lead mt-2 max-w-none text-[1.0625rem] leading-[1.55] md:mt-2.5">
            Profil, Design, Passwort und E-Mail-Versand.
          </p>
        </header>

        <div className="lab-settings mt-10 flex flex-col gap-8">{children}</div>
      </div>
    </AlbaShell>
  );
}
