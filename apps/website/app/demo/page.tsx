import type { ReactNode } from "react";

import {
  AwardsList,
  CapabilityTabs,
  CaseNarrative,
  ClosingCta,
  EditorialList,
  ExpertiseList,
  FeaturedCards,
  Manifesto,
  MediaHero,
  MetricGrid,
  NewsArticle,
  NewsIndex,
  NewsIntro,
  PageHeader,
  PerspectiveArticle,
  PerspectiveIndex,
  PerspectiveIntro,
  QuoteStrip,
  SectionLabel,
  SiteShell,
  StatementHero,
  ThematicCarousel,
  Timeline,
  WorkIndex,
} from "@/components/sections";
import {
  demoAwards,
  demoCapabilityTabs,
  demoCase,
  demoClosing,
  demoEditorial,
  demoExpertiseList,
  demoExpertiseStatement,
  demoFeaturedCards,
  demoHomeStatement,
  demoManifesto,
  demoMediaHero,
  demoMetrics,
  demoNav,
  demoNewsArticle,
  demoNewsIndex,
  demoNewsIntro,
  demoPerspectiveArticle,
  demoPerspectiveIndex,
  demoPerspectiveIntro,
  demoQuotes,
  demoThematicCarousel,
  demoTimeline,
  demoWorkIndex,
  demoWorkStatement,
} from "@/lib/demo/akqa-sections";

export const metadata = {
  title: "Section-Demo · Scrinium",
  description:
    "AKQA-Stil Sections nach Home / Work / About / Expertise / Perspectives / News",
};

function DemoBlock({
  label,
  id,
  children,
}: {
  label: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <div id={id}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </div>
  );
}

function PageGroup({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div id={id} className="border-t-4 border-foreground/15">
      <SectionLabel>Seite · {title}</SectionLabel>
      {children}
    </div>
  );
}

export default function DemoPage() {
  return (
    <SiteShell
      navItems={demoNav}
      pillPrompt="Demo: Sections nach AKQA-Seiten"
    >
      <PageGroup id="home" title="Home (akqa.com/)">
        <DemoBlock label="StatementHero · bold">
          <StatementHero {...demoHomeStatement} />
        </DemoBlock>
        <DemoBlock label="MediaHero">
          <MediaHero {...demoMediaHero} />
        </DemoBlock>
        <DemoBlock label="FeaturedCards">
          <FeaturedCards {...demoFeaturedCards} />
        </DemoBlock>
        <DemoBlock label="Manifesto">
          <Manifesto {...demoManifesto} />
        </DemoBlock>
        <DemoBlock label="EditorialList · Latest">
          <EditorialList {...demoEditorial} />
        </DemoBlock>
        <DemoBlock label="ThematicCarousel">
          <ThematicCarousel {...demoThematicCarousel} />
        </DemoBlock>
        <DemoBlock label="ClosingCta">
          <ClosingCta {...demoClosing} />
        </DemoBlock>
      </PageGroup>

      <PageGroup id="work" title="Work (akqa.com/work/)">
        <DemoBlock label="PageHeader">
          <PageHeader title="Work" />
        </DemoBlock>
        <DemoBlock label="StatementHero · fade">
          <StatementHero {...demoWorkStatement} />
        </DemoBlock>
        <DemoBlock label="WorkIndex">
          <WorkIndex {...demoWorkIndex} />
        </DemoBlock>
        <DemoBlock label="ClosingCta">
          <ClosingCta
            lineOne="Was ist Ihr"
            lineTwo="nächstes Projekt?"
            href="mailto:hello@scrinium-ordinis.de"
          />
        </DemoBlock>
      </PageGroup>

      <PageGroup id="about" title="About (akqa.com/about/)">
        <DemoBlock label="Manifesto">
          <Manifesto {...demoManifesto} />
        </DemoBlock>
        <DemoBlock label="Timeline">
          <Timeline {...demoTimeline} />
        </DemoBlock>
        <DemoBlock label="CapabilityTabs">
          <CapabilityTabs {...demoCapabilityTabs} />
        </DemoBlock>
        <DemoBlock label="QuoteStrip">
          <QuoteStrip {...demoQuotes} />
        </DemoBlock>
        <DemoBlock label="AwardsList">
          <AwardsList {...demoAwards} />
        </DemoBlock>
        <DemoBlock label="CaseNarrative + MetricGrid">
          <CaseNarrative {...demoCase} />
          <MetricGrid {...demoMetrics} />
        </DemoBlock>
      </PageGroup>

      <PageGroup id="expertise" title="Expertise (akqa.com/expertise/)">
        <DemoBlock label="StatementHero · soft / left">
          <StatementHero {...demoExpertiseStatement} />
        </DemoBlock>
        <DemoBlock label="ExpertiseList">
          <ExpertiseList {...demoExpertiseList} />
        </DemoBlock>
        <DemoBlock label="ClosingCta">
          <ClosingCta
            lineOne="Die Zukunft,"
            lineTwo="schneller."
            href="mailto:hello@scrinium-ordinis.de"
          />
        </DemoBlock>
      </PageGroup>

      <PageGroup id="perspectives" title="Perspectives (akqa.com/perspectives/)">
        <DemoBlock label="PerspectiveIntro">
          <PerspectiveIntro {...demoPerspectiveIntro} />
        </DemoBlock>
        <DemoBlock label="PerspectiveIndex">
          <PerspectiveIndex {...demoPerspectiveIndex} />
        </DemoBlock>
        <DemoBlock label="PerspectiveArticle" id="perspective-article">
          <PerspectiveArticle {...demoPerspectiveArticle} />
        </DemoBlock>
        <DemoBlock label="ClosingCta">
          <ClosingCta {...demoClosing} />
        </DemoBlock>
      </PageGroup>

      <PageGroup id="news" title="News (akqa.com/news/)">
        <DemoBlock label="NewsIntro">
          <NewsIntro {...demoNewsIntro} />
        </DemoBlock>
        <DemoBlock label="NewsIndex">
          <NewsIndex {...demoNewsIndex} />
        </DemoBlock>
        <DemoBlock label="NewsArticle" id="news-article">
          <NewsArticle {...demoNewsArticle} />
        </DemoBlock>
        <DemoBlock label="ClosingCta">
          <ClosingCta {...demoClosing} />
        </DemoBlock>
      </PageGroup>
    </SiteShell>
  );
}
