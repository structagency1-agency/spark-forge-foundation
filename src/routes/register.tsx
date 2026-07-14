import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Registration layout. Event-specific registration pages render inside this
 * parent route; the bare /register redirect lives in register.index.tsx.
 */
export const Route = createFileRoute("/register")({
  component: Outlet,
});
