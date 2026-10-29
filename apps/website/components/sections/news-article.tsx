import Link from "next/link";

import {
  DisplayHeading,
  Hairline,
  SectionEyebrow,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type NewsArticleSection = {
  heading?: string;
  paragraphs: readonly string[];
};

export type NewsRelatedWork = {
  title: string;
  href?: string;
};

export type NewsArticleProps = {
  label?: string;
  date: string;
  title: string;
  deck?: string;
  sections: readonly NewsArticleSection[];
  relatedWork?: readonly NewsRelatedWork[];
  className?: string;
};

/** News-Detail: Datum, Titel, Deck, Abschnitte, optionale Related-Work-Liste */
export function NewsArticle({
  label = "News",
  date,
  title,
  deck,
  sections,
  relatedWork = [],
  className,
}: NewsArticleProps) {
  return (
    <SectionFrame className={cn("px-6 py-16 sm:px-10 sm:py-24", className)}>
      <article className="mx-auto max-w-3xl">
        <SectionEyebrow>{label}</SectionEyebrow>
        <p className="mt-4 text-sm text-muted-foreground">{date}</p>
        <DisplayHeading
          as="h1"
          className="mt-4 text-[clamp(2rem,5vw,3.25rem)] leading-[1.05]"
        >
          {title}
        </DisplayHeading>
        {deck ? (
          <p className="mt-6 font-heading text-[clamp(1.15rem,2.4vw,1.45rem)] leading-snug text-muted-foreground">
            {deck}
          </p>
        ) : null}

        <Hairline className="my-12" />

        <div className="space-y-12">
          {sections.map((section, index) => (
            <div key={section.heading ?? `section-${index}`}>
              {section.heading ? (
                <DisplayHeading
                  as="h2"
                  className="mb-4 text-[clamp(1.25rem,2.5vw,1.65rem)] leading-snug"
                >
                  {section.heading}
                </DisplayHeading>
              ) : null}
              <div className="space-y-5 text-base leading-relaxed text-foreground/90 sm:text-lg">
                {section.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {relatedWork.length > 0 ? (
          <>
            <Hairline className="mt-16" />
            <div className="mt-8">
              <SectionEyebrow>Verwandte Arbeit</SectionEyebrow>
              <ul className="mt-4 space-y-3">
                {relatedWork.map((item) => (
                  <li key={item.title}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="font-heading text-lg underline-offset-4 hover:underline"
                      >
                        {item.title} ↘
                      </Link>
                    ) : (
                      <span className="font-heading text-lg">{item.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </article>
    </SectionFrame>
  );
}
