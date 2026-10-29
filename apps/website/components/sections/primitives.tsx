import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-border/60 bg-muted/40 px-6 py-2 sm:px-10">
      <p className="text-[0.65rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">
        {children}
      </p>
    </div>
  );
}

export function SectionEyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[0.7rem] font-medium tracking-[0.2em] text-muted-foreground uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function DisplayHeading({
  children,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4";
}) {
  return (
    <Tag
      className={cn(
        "font-heading font-medium tracking-tight text-balance text-foreground",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Hairline({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} aria-hidden />;
}

export function SectionFrame({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("bg-background text-foreground", className)}>
      {children}
    </section>
  );
}
