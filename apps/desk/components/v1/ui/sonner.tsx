"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Toaster im v1-Look: Card-Fläche, weicher Border, keine richColors.
 * Innerhalb von `.v1-shell` mounten, damit Theme-Variablen greifen.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-right"
      gap={10}
      richColors={false}
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-emerald-700/80" aria-hidden />
        ),
        info: (
          <InfoIcon className="size-4 text-muted-foreground" aria-hidden />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-amber-700" aria-hidden />
        ),
        error: (
          <OctagonXIcon className="size-4 text-destructive" aria-hidden />
        ),
        loading: (
          <Loader2Icon
            className="size-4 animate-spin text-muted-foreground"
            aria-hidden
          />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "color-mix(in oklch, var(--border) 80%, transparent)",
          "--border-radius": "var(--radius)",
          "--success-bg": "var(--card)",
          "--success-border":
            "color-mix(in oklch, var(--border) 80%, transparent)",
          "--success-text": "var(--card-foreground)",
          "--error-bg": "var(--card)",
          "--error-border":
            "color-mix(in oklch, var(--border) 80%, transparent)",
          "--error-text": "var(--card-foreground)",
          "--warning-bg": "var(--card)",
          "--warning-border":
            "color-mix(in oklch, var(--border) 80%, transparent)",
          "--warning-text": "var(--card-foreground)",
          "--info-bg": "var(--card)",
          "--info-border":
            "color-mix(in oklch, var(--border) 80%, transparent)",
          "--info-text": "var(--card-foreground)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "v1-toast",
          title: "v1-toast-title",
          description: "v1-toast-description",
          success: "v1-toast-success",
          error: "v1-toast-error",
          warning: "v1-toast-warning",
          info: "v1-toast-info",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
