/**
 * Central site configuration.
 * Navigation and route metadata live here so pages and layout share one source.
 */

export interface NavItem {
  label: string;
  to: string;
  cta?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Events", to: "/events" },
  { label: "Problem Statements", to: "/problem-statements" },
  { label: "Gallery", to: "/gallery" },
  { label: "Results", to: "/results" },
  { label: "Sponsors", to: "/sponsors" },
  { label: "Contact", to: "/contact" },
] as const;

export const CTA_ITEM: NavItem = {
  label: "Register",
  to: "/register",
  cta: true,
};

export const SITE_FALLBACK = {
  name: "SPARK TANK 4.0",
  tagline: "Ignite. Innovate. Inspire.",
  description:
    "SPARK TANK 4.0 is an inter-departmental innovation competition celebrating ideas, engineering and entrepreneurship.",
} as const;
