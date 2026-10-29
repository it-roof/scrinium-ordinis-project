import {
  DisplayHeading,
  SectionEyebrow,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type LocationItem = {
  name: string;
  address: string;
  phone?: string;
  contactLabel?: string;
  contactEmail?: string;
};

export type LocationDirectoryProps = {
  heading?: string;
  intro?: {
    newProjectsEmail?: string;
    mediaEmail?: string;
  };
  items: readonly LocationItem[];
  className?: string;
};

export function LocationDirectory({
  heading = "Kontakt",
  intro,
  items,
  className,
}: LocationDirectoryProps) {
  return (
    <SectionFrame className={cn("px-6 py-16 sm:px-10 sm:py-24", className)}>
      <div className="mx-auto max-w-6xl">
        <DisplayHeading className="text-[clamp(1.75rem,4vw,2.75rem)] uppercase">
          {heading}
        </DisplayHeading>

        {intro ? (
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {intro.newProjectsEmail ? (
              <div>
                <SectionEyebrow>Neue Projekte</SectionEyebrow>
                <a
                  href={`mailto:${intro.newProjectsEmail}`}
                  className="mt-2 block font-heading text-xl underline-offset-4 hover:underline"
                >
                  {intro.newProjectsEmail}
                </a>
              </div>
            ) : null}
            {intro.mediaEmail ? (
              <div>
                <SectionEyebrow>Presse</SectionEyebrow>
                <a
                  href={`mailto:${intro.mediaEmail}`}
                  className="mt-2 block font-heading text-xl underline-offset-4 hover:underline"
                >
                  {intro.mediaEmail}
                </a>
              </div>
            ) : null}
          </div>
        ) : null}

        <ul className="mt-14 grid gap-0 border-t border-border sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.name}
              className="border-b border-border py-8 sm:border-r sm:px-6 sm:odd:[&:nth-child(odd)]:pl-0 lg:[&:nth-child(3n)]:border-r-0 lg:[&:nth-child(3n+1)]:pl-0"
            >
              <DisplayHeading as="h3" className="text-xl uppercase">
                {item.name}
              </DisplayHeading>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {item.address}
              </p>
              {item.phone ? (
                <a
                  href={`tel:${item.phone.replace(/\s/g, "")}`}
                  className="mt-3 block text-sm text-foreground"
                >
                  {item.phone}
                </a>
              ) : null}
              {item.contactEmail ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  {item.contactLabel ? `${item.contactLabel}: ` : null}
                  <a
                    href={`mailto:${item.contactEmail}`}
                    className="text-foreground underline-offset-4 hover:underline"
                  >
                    {item.contactEmail}
                  </a>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </SectionFrame>
  );
}
