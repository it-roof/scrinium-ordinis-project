import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { AREA_FEATURE_META } from "@/components/home/area-feature-meta";
import { FUNCTION_LABELS, type AreaFunctionId } from "@/lib/area/functions";
import { functionHref } from "@/lib/area/paths";
import type { AppModuleId } from "@/lib/modules";
import { cn } from "@/lib/utils";

function FeatureCard({
  area,
  functionId,
  title,
}: {
  area: AppModuleId;
  functionId: AreaFunctionId;
  title?: string;
}) {
  const meta = AREA_FEATURE_META[functionId];
  return (
    <Link
      href={functionHref(area, functionId)}
      className={cn(
        "group relative block overflow-hidden rounded-xl p-6 surface-paper",
        "ring-1 ring-foreground/[0.05]",
        "transition-[box-shadow,ring-color] duration-300 ease-out",
        "hover:shadow-[var(--shadow-elevated)]",
        meta.tintClass
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-10 -right-10 size-28 rounded-full opacity-[0.35] blur-2xl transition-opacity duration-300 group-hover:opacity-50",
          meta.glowClass
        )}
      />
      <div
        className={cn(
          "relative flex size-10 items-center justify-center rounded-lg ring-1",
          meta.iconWrap
        )}
      >
        <meta.icon className="size-4" strokeWidth={1.6} />
      </div>

      <div className="relative mt-5 space-y-1.5">
        <h3 className="font-heading text-base font-normal tracking-tight">
          {title ?? FUNCTION_LABELS[functionId]}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {meta.description}
        </p>
      </div>

      <div
        className={cn(
          "relative mt-6 flex items-center gap-1.5 text-sm transition-colors",
          meta.linkClass
        )}
      >
        Öffnen
        <ArrowRightIcon className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

export function AreaFeatureSection({
  title,
  description,
  area,
  functionIds,
  titleForFunction,
}: {
  title: string;
  description: string;
  area: AppModuleId;
  functionIds: AreaFunctionId[];
  titleForFunction?: (functionId: AreaFunctionId) => string | undefined;
}) {
  if (functionIds.length === 0) {
    return null;
  }

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-normal tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {functionIds.map((functionId) => (
          <FeatureCard
            key={functionId}
            area={area}
            functionId={functionId}
            title={titleForFunction?.(functionId)}
          />
        ))}
      </div>
    </section>
  );
}
