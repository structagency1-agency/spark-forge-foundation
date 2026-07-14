import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/common/EmptyState";
import { buildMeta } from "@/lib/seo";
import { galleryQueryOptions } from "@/services/gallery";
import { Images } from "lucide-react";

export const Route = createFileRoute("/gallery")({
  head: () => buildMeta({
    title: "Gallery",
    description: "Photos and videos from every edition of SPARK TANK.",
    path: "/gallery",
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(galleryQueryOptions),
  component: GalleryPage,
});

function GalleryPage() {
  const { data } = useSuspenseQuery(galleryQueryOptions);
  return (
    <PageShell eyebrow="Gallery" title="Moments from the arena">
      {data.length === 0 ? (
        <EmptyState
          icon={<Images className="h-8 w-8" />}
          title="Gallery coming soon"
          description="Photos and videos from SPARK TANK will appear here."
        />
      ) : (
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
          {data.map((item) => (
            <figure
              key={item.id}
              className="mb-4 overflow-hidden rounded-xl border border-border/60 break-inside-avoid"
            >
              {item.media_type === "image" ? (
                <img src={item.url} alt={item.title ?? ""} loading="lazy" className="w-full" />
              ) : (
                <video src={item.url} controls className="w-full" />
              )}
              {(item.title || item.caption) && (
                <figcaption className="p-3 text-xs text-muted-foreground">
                  {item.title}
                  {item.caption && <span className="block opacity-70">{item.caption}</span>}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
    </PageShell>
  );
}
