import Image from "next/image";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { auth } from "@/lib/auth";
import { clearAuthSessionCookies } from "@/lib/auth/cookies";

async function LoginContent() {
  await connection();
  const session = await auth();

  if (session?.user?.id && session.user.tenantId) {
    redirect("/");
  }

  if (session?.user) {
    await clearAuthSessionCookies();
  }

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex h-[4.25rem] w-full max-w-6xl items-center px-6 sm:h-[4.75rem] sm:px-10">
          <p className="font-heading text-[0.7rem] font-medium tracking-[0.2em] text-foreground uppercase">
            Scrinium
          </p>
        </div>
      </header>

      <main className="mx-auto grid min-h-dvh max-w-6xl items-center gap-12 px-6 pb-16 pt-28 sm:px-10 sm:pb-24 sm:pt-32 lg:grid-cols-2 lg:gap-16">
        <div className="animate-[hero-rise_0.9s_cubic-bezier(0.22,1,0.36,1)_both]">
          <p className="mb-5 text-[0.7rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Matters
          </p>
          <h1 className="font-heading text-[clamp(2.25rem,5vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.025em] text-balance text-foreground">
            Anmelden.
          </h1>
          <p className="mt-6 max-w-md text-[1.05rem] leading-[1.65] text-muted-foreground sm:text-lg">
            Akten, Dokumente und KI am konkreten Fall — mit Ihrem
            Kanzlei-Zugang.
          </p>

          <div className="mt-10">
            <LoginForm />
          </div>
        </div>

        <div className="relative hidden animate-[hero-rise_0.9s_cubic-bezier(0.22,1,0.36,1)_0.12s_both] lg:block">
          <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted shadow-[var(--shadow-soft)]">
            <Image
              src="/generated/ki-schulung-hero.jpg"
              alt="Heller Kanzleiarbeitsplatz mit Akte und Laptop"
              fill
              priority
              className="object-cover object-[55%_40%]"
              sizes="50vw"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/25 via-transparent to-transparent"
            />
          </div>
          <div className="absolute -left-1 top-10 max-w-[15rem] border border-border/70 bg-card/97 p-4 shadow-[var(--shadow-soft)] backdrop-blur-md sm:-left-6 sm:top-14">
            <p className="text-[0.65rem] font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Zugang
            </p>
            <p className="mt-2 text-sm leading-snug text-foreground">
              Dieselben Benutzer wie in Desk — strikt getrennt pro Kanzlei.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground">
          <p className="text-sm">Laden…</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
