import {
  DisplayHeading,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type PageHeaderProps = {
  title: string;
  className?: string;
};

export function PageHeader({ title, className }: PageHeaderProps) {
  return (
    <SectionFrame className={cn("px-6 pt-28 pb-6 sm:px-10 sm:pt-32", className)}>
      <div className="mx-auto max-w-6xl text-center">
        <DisplayHeading
          as="h1"
          className="text-[clamp(2.5rem,8vw,5rem)] uppercase tracking-tight"
        >
          {title}
        </DisplayHeading>
      </div>
    </SectionFrame>
  );
}
