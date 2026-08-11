import { getModuleLabel, type ContentModule } from "@/lib/text-blocks/types";
import { moduleStyles } from "@/lib/text-blocks/module-styles";
import { cn } from "@/lib/utils";

export function ModuleBadge({
  module,
  className,
}: {
  module: ContentModule;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        moduleStyles[module].badge,
        className
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", moduleStyles[module].dot)}
        aria-hidden
      />
      {getModuleLabel(module)}
    </span>
  );
}
