import { SITE_NAME } from "@scrinium/brand";

import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
  stacked?: boolean;
};

export function BrandWordmark({ className, stacked = false }: BrandWordmarkProps) {
  if (stacked) {
    const [first, ...restParts] = SITE_NAME.split(" ");
    const rest = restParts.join(" ");
    return (
      <span className={cn("font-heading tracking-tight", className)}>
        <span className="block">{first}</span>
        {rest ? (
          <span className="block text-accent-gradient">{rest}</span>
        ) : null}
      </span>
    );
  }

  return (
    <span className={cn("font-heading tracking-tight", className)}>
      {SITE_NAME}
    </span>
  );
}
