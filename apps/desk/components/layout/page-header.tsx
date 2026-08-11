import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  children?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 border-b border-border/70 pb-8 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="max-w-2xl space-y-4">
        {eyebrow ? (
          <div className="space-y-2.5">
            <div className="accent-rule" />
            <p className="text-[0.7rem] font-medium tracking-[0.22em] text-accent-foreground/80 uppercase">
              {eyebrow}
            </p>
          </div>
        ) : null}
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children ? (
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
