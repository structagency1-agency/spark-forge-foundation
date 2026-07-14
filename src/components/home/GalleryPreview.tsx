import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { HomepageSection } from "@/models/db";
import { galleryPreviewQueryOptions } from "@/services/gallery";
import { SectionHeading } from "@/components/layout/SectionHeading";

export function GalleryPreview({ section }: { section: HomepageSection }) {
  const { data } = useSuspenseQuery(galleryPreviewQueryOptions);
  if (data.length === 0) return null;
  return (
    <section className="container-page py-24">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <SectionHeading eyebrow="Gallery" title={section.title ?? "Moments"} />
        <Link to="/gallery" className="text-sm text-accent hover:underline underline-offset-4">
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {data.slice(0, 8).map((item) => (
          <figure
            key={item.id}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border/60"
          >
            {item.media_type === "image" ? (
              <img
                src={item.thumbnail_url ?? item.url}
                alt={item.title ?? "Gallery image"}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <video src={item.url} className="h-full w-full object-cover" muted playsInline />
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}
