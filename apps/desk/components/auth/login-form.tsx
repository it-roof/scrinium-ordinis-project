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
  const title = brandLabel?.trim() || PRODUCT_WORDMARK;

  return (
    <div className="flex w-full flex-col">
      <header className="flex flex-col">
        <p
          className="b-eyebrow"
          style={{ color: "var(--b-accent)" }}
        >
          {title}
        </p>
        <h1 className="b-display b-title mt-3 font-medium tracking-[-0.02em] md:mt-3.5">
          Anmelden
        </h1>
        <p className="b-lead mt-2 text-[1.0625rem] leading-[1.55]">
          Für Ihren Arbeitsbereich.
        </p>
      </header>

      {passwordless ? (
        <p
          className="mt-6 rounded-[0.65rem] border px-3.5 py-2.5 text-[0.8125rem] leading-snug"
          style={{
            borderColor: "color-mix(in srgb, #b45309 35%, var(--b-line))",
            background: "color-mix(in srgb, #b45309 8%, var(--b-bg-elev))",
            color: "#7c2d12",
          }}
        >
          Dev-Modus: Anmeldung nur mit E-Mail (kein Passwort). Nie in Produktion.
        </p>
      ) : null}

      <form action={formAction} className="mt-8 flex flex-col gap-5">
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
            <div className="flex items-baseline justify-between gap-3">
              <label
                htmlFor="password"
                className="b-meta font-medium"
                style={{ color: "var(--b-muted)" }}
              >
                Passwort
              </label>
              <Link
                href="/passwort-vergessen"
                className="b-meta transition-colors hover:text-[var(--b-ink)]"
              >
                Passwort vergessen?
              </Link>
            </div>
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

        {passwordless ? null : (
          <p className="b-meta">
            Nach mehreren Fehlversuchen wird der Zugang vorübergehend gesperrt.
          </p>
        )}

        <button
          type="submit"
          className="b-btn b-btn-primary mt-1 w-full"
          disabled={isPending}
        >
          {isPending ? "Anmelden…" : "Anmelden"}
        </button>
      </form>
    </div>
  );
}
