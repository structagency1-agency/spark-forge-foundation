import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { buildMeta } from "@/lib/seo";
import { eventBySlugQueryOptions } from "@/services/events";
import { departmentsQueryOptions } from "@/services/departments";
import {
  eventCapacityQueryOptions,
  registerTeam,
  type RegisterTeamInput,
  type RegistrationMemberInput,
} from "@/services/registration";
import { computeRegistrationButtonState } from "@/lib/registrationButton";
import { RegistrationSuccess } from "@/components/registration/RegistrationSuccess";
import { RegistrationForm } from "@/components/registration/RegistrationForm";
import { RegistrationSummary } from "@/components/registration/RegistrationSummary";

const searchSchema = z.object({
  code: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/register/$slug")({
  validateSearch: zodValidator(searchSchema),
  loader: async ({ context, params }) => {
    const event = await context.queryClient.ensureQueryData(
      eventBySlugQueryOptions(params.slug),
    );
    if (!event) throw notFound();
    await Promise.all([
      context.queryClient.ensureQueryData(eventCapacityQueryOptions(event.id)),
      context.queryClient.ensureQueryData(departmentsQueryOptions),
    ]);
    return event;
  },
  head: ({ params, loaderData }) => buildMeta({
    title: loaderData ? `Register — ${loaderData.name}` : "Register",
    description: loaderData?.description
      ? `Register your team for ${loaderData.name}. ${loaderData.description}`
      : "Team registration for SPARK TANK 4.0.",
    path: `/register/${params.slug}`,
    image: loaderData?.banner_url ?? undefined,
  }),
  errorComponent: ({ error }) => (
    <div className="container-page py-24 text-center">
      <h1 className="font-display text-3xl">We couldn't load this event</h1>
      <p className="mt-3 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="font-display text-3xl">Event not found</h1>
    </div>
  ),
  component: RegisterEventPage,
});

const EMPTY_MEMBER: RegistrationMemberInput = {
  full_name: "",
  registration_number: "",
  email: "",
  phone: "",
  branch: "",
  academic_year: "",
};

function RegisterEventPage() {
  const { slug } = Route.useParams();
  const { code } = Route.useSearch();
  const navigate = useNavigate();

  const { data: event } = useSuspenseQuery(eventBySlugQueryOptions(slug));
  const { data: capacity } = useQuery(eventCapacityQueryOptions(event!.id));
  const { data: departments = [] } = useQuery(departmentsQueryOptions);

  const buttonState = useMemo(
    () => computeRegistrationButtonState(event!, capacity ?? null),
    [event, capacity],
  );

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    // Prevent accidental resubmit on refresh after success
    if (code && submitting) setSubmitting(false);
  }, [code, submitting]);

  async function handleSubmit(input: Omit<RegisterTeamInput, "event_id">) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await registerTeam({ ...input, event_id: event!.id });
      // Persist success via URL so refresh keeps state and back-forward is safe.
      navigate({
        to: "/register/$slug",
        params: { slug },
        search: { code: result.registration_code },
        replace: true,
      });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Registration failed.");
      setSubmitting(false);
    }
  }

  if (code) {
    return (
      <PageShell
        eyebrow="Registration confirmed"
        title="You're in — see you on stage!"
        description="Save your Registration ID and QR code. You'll need them at the event."
      >
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Events", href: "/events" },
            { label: event!.name, href: `/events/${event!.slug}` },
            { label: "Confirmed" },
          ]}
        />
        <RegistrationSuccess code={code} />
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Registration"
      title={`Register for ${event!.name}`}
      description="Fill in your team details. All fields marked * are required."
    >
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Events", href: "/events" },
          { label: event!.name, href: `/events/${event!.slug}` },
          { label: "Register" },
        ]}
      />
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {buttonState.disabled ? (
            <div className="surface-panel border border-accent/30 p-8">
              <div className="text-xs uppercase tracking-widest text-accent">
                {buttonState.label}
              </div>
              <p className="mt-3 text-muted-foreground">{buttonState.hint}</p>
            </div>
          ) : (
            <RegistrationForm
              event={event!}
              departments={departments}
              defaultMember={EMPTY_MEMBER}
              submitting={submitting}
              submitError={submitError}
              onSubmit={handleSubmit}
            />
          )}
        </div>
        <RegistrationSummary event={event!} capacity={capacity ?? null} buttonState={buttonState} />
      </div>
    </PageShell>
  );
}
