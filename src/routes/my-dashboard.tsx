import { createFileRoute, redirect } from "@tanstack/react-router";

// Participant accounts were removed. Send anyone landing here to the public
// lookup, which surfaces registration QR codes and published scores.
export const Route = createFileRoute("/my-dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/my-registration" });
  },
});
