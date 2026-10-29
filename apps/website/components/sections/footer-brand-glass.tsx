"use client";

import { useEffect, useState } from "react";

import { FooterStageVideo } from "@/components/sections/footer-stage-video";

type FooterBrandGlassProps = {
  brandMark: string;
  videoSrc?: string;
};

/**
 * Glas vollflächig (blur + tint). Scharfes Video nur in den Buchstaben darüber —
 * nötig, weil backdrop-filter von CSS-Masks oft nicht ausgeschnitten wird.
 * Letter-Maske per Canvas mit Brand-Font RGo.
 */
export function FooterBrandGlass({
  brandMark,
  videoSrc,
}: FooterBrandGlassProps) {
  const mark = brandMark.replace(/[<>&'"]/g, "").toUpperCase();
  const [letterMask, setLetterMask] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const width = 1440;
    const height = 960;

    async function buildMask() {
      try {
        await document.fonts.load(`500 500px rgo`);
        await document.fonts.ready;
      } catch {
        /* Fallback-Stack */
      }
      if (cancelled) return;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Nur die Buchstaben deckend (weiß) — Rest transparent
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";

      const targetWidth = width * 1.08;
      let size = 500;
      ctx.font = `500 ${size}px rgo, "rgo Fallback", ui-sans-serif, system-ui, sans-serif`;
      const metrics = ctx.measureText(mark);
      if (metrics.width > 0) {
        size = size * (targetWidth / metrics.width);
        ctx.font = `500 ${size}px rgo, "rgo Fallback", ui-sans-serif, system-ui, sans-serif`;
      }

      ctx.fillText(mark, width / 2, height * 0.96);

      if (!cancelled) {
        setLetterMask(`url(${canvas.toDataURL("image/png")})`);
      }
    }

    void buildMask();
    return () => {
      cancelled = true;
    };
  }, [mark]);

  const letterMaskStyle = letterMask
    ? {
        WebkitMaskImage: letterMask,
        maskImage: letterMask,
        WebkitMaskSize: "100% 100%" as const,
        maskSize: "100% 100%" as const,
        WebkitMaskRepeat: "no-repeat" as const,
        maskRepeat: "no-repeat" as const,
        WebkitMaskSourceType: "alpha",
        maskMode: "alpha" as const,
      }
    : undefined;

  return (
    <div
      data-slot="footer-brand-mark"
      className="pointer-events-none absolute inset-0 z-10"
    >
      {/* Vollflächiges Glas */}
      <div
        className="absolute inset-0 bg-black/[0.28]"
        style={{
          backdropFilter: "blur(64px)",
          WebkitBackdropFilter: "blur(64px)",
        }}
      />

      {/* Scharfes Video nur in SCRINIUM-Buchstaben (etwas aufgehellt) */}
      {videoSrc && letterMask ? (
        <FooterStageVideo
          src={videoSrc}
          className="absolute inset-0 size-full object-cover"
          style={{
            objectPosition: "50% 68%",
            filter: "brightness(1.2) contrast(1.08) saturate(1.08)",
            ...letterMaskStyle,
          }}
        />
      ) : null}
    </div>
  );
}
