import { PRODUCT_WORDMARK } from "@scrinium/brand";

import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
};

export function BrandWordmark({ className }: BrandWordmarkProps) {
  return (
    <span className={cn("font-heading tracking-tight", className)}>
      {PRODUCT_WORDMARK}
    </span>
  );
}
