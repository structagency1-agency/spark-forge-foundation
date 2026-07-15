## Goal
Rebuild the auth + role workflow end-to-end so every persona lands in the right place with the right permissions, and the jury/scoring/publish/lookup loop works cleanly.

## 1. Roles & login redirect

Roles (unchanged names): `admin` (Super Admin), `iedc_admin`, `ecell_member`, `jury`. Drop `participant` — no participant login at all.

After sign-in at `/auth`, redirect by role:
- `admin` → `/admin`
- `iedc_admin` → `/admin`
- `jury` → `/jury` (new dedicated portal, not the admin console)
- `ecell_member` → `/ecell-attendance`
- No role → sign out with "This account has no access" message.

Score viewing stays fully public via `/my-registration` (code or leader email lookup) — no participant account needed.

## 2. User Management (Super Admin only)

`/admin/user-management` gets:
- **Create user** form: email + password + role → server fn calls `supabaseAdmin.auth.admin.createUser({ email_confirm: true })` then inserts role. Instant sign-in.
- **Edit user**: change email / reset password / change role.
- **Delete user** (already exists).
- IEDC Admin cannot see this page.

## 3. Event / sub-track

Events already have `project_track` on registrations (software/hardware). Add an optional `sub_tracks text[]` column on `events` so Super Admin can define the tracks per event; if empty, fall back to `[software, hardware]`. Registration form's track selector reads from the event.

## 4. Jury portal (`/jury`)

Standalone route, jury-only. Layout:
1. Select **event** (only events they are jury-assigned to via `jury_event_assignments`).
2. Select **sub-track** (from event's tracks).
3. Table of **all teams** in that event+track (no per-team assignment step). Search box filters by team name / registration code.
4. Click team → scoring dialog with criteria the Super Admin defined.
5. First submit is free. After submission, marks are locked; editing requires a **reason** (stored in `evaluation_score_changes` audit table with old/new value, reason, jury_id, timestamp).

Drop the `jury_team_assignments` gating for visibility — keep the table for compatibility but ignore it for read scope. RLS: jury can read teams for events they're assigned to.

## 5. IEDC Admin

Reuses `/admin/*` sidebar with two items hidden: **User Management** and **Evaluation** (Jury Portal). Everything else visible.

## 6. Attendance → Certificates (already correct)

Per-member QR → E-Cell scans → attendance row → `generate_certificates` only issues for attended members. Keep as-is, verify end-to-end.

## 7. Publish scores → `/my-registration`

Super Admin "Publish results" for an event already exists. Extend `/my-registration` (public lookup) to show, per member, their evaluation totals and rank **only when the event's results are published**.

## Technical changes

**Migration:**
- `events.sub_tracks text[] default '{software,hardware}'`
- `evaluation_score_changes` table (evaluation_id, criterion_id, old_marks, new_marks, reason, changed_by, changed_at) + GRANTs + RLS.
- Trigger on `evaluation_scores` UPDATE: if parent evaluation `submitted_at IS NOT NULL`, require a session var `app.change_reason` set via `save_evaluation_score(_reason)` — RPC signature gains `_reason text`.
- Drop `participant` from `app_role` usage (keep enum value for back-compat, stop granting).
- RLS on `teams`/`registrations`: allow SELECT to jurors assigned to the event.

**Server fns (`src/services/userManagement.functions.ts`):**
- `createUser({ email, password, role })`
- `updateUser({ userId, email?, password?, role? })`
- Existing `deleteUser`, `listAllUsers`.

**Frontend:**
- `/auth`: post-login redirect logic keyed on role (already partly there — reroute jury to `/jury`, no participant flow).
- New `/jury.tsx` + `/jury.$eventId.tsx` (event picker + team list + scoring dialog).
- `/admin/user-management.tsx`: add Create + Edit dialogs.
- `AdminSidebar.tsx`: hide User Management + Evaluation for iedc_admin; hide everything except attendance for ecell_member (already done); jury no longer uses admin sidebar.
- `RegistrationForm.tsx`: track dropdown reads `event.sub_tracks`.
- `admin.events.tsx`: sub-tracks input (comma-separated tags).
- `/my-registration.tsx`: show per-member scores when published.
- Drop `/my-dashboard` and participant role assignment in `grant_roles_on_signup`.

## Out of scope
- No third-party OAuth (Google/Apple) — email+password only, as requested.
- No password-reset email flow (Super Admin resets via User Management).

## Sequence
1. Migration (sub_tracks, score-change audit, RLS, drop participant auto-grant).
2. User management server fns + UI.
3. Auth redirect logic + new `/jury` portal.
4. Registration form track wiring + event admin sub-tracks.
5. Publish → my-registration scores.
6. End-to-end test each persona with Playwright.

Approve and I'll build it in that order.