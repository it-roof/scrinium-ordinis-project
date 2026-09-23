"use client";

import Link from "next/link";
import { useActionState } from "react";

import { PRODUCT_WORDMARK } from "@scrinium/brand";

import { loginAction } from "@/lib/auth/actions";

export function LoginForm({
  brandLabel,
  passwordless,
}: {
  brandLabel?: string | null;
  passwordless?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const brand = brandLabel?.trim() || PRODUCT_WORDMARK;

  return (
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <p className="b-eyebrow" style={{ color: "var(--b-accent)" }}>
          {brand}
        </p>
        <h1 className="b-display text-[1.75rem] font-medium tracking-[-0.02em] md:text-[2rem]">
          Anmelden
        </h1>
      </header>

      {passwordless ? (
        <p
          className="rounded-[0.85rem] border px-4 py-3 text-[0.8125rem] leading-snug"
          style={{
            borderColor: "color-mix(in srgb, #b45309 35%, var(--b-line))",
            background: "color-mix(in srgb, #b45309 8%, var(--b-bg-elev))",
            color: "#7c2d12",
          }}
        >
          Dev-Modus: Anmeldung nur mit E-Mail (kein Passwort). Nie in Produktion.
        </p>
      ) : null}

      <form action={formAction} className="lab-login-panel flex flex-col gap-5">
        <div className="grid gap-1.5">
          <label
            htmlFor="email"
            className="b-meta font-medium"
            style={{ color: "var(--b-muted)" }}
          >
            E-Mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="lab-field"
            placeholder="name@kanzlei.de"
          />
        </div>

        {passwordless ? null : (
          <div className="grid gap-1.5">
            <label
              htmlFor="password"
              className="b-meta font-medium"
              style={{ color: "var(--b-muted)" }}
            >
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="lab-field"
            />
          </div>
        )}

        {state?.error ? (
          <p
            className="text-[0.875rem] font-medium"
            style={{ color: "#b42318" }}
            role="alert"
          >
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          className="b-btn b-btn-primary mt-1 w-full"
          disabled={isPending}
        >
          {isPending ? "Anmelden…" : "Anmelden"}
        </button>
      </form>

      {passwordless ? null : (
        <div className="flex flex-col items-center gap-2 text-center">
          <Link
            href="/passwort-vergessen"
            className="b-meta font-medium transition-colors hover:text-[var(--b-ink)]"
          >
            Passwort vergessen?
          </Link>
          <p className="b-meta max-w-xs">
            Nach mehreren Fehlversuchen wird der Zugang vorübergehend gesperrt.
          </p>
        </div>
      )}
    </div>
  );
}
