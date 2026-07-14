import type { Event } from "@/models/db";
import type { EventCapacity } from "@/services/registration";

export type RegistrationButtonState = {
  /** Copy shown on the registration button */
  label: string;
  /** True when the user cannot proceed to register */
  disabled: boolean;
  /** Longer helper text describing why */
  hint: string;
};

/**
 * Combines the event's registration window and capacity into the exact
 * button state described in the Stage 3 spec.
 */
export function computeRegistrationButtonState(
  event: Pick<Event, "registration_start" | "registration_close" | "max_participants">,
  capacity: EventCapacity | undefined | null,
  now: Date = new Date(),
): RegistrationButtonState {
  const start = event.registration_start ? new Date(event.registration_start) : null;
  const close = event.registration_close ? new Date(event.registration_close) : null;

  if (!start || now < start) {
    return {
      label: "Registration Opens Soon",
      disabled: true,
      hint: start
        ? `Registration opens on ${start.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}.`
        : "Registration dates will be announced soon.",
    };
  }
  if (!close || now >= close) {
    return {
      label: "Registration Closed",
      disabled: true,
      hint: "The registration window for this event has ended.",
    };
  }
  if (
    event.max_participants != null &&
    capacity &&
    capacity.registered >= event.max_participants
  ) {
    return {
      label: "Event Full",
      disabled: true,
      hint: "All seats for this event are taken.",
    };
  }
  return {
    label: "Register Now",
    disabled: false,
    hint: "",
  };
}
