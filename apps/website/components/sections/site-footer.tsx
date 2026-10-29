import Link from "next/link";

import { FooterBrandGlass } from "@/components/sections/footer-brand-glass";
import { FooterStageVideo } from "@/components/sections/footer-stage-video";
import { cn } from "@/lib/utils";

export type FooterLink = {
  href: string;
  label: string;
};

export type SiteFooterProps = {
  lineOne?: string;
  lineTwo?: string;
  leftLinks?: readonly FooterLink[];
  rightLinks?: readonly FooterLink[];
  videoSrc?: string;
  brandMark?: string;
  className?: string;
};

const DEFAULT_LEFT: readonly FooterLink[] = [
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/cookies", label: "Cookie-Hinweis" },
];

const DEFAULT_RIGHT: readonly FooterLink[] = [
  { href: "/demo", label: "Perspektiven" },
  { href: "/ki-schulung-rechtsanwalt", label: "Leistungen" },
  { href: "/impressum", label: "Impressum" },
  {
    href: "mailto:hello@scrinium-ordinis.de?subject=Anfrage%20Scrinium",
    label: "Kontakt",
  },
];

const linkClass =
  "inline-block text-[16px] leading-6 text-white transition-colors hover:text-white/70 sm:text-[14px] sm:leading-[1.5] whitespace-nowrap";

export function SiteFooter({
  lineOne = "Was ist Ihr",
  lineTwo = "nächster Schritt?",
  leftLinks = DEFAULT_LEFT,
  rightLinks = DEFAULT_RIGHT,
  videoSrc = "/generated/footer-stage-gradient-v3.mp4",
  brandMark = "SCRINIUM",
  className,
}: SiteFooterProps) {
  return (
    <footer
      className={cn(
        "footer-root relative flex w-full flex-col overflow-x-clip bg-black text-white",
        "min-h-[100dvh] sm:min-h-[960px]",
        className,
      )}
    >
      {/* Stage: Video unten, Glas mit Letter-Cutouts darüber */}
      <div
        aria-hidden
        data-slot="footer-stage"
        className="pointer-events-none absolute inset-0 z-0"
      >
        <div
          data-slot="footer-stage-canvas"
          className="pointer-events-none absolute inset-0"
        >
          <div
            data-slot="footer-background"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            {videoSrc ? (
              <FooterStageVideo
                src={videoSrc}
                className="absolute inset-0 size-full object-cover"
                style={{ objectPosition: "50% 68%" }}
              />
            ) : (
              <div className="absolute inset-0 bg-[#111]" />
            )}
          </div>

          <FooterBrandGlass brandMark={brandMark} videoSrc={videoSrc} />
        </div>
      </div>

      <div
        data-slot="footer-heading"
        className="relative z-20 mx-auto w-full px-3 pt-[min(18vh,140px)] text-center sm:px-6"
      >
        <h2 className="m-0 mx-auto flex w-full flex-col items-center break-words uppercase">
          <span className="font-heading block w-full text-center text-[clamp(2.75rem,10vw,6.875rem)] font-medium leading-[0.95] tracking-[-0.03em] text-white">
            {lineOne}
          </span>
          <span className="font-sans mt-[0.04em] block w-full text-center text-[clamp(2.75rem,10vw,6.875rem)] font-normal leading-[0.95] tracking-[-0.03em] text-[#e9e9e9]">
            {lineTwo}
          </span>
        </h2>
      </div>

      <div className="relative z-20 flex-1" aria-hidden />

      <div
        data-slot="footer-bottom-bar"
        className="relative z-20 flex flex-col-reverse items-start gap-4 px-3 pb-5 sm:absolute sm:inset-x-6 sm:bottom-8 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-0 sm:pb-0"
      >
        <nav aria-label="Footer left">
          <ul className="m-0 flex list-none flex-col items-start gap-y-2 p-0 sm:flex-row sm:items-center sm:gap-x-6">
            {leftLinks.map((link) => (
              <li key={link.href + link.label}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Footer right">
          <ul className="m-0 flex list-none flex-col items-start gap-y-2 p-0 sm:flex-row sm:items-center sm:justify-end sm:gap-x-6">
            {rightLinks.map((link) => (
              <li key={link.href + link.label}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
