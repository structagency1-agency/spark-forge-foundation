import type { HomepageSection } from "@/models/db";
import { Hero } from "./Hero";
import { About } from "./About";
import { Highlights } from "./Highlights";
import { Stats } from "./Stats";
import { Countdown } from "./Countdown";
import { TimelinePreview } from "./TimelinePreview";
import { SponsorsStrip } from "./SponsorsStrip";
import { GalleryPreview } from "./GalleryPreview";
import { CTA } from "./CTA";
import { InnovationOverview } from "./InnovationOverview";
import { EventsByStatus } from "./EventsByStatus";
import { FAQ } from "./FAQ";
import { ContactPreview } from "./ContactPreview";

type Renderer = (props: { section: HomepageSection }) => React.ReactNode;

const RENDERERS: Record<string, Renderer> = {
  hero: Hero,
  about: About,
  highlights: Highlights,
  stats: Stats,
  countdown: Countdown,
  innovation_overview: InnovationOverview,
  timeline_preview: TimelinePreview,
  sponsors_strip: SponsorsStrip,
  gallery_preview: GalleryPreview,
  faq: FAQ,
  contact_preview: ContactPreview,
  cta: CTA,
  events_upcoming: (p) => (
    <EventsByStatus section={p.section} bucket="upcoming" eyebrow="Upcoming" />
  ),
  events_ongoing: (p) => (
    <EventsByStatus section={p.section} bucket="ongoing" eyebrow="Happening now" />
  ),
  events_completed: (p) => (
    <EventsByStatus section={p.section} bucket="completed" eyebrow="Recently completed" />
  ),
};

export function HomepageSections({ sections }: { sections: HomepageSection[] }) {
  return (
    <>
      {sections.map((section) => {
        const Renderer = RENDERERS[section.section_key];
        if (!Renderer) return null;
        return <Renderer key={section.id} section={section} />;
      })}
    </>
  );
}
