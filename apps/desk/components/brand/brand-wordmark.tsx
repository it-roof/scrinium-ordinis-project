import { PRODUCT_WORDMARK } from "@scrinium/brand";

import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
  /** Überschreibt die Produktmarke (z. B. Tenant brand_name). */
  label?: string | null;
};

export function BrandWordmark({ className, label }: BrandWordmarkProps) {
  return (
    <span className={cn("font-heading tracking-tight", className)}>
      {label?.trim() || PRODUCT_WORDMARK}
    </span>
  );
}
