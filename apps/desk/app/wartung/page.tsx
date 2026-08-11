import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { KANZLEI_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default function WartungPage() {
  return (
    <div className="content-canvas relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.7_0.12_290/0.12),transparent_55%),radial-gradient(ellipse_at_bottom_right,oklch(0.72_0.08_180/0.1),transparent_45%)]"
      />

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-[0.68rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">
          {KANZLEI_NAME}
        </p>

        <h1 className="mt-6 font-heading text-5xl font-medium tracking-tight sm:text-6xl md:text-7xl">
          <BrandWordmark className="font-medium" />
        </h1>

        <div className="mt-10 h-px w-24 bg-gradient-to-r from-transparent via-border to-transparent" />

        <p className="mt-8 font-heading text-2xl font-medium tracking-tight sm:text-3xl">
          Wartungsmodus
        </p>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
          ORGA. ist vorübergehend nicht erreichbar. Wir arbeiten an einer
          Verbesserung und sind in Kürze wieder für dich da.
        </p>
      </main>

      <footer className="relative z-10 px-6 pb-8 text-center text-xs text-muted-foreground">
        Internes Kanzlei-Werkzeug · {KANZLEI_NAME}
      </footer>
    </div>
  );
}
