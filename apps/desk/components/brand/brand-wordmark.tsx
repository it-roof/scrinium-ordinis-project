import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
  periodClassName?: string;
};

export function BrandWordmark({
  className,
  periodClassName = "text-primary",
}: BrandWordmarkProps) {
  return (
    <span className={cn("font-heading tracking-[0.1em]", className)}>
      ORGA
      <span className={periodClassName}>.</span>
    </span>
  );
}
