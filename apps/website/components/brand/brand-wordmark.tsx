import { SITE_NAME } from "@scrinium/brand";

import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
  stacked?: boolean;
};

export function BrandWordmark({ className, stacked = false }: BrandWordmarkProps) {
  if (stacked) {
    const [first, ...rest] = SITE_NAME.split(" ");
    return (
      <span className={cn("font-heading tracking-tight", className)}>
        <span className="block">{first}</span>
        <span className="block text-accent-gradient">{rest.join(" ")}</span>
      </span>
    );
  }

  return (
    <span className={cn("font-heading tracking-tight", className)}>
      {SITE_NAME}
    </span>
  );
}
