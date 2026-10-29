import {
  DisplayHeading,
  Hairline,
  SectionEyebrow,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type CaseNarrativeProps = {
  title: string;
  problem: string;
  background: string;
  ambition: string;
  ideaTitle: string;
  ideaBody: string;
  roles?: readonly { title: string; description: string }[];
  className?: string;
};

export function CaseNarrative({
  title,
  problem,
  background,
  ambition,
  ideaTitle,
  ideaBody,
  roles = [],
  className,
}: CaseNarrativeProps) {
  return (
    <SectionFrame className={cn("px-6 py-16 sm:px-10 sm:py-24", className)}>
      <div className="mx-auto max-w-4xl">
        <DisplayHeading
          as="h2"
          className="text-[clamp(1.75rem,4vw,2.75rem)] leading-tight uppercase"
        >
          {title}
        </DisplayHeading>
        <Hairline className="mt-8" />

        <dl className="mt-10 space-y-8">
          {[
            { label: "Problem", body: problem },
            { label: "Hintergrund", body: background },
            { label: "Ambition", body: ambition },
          ].map((block) => (
            <div key={block.label}>
              <SectionEyebrow>{block.label}</SectionEyebrow>
              <dd className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
                {block.body}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-16">
          <SectionEyebrow>Idee</SectionEyebrow>
          <DisplayHeading as="h3" className="mt-4 text-[clamp(1.5rem,3vw,2.25rem)] uppercase">
            {ideaTitle}
          </DisplayHeading>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {ideaBody}
          </p>
        </div>

        {roles.length > 0 ? (
          <div className="mt-16">
            <DisplayHeading as="h3" className="text-xl uppercase">
              Rolle
            </DisplayHeading>
            <ul className="mt-8 grid gap-0 border-t border-border sm:grid-cols-2">
              {roles.map((role) => (
                <li
                  key={role.title}
                  className="border-b border-border py-6 sm:border-r sm:px-6 sm:odd:pl-0 sm:even:border-r-0"
                >
                  <DisplayHeading as="h4" className="text-lg leading-snug">
                    {role.title}
                  </DisplayHeading>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {role.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </SectionFrame>
  );
}
