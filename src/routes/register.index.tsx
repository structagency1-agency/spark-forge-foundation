import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The bare /register URL has no event context. Direct users to browse events
 * and start registration from an event card.
 */
export const Route = createFileRoute("/register/")({
  beforeLoad: () => {
    throw redirect({ to: "/events" });
  },
});