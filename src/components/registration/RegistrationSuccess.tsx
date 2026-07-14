import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Mail, ScanLine } from "lucide-react";
import { lookupRegistrationByCode, type LookupMember } from "@/services/registration";
import { renderQrDataUrl, buildMemberQrPayload, buildQrPayload, downloadDataUrl } from "@/lib/qr";

export function RegistrationSuccess({ code }: { code: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["registration", "lookup", code],
    queryFn: () => lookupRegistrationByCode(code),
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Preparing your confirmation…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="surface-panel p-8">
        <p className="text-sm text-destructive-foreground">
          We couldn't load your registration. Please try{" "}
          <Link to="/my-registration" className="underline">the lookup page</Link> using
          your Registration ID <span className="font-mono">{code}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="surface-panel border-emerald-400/40 p-6 md:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-widest text-emerald-300">
            <ScanLine className="h-3.5 w-3.5" /> Each team member has their own QR
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Attendance is marked <strong>per member</strong>. Every teammate must show
            their personal QR at the venue — <strong>only members whose attendance is
            marked will receive a certificate</strong>.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.members.map((m) => (
            <MemberQrCard
              key={m.team_member_id ?? m.email}
              member={m}
              eventId={data.event.id}
              teamId={data.team.id}
              registrationId={data.registration_id}
              registrationCode={data.registration_code}
              fallbackToken={data.qr_token}
            />
          ))}
        </div>
      </div>

      <div className="surface-panel p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-widest text-emerald-300">
          Registration successful
        </span>
        <h2 className="mt-4 font-display text-3xl text-gradient-accent">
          {data.event.name}
        </h2>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          A confirmation email is on its way to{" "}
          <span className="text-foreground">{data.members[0]?.email}</span>
          <span className="inline-flex items-center gap-1 text-[11px]">
            <Mail className="h-3 w-3" /> QR emailed too
          </span>
        </p>

        <dl className="mt-6 grid gap-3 text-sm md:grid-cols-2">
          <Row label="Registration ID" value={data.registration_code} mono />
          <Row label="Team" value={data.team.name} />
          <Row label="Team status" value={data.status} />
          <Row label="Email status" value={data.email_status} />
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/my-registration"
            search={{ q: data.registration_code }}
            className="rounded-full border border-border/60 px-5 py-2.5 text-sm hover:border-accent hover:text-accent"
          >
            View later
          </Link>
          <Link
            to="/events"
            className="rounded-full bg-accent px-5 py-2.5 text-sm text-accent-foreground"
          >
            Browse other events
          </Link>
        </div>
      </div>
    </div>
  );
}

function MemberQrCard({
  member,
  eventId,
  teamId,
  registrationId,
  registrationCode,
  fallbackToken,
}: {
  member: LookupMember;
  eventId: string;
  teamId: string;
  registrationId: string;
  registrationCode: string;
  fallbackToken: string;
}) {
  const payload = useMemo(() => {
    if (member.qr_token && member.team_member_id && member.participant_id) {
      return buildMemberQrPayload({
        registration_code: registrationCode,
        event_id: eventId,
        team_id: teamId,
        team_member_id: member.team_member_id,
        participant_id: member.participant_id,
        qr_token: member.qr_token,
      });
    }
    // Legacy fallback: team-level QR
    return buildQrPayload({
      registration_id: registrationId,
      registration_code: registrationCode,
      event_id: eventId,
      team_id: teamId,
      qr_token: fallbackToken,
    });
  }, [member, eventId, teamId, registrationId, registrationCode, fallbackToken]);

  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    renderQrDataUrl(payload, 260)
      .then((url) => !cancelled && setQr(url))
      .catch(() => setQr(null));
    return () => {
      cancelled = true;
    };
  }, [payload]);

  const filename = `sparktank-${registrationCode}-${(member.full_name || "member").replace(/\s+/g, "_")}.png`;

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card/30 p-4 text-center">
      <div className="flex flex-col items-center gap-1">
        <div className="text-sm font-medium text-foreground">{member.full_name}</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {member.role === "leader" ? "Team Leader" : "Member"}
        </div>
      </div>
      {qr ? (
        <img
          src={qr}
          alt={`Attendance QR for ${member.full_name}`}
          className="rounded-xl border border-border/60 bg-white p-2"
          width={200}
          height={200}
        />
      ) : (
        <div className="flex h-[200px] w-[200px] items-center justify-center rounded-xl border border-border/60 bg-muted/30">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">
        {member.email}
      </div>
      <button
        type="button"
        disabled={!qr}
        onClick={() => qr && downloadDataUrl(qr, filename)}
        className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs text-accent-foreground disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" /> Download
      </button>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/30 p-3">
      <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd
        className={
          "mt-1 text-foreground " + (mono ? "font-mono text-sm" : "text-sm capitalize")
        }
      >
        {value}
      </dd>
    </div>
  );
}
