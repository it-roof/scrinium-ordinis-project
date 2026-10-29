import {
  DisplayHeading,
  Hairline,
  SectionEyebrow,
  SectionFrame,
} from "@/components/sections/primitives";
import { cn } from "@/lib/utils";

export type PerspectiveArticleSection = {
  heading: string;
  paragraphs: readonly string[];
};

export type PerspectiveArticleProps = {
  label?: string;
  title: string;
  deck?: string;
  readTime?: string;
  /** Einfacher Fließtext ohne Zwischenüberschriften */
  paragraphs?: readonly string[];
  /** Artikel mit Zwischenüberschriften (Detail-Seite) */
  sections?: readonly PerspectiveArticleSection[];
  pullQuote?: string;
  author?: string;
  authorRole?: string;
  className?: string;
};

/** Perspectives-Detail: Artikelkopf + Meta + Fließtext/Sections + Autor */
export function PerspectiveArticle({
  label = "Perspectives",
  title,
  deck,
  readTime,
  paragraphs = [],
  sections = [],
  pullQuote,
  author,
  authorRole,
  className,
}: PerspectiveArticleProps) {
  const hasSections = sections.length > 0;
  const plainMid = Math.ceil(paragraphs.length / 2);
  const before = paragraphs.slice(0, plainMid);
  const after = paragraphs.slice(plainMid);

  return (
    <SectionFrame className={cn("px-6 py-16 sm:px-10 sm:py-24", className)}>
      <article className="mx-auto max-w-3xl">
        <SectionEyebrow>{label}</SectionEyebrow>
        <DisplayHeading
          as="h1"
          className="mt-6 text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] text-muted-foreground/80 uppercase"
        >
          {title}
        </DisplayHeading>
        {deck ? (
          <p className="mt-6 font-heading text-[clamp(1.15rem,2.4vw,1.5rem)] leading-snug text-muted-foreground">
            {deck}
          </p>
        ) : null}
        {readTime ? (
          <p className="mt-6 text-xs tracking-wide text-muted-foreground uppercase">
            {readTime}
          </p>
        ) : null}

        <Hairline className="my-12" />

        {hasSections ? (
          <div className="space-y-12">
            {sections.map((section, index) => (
              <div key={section.heading}>
                {index === 1 && pullQuote ? (
                  <blockquote className="mb-12 border-l border-border pl-6 font-heading text-[clamp(1.35rem,3vw,1.85rem)] leading-snug text-balance">
                    „{pullQuote}“
                  </blockquote>
                ) : null}
                <DisplayHeading
                  as="h2"
                  className="text-[clamp(1.25rem,2.5vw,1.65rem)] leading-snug"
                >
                  {section.heading}
                </DisplayHeading>
                <div className="mt-4 space-y-5 text-base leading-relaxed text-foreground/90 sm:text-lg">
                  {section.paragraphs.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-6 text-base leading-relaxed text-foreground/90 sm:text-lg">
              {before.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            {pullQuote ? (
              <blockquote className="my-14 border-l border-border pl-6 font-heading text-[clamp(1.35rem,3vw,1.85rem)] leading-snug text-balance">
                „{pullQuote}“
              </blockquote>
            ) : null}
            {after.length > 0 ? (
              <div className="space-y-6 text-base leading-relaxed text-foreground/90 sm:text-lg">
                {after.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            ) : null}
          </>
        )}

        {author ? (
          <>
            <Hairline className="mt-16" />
            <div className="mt-8">
              <SectionEyebrow>Geschrieben von</SectionEyebrow>
              <p className="mt-2 font-heading text-lg">{author}</p>
              {authorRole ? (
                <p className="mt-1 text-sm text-muted-foreground">{authorRole}</p>
              ) : null}
            </div>
          </>
        ) : null}
      </article>
    </SectionFrame>
  );
}
