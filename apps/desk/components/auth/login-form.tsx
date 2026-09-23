"use client";

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
    <div className="flex w-full flex-col items-center gap-6">
      {passwordless ? (
        <p
          className="w-full rounded-[0.85rem] border px-4 py-3 text-[0.8125rem] leading-snug"
          style={{
            borderColor: "color-mix(in srgb, #b45309 35%, var(--b-line))",
            background: "color-mix(in srgb, #b45309 8%, var(--b-bg-elev))",
            color: "#7c2d12",
          }}
        >
          Dev-Modus: Anmeldung nur mit E-Mail (kein Passwort). Nie in Produktion.
        </p>
      ) : null}

      <form action={formAction} className="lab-login-panel flex w-full flex-col gap-5">
        <h1 className="b-display text-[1.5rem] font-medium tracking-[-0.02em] md:text-[1.625rem]">
          Anmelden
        </h1>

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

      <p className="b-meta text-center">{brand}</p>
    </div>
  );
}
