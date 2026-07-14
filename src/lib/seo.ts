import { SITE_FALLBACK } from "@/config/site";

export interface RouteMeta {
  title: string;
  description: string;
  path: string;
  ogType?: string;
  image?: string;
}

/**
 * Builds a standard head() meta+links array for a route.
 * Keep canonical only on leaf routes (this helper only emits it when path is set).
 */
export function buildMeta({ title, description, path, ogType = "website", image }: RouteMeta) {
  const fullTitle = title.includes(SITE_FALLBACK.name)
    ? title
    : `${title} — ${SITE_FALLBACK.name}`;

  const meta = [
    { title: fullTitle },
    { name: "description", content: description },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:type", content: ogType },
    { property: "og:url", content: path },
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
  ];
  if (image) {
    meta.push({ property: "og:image", content: image });
    meta.push({ name: "twitter:image", content: image });
  }
  return {
    meta,
    links: [{ rel: "canonical", href: path }],
  };
}
