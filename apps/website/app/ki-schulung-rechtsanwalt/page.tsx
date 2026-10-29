import type { Metadata } from "next";

import {
  FeatureCards,
  FeatureRows,
  FinalCta,
  IntegrationBand,
  PriceList,
  PricingCalculator,
  ProductHero,
  ProductSpotlight,
  QuoteStrip,
  RelatedCarousel,
  SiteShell,
  Timeline,
  TrustStrip,
} from "@/components/sections";
import {
  kiSchulungAgenda,
  kiSchulungDeepDive,
  kiSchulungFeatureCards,
  kiSchulungFeatureRows,
  kiSchulungFinalCta,
  kiSchulungIntegrations,
  kiSchulungMedia,
  kiSchulungMeta,
  kiSchulungNav,
  kiSchulungPriceList,
  kiSchulungPricing,
  kiSchulungProductHero,
  kiSchulungQuote,
  kiSchulungRelated,
  kiSchulungTrust,
} from "@/lib/leistungen/ki-schulung";

export const metadata: Metadata = {
  title: `${kiSchulungMeta.title} | Scrinium`,
  description: kiSchulungMeta.description,
  alternates: { canonical: kiSchulungMeta.path },
  openGraph: {
    title: `${kiSchulungMeta.title} | Scrinium`,
    description: kiSchulungMeta.description,
    url: kiSchulungMeta.path,
    images: [{ url: kiSchulungMedia.imageSrc }],
    type: "website",
    locale: "de_DE",
  },
};

/**
 * Hero → Trust → Nutzen → Quote → Inhalte → Ablauf →
 * Standard → Integration → Preise → Related → Final-CTA
 *
 * Ablauf früh nach den Inhalten: führt beim Lesen an das Thema heran.
 */
export default function KiSchulungRechtsanwaltLandingPage() {
  return (
    <SiteShell navItems={kiSchulungNav} pillVariant="links">
      <ProductHero {...kiSchulungProductHero} />

      <TrustStrip {...kiSchulungTrust} />

      <div id="nutzen">
        <FeatureRows {...kiSchulungFeatureRows} />
      </div>

      <QuoteStrip {...kiSchulungQuote} />

      <div id="inhalte">
        <FeatureCards {...kiSchulungFeatureCards} />
      </div>

      <div id="ablauf">
        <Timeline {...kiSchulungAgenda} layout="vertical" />
      </div>

      <div id="standard">
        <ProductSpotlight {...kiSchulungDeepDive} />
      </div>

      <IntegrationBand {...kiSchulungIntegrations} />

      <div id="preise">
        <PricingCalculator {...kiSchulungPricing} />
        <PriceList {...kiSchulungPriceList} />
      </div>

      <RelatedCarousel {...kiSchulungRelated} />

      <div id="kontakt">
        <FinalCta {...kiSchulungFinalCta} />
      </div>
    </SiteShell>
  );
}
