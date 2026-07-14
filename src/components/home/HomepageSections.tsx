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

const RENDERERS: Record<string, (props: { section: HomepageSection }) => React.ReactNode> = {
  hero: Hero,
  about: About,
  highlights: Highlights,
  stats: Stats,
  countdown: Countdown,
  timeline_preview: TimelinePreview,
  sponsors_strip: SponsorsStrip,
  gallery_preview: GalleryPreview,
  cta: CTA,
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
