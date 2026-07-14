
# SPARK TANK 4.0 — Stage 1 Foundation

Reference site ecellvitb.in is a dark, black-background portfolio with white typography and warm gold/amber accents (the owl-on-books mark with white + amber arcs). I'll adopt that same design language: black canvas, generous negative space, a bold display font paired with a clean sans body, subtle motion, gold accent for CTAs/highlights.

This stage builds ONLY the foundation. No auth, no admin, no evaluations, no QR — just architecture the later stages plug into.

## 1. Backend (Lovable Cloud)

Enable Lovable Cloud and create a single normalized migration with all 20 tables. Every table gets `id uuid PK`, `created_at`, `updated_at`, proper FKs, indexes on FK columns and slugs, RLS enabled, and public `SELECT` grants only where the site needs to read (events, homepage_content, sponsors, timeline, gallery, results, winner_list, problem_statements, settings, departments). Write tables (registrations, attendance, evaluations, jury_assignments, certificates, email_logs, reports, audit_logs) get RLS enabled with no public policies yet — Stage 2 adds auth-scoped policies.

Tables and key fields:

- `departments` — name, code, slug (seeded with the 9 departments incl. ALL)
- `events` — name, slug, description, department_id FK, banner_url, venue, event_date, registration_start, registration_close, min_team_size, max_team_size, max_participants, status enum
- `teams` — name, event_id FK, leader_participant_id FK
- `participants` — name, email, phone, department_id FK, year
- `registrations` — team_id FK, event_id FK, status, registered_at
- `attendance` — participant_id FK, event_id FK, checked_in_at, method
- `evaluations` — team_id FK, event_id FK, jury_id, round, scores jsonb, total
- `jury_assignments` — jury_name, jury_email, event_id FK, round
- `certificate_templates` — name, template_url, fields jsonb
- `certificates` — participant_id FK, event_id FK, template_id FK, type, url, issued_at
- `problem_statements` — event_id FK, title, description, document_url, uploaded_at
- `gallery` — event_id FK, media_type, url, title, caption, uploaded_at
- `sponsors` — name, logo_url, website, priority, status
- `homepage_content` — section key (hero/about/highlights/cta/…), content jsonb, is_active, order
- `timeline` — title, description, date, icon, sequence, status
- `results` — event_id FK, published_at, summary
- `winner_list` — event_id FK, team_id FK, position enum (winner/runner_up/second_runner_up/special_mention)
- `email_logs` — recipient, subject, template_key, status, payload jsonb, sent_at
- `reports` — type enum (registrations/attendance/evaluations/certificates/results), generated_at, data jsonb
- `settings` — key, value jsonb (site name, logo, favicon, footer, contact, socials, SEO defaults, email templates)
- `audit_logs` — action, module, description, actor, metadata jsonb, timestamp

Enums: `event_status`, `winner_position`, `report_type`, `email_status`, `media_type`.

Seed data: the 9 departments, default `settings` rows (site_name="SPARK TANK 4.0", empty logo/favicon, default SEO), and one `homepage_content` row per section with sensible copy so the homepage renders on first load. No fake events / sponsors / winners.

## 2. Frontend architecture

```
src/
  routes/                 # TanStack Start file-based routes
    __root.tsx            # shell + SiteHeader + SiteFooter + <Outlet/>
    index.tsx             # Home (dynamic sections)
    about.tsx
    events.tsx            # list
    events.$slug.tsx      # detail placeholder
    gallery.tsx
    problem-statements.tsx
    results.tsx
    sponsors.tsx
    contact.tsx
    register.tsx          # placeholder ("opens in Stage 2")
    sitemap[.]xml.ts
  components/
    layout/               # SiteHeader, SiteFooter, PageShell, SectionHeading
    home/                 # Hero, About, Highlights, Stats, Countdown, TimelinePreview, SponsorsStrip, GalleryPreview, CTA
    ui/                   # shadcn primitives
    common/               # SEO helpers, EmptyState, Loader
  services/               # one file per domain: events.ts, homepage.ts, sponsors.ts, timeline.ts, settings.ts, gallery.ts, results.ts, problemStatements.ts
                          # each exports queryOptions + typed fetchers using the browser Supabase client
  lib/                    # utils, date, status (computeEventStatus), seo (buildMeta)
  models/                 # TS types mirroring DB rows + enums
  config/                 # site.ts (nav items, route metadata), seo defaults
  assets/                 # logo, og image
  styles.css              # design tokens
```

Data flow (canonical): loaders call `context.queryClient.ensureQueryData(queryOptions)`, components read via `useSuspenseQuery`. Settings is fetched once in `__root` loader so header/footer/SEO defaults are available everywhere.

## 3. Design system (src/styles.css)

- Palette: `--background` near-black, `--foreground` near-white, `--accent` warm amber/gold (matches reference arc), `--muted` deep grey. Semantic tokens only — no hardcoded colors in components.
- Fonts: display = Space Grotesk (bold, tight), body = Inter. Loaded via `<link>` in `__root` head.
- Motion: subtle fade-up + accent underline sweeps via `tw-animate-css` + a couple of custom `@utility` classes.
- Reusable variants: `Button` gets `hero` and `outline-accent` variants; `Card` gets a `glass` variant.

## 4. Homepage

Renders sections from `homepage_content` in `order`, each keyed to a component (Hero, About, Highlights, Stats, Countdown, TimelinePreview, SponsorsStrip, GalleryPreview, CTA). If a section is inactive or its data source is empty, the section is skipped — no placeholder cards, no fake logos.

Countdown reads the nearest upcoming event's `event_date`.

## 5. Navigation & placeholder pages

`SiteHeader` renders nav from `config/site.ts`. Every route file exists with its own `head()` (unique title, description, og:title/description, canonical, og:url) and a real `PageShell` component that queries the relevant table and shows a proper empty state when the table is empty. No lorem-ipsum bodies.

## 6. SEO

- Per-route `head()` metadata driven by `settings` + route-specific overrides via `lib/seo.ts`.
- `public/robots.txt` (Allow: /).
- Dynamic `sitemap.xml` server route enumerating static routes + published event slugs.
- JSON-LD Organization on `__root`, Event schema on `events.$slug`.
- Semantic HTML, single H1 per page, alt text on all images.

## 7. Explicitly NOT in this stage

Authentication, admin dashboard, registration form logic, QR/attendance, jury/evaluation, certificates, analytics, email sending, reports generation, leaderboards. Their tables exist; UI comes later.

## Technical notes

- Stack stays TanStack Start + Tailwind v4 + shadcn as scaffolded.
- All Supabase reads use the browser client (`@/integrations/supabase/client`) inside `queryOptions`; RLS-permitted tables only.
- `computeEventStatus(event, now)` in `lib/status.ts` derives status from dates on read, so status is always correct without a cron; the DB column is kept for manual overrides.
- No secrets or external services needed this stage.

Approve and I'll enable Lovable Cloud, ship the migration, and build the foundation in one pass.
