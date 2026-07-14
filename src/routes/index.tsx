import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { homepageQueryOptions } from "@/services/homepage";
import { upcomingEventQueryOptions } from "@/services/events";
import { HomepageSections } from "@/components/home/HomepageSections";
import { AnnouncementBanner } from "@/components/home/AnnouncementBanner";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(homepageQueryOptions),
      context.queryClient.ensureQueryData(upcomingEventQueryOptions),
    ]);
  },
  component: HomePage,
});

function HomePage() {
  const { data: sections } = useSuspenseQuery(homepageQueryOptions);
  return (
    <>
      <AnnouncementBanner location="homepage" />
      <HomepageSections sections={sections} />
    </>
  );
}

