# Decisions Log

Record every non-trivial architectural or product decision here. Newest at the bottom.
Never silently contradict an earlier decision. If one changes, add a new entry that supersedes it.

Format:

```
## D-XXX: Title
- Date: YYYY-MM-DD
- Status: accepted | superseded by D-YYY
- Context: why this came up
- Decision: what we chose
- Consequences: trade-offs, follow-ups
```

---

## D-001: Supabase as the complete backend
- Date: 2026-10-01
- Status: accepted
- Context: Need database, auth, storage, realtime, and serverless functions with minimal ops.
- Decision: Use Supabase (Postgres + PostGIS, Auth, Storage, Realtime, Edge Functions, pg_cron). No separate backend server, no ORM.
- Consequences: Security relies on RLS, so every table needs policies and tests. Typed access via generated types.

## D-002: Hosted dev project with MCP write access
- Date: 2026-10-01
- Status: accepted
- Context: Claude Code builds the app and needs to create tables and policies.
- Decision: Connect Claude Code to the hosted dev project (`zmvdkzphpjjcwwrnniuu`) via the Supabase MCP server with write access. All schema changes go through `apply_migration` and are mirrored in `supabase/migrations/`.
- Consequences: Dev project must never contain real user data. Production will be a separate project deployed from the migration files.

## D-003: Multi-role users
- Date: 2026-10-01
- Status: accepted
- Context: One person can be a job seeker, a mentor, and a buddy at the same time.
- Decision: Roles stored in `user_roles (user_id, role)`; policies use `has_role()`.
- Consequences: UI shows role-specific dashboards; onboarding can add roles later.

## D-004: Approximate flat locations
- Date: 2026-10-01
- Status: accepted
- Context: Showing exact flat addresses publicly is a safety risk.
- Decision: Exact address and point stored in a restricted table; public maps and searches use an offset/rounded point. Exact address revealed only after the lister accepts a contact request.
- Consequences: Geo filters work on approximate points (accuracy within ~500 m is acceptable).

## D-005: LEAP behind a service layer
- Date: 2026-10-01
- Status: accepted
- Context: LEAP is an existing initiative whose systems may later expose an API.
- Decision: LEAP data is admin-managed in NextStep for now, accessed only via `features/leap/service.ts`.
- Consequences: Swapping to an external API later changes one module.

## D-006: India only, INR at launch
- Date: 2026-10-01
- Status: accepted
- Context: PRODUCT_SPEC §14 asked about single country vs. multi-country.
- Decision: Launch in India with INR only. Tables keep `country_code` (default `IN`) and `currency` (default `INR`) columns. Money is stored as integer paise.
- Consequences: Adding a country later is a data change, not a migration. Phone validation targets +91 for now.

## D-007: Launch cities
- Date: 2026-10-01
- Status: accepted
- Context: Seed data and area guides need a fixed city list.
- Decision: Mumbai, Delhi NCR, Bengaluru, Hyderabad, Lucknow.
- Consequences: The `cities` table is seeded with these five; admins can add more.

## D-008: Open employer registration, gated by verification
- Date: 2026-10-01
- Status: accepted
- Context: PRODUCT_SPEC §14 asked whether employers outside the community may post.
- Decision: Any company may register. Jobs only go live after admin verification of the company. Companies have an optional `is_community_owned` flag.
- Consequences: Verification is the trust gate; the flag allows a "community business" filter later.

## D-009: LEAP enrollment approval is per program
- Date: 2026-10-01
- Status: accepted
- Context: PRODUCT_SPEC §14 asked who approves LEAP enrollments.
- Decision: `leap_programs.requires_approval`. When false, enrollment is automatic until capacity, then waitlisted. When true, an admin (LEAP team) approves.
- Consequences: The enrollment RPC must handle three outcomes: enrolled, waitlisted, pending.

## D-010: Resend for transactional email
- Date: 2026-10-01
- Status: accepted
- Context: Supabase Auth SMTP is only for auth emails and is rate-limited.
- Decision: Notification emails are sent by an Edge Function through Resend, behind a `_shared/email.ts` interface.
- Consequences: The `RESEND_API_KEY` Edge Function secret is required. The provider can be swapped in one file.

## D-011: WhatsApp stubbed for MVP
- Date: 2026-10-01
- Status: accepted
- Context: No WhatsApp Business API account yet.
- Decision: A `_shared/whatsapp.ts` sender interface with a log-only implementation, plus a per-user `whatsapp_opt_in` column.
- Consequences: Real delivery is post-MVP and only needs a new implementation of the interface.

## D-012: Public (signed-out) visibility scope
- Date: 2026-10-01
- Status: accepted
- Context: Decide what anonymous visitors can see.
- Decision: Jobs, verified companies, LEAP programs, places and area guides are public. Flats, flatmates, mentors, buddies, relocation requests and user profiles require sign-in.
- Consequences: `anon` gets select policies only on the public tables. Housing and people data are not exposed to scrapers.

## D-013: Gender stored as male | female
- Date: 2026-10-01
- Status: accepted
- Context: Gender preferences are hard filters in flatmate, buddy and listing matching.
- Decision: `gender` enum (`male`, `female`), required at onboarding.
- Consequences: Matching rules are unambiguous. Listing preference adds `any` and `family`.

## D-014: Role grant model
- Date: 2026-10-01
- Status: accepted
- Context: D-003 stores roles in `user_roles`; some roles need admin verification.
- Decision: Users self-assign non-admin roles at onboarding, and those roles drive dashboards. Privileged capabilities (publishing jobs, being listed as mentor, seeing relocation requests as buddy) are gated by `verified_at` / `verification_status` on the company or role profile. `admin` can never be self-assigned.
- Consequences: Policies check both `has_role()` and the relevant verification flag.

## D-015: State transitions only through security-definer RPCs
- Date: 2026-10-01
- Status: accepted
- Context: RLS cannot restrict which columns an UPDATE changes.
- Decision: Status columns (applications, sessions, enrollments, offers, contact requests, connections, verification, reports) change only through `security definer` RPCs that check `auth.uid()` and ownership/role, write history and notify. A guard trigger rejects direct status edits.
- Consequences: More SQL functions, but every transition is audited and validated in one place.

## D-016: Notification outbox
- Date: 2026-10-01
- Status: accepted
- Context: Emails must not block user requests and must respect preferences.
- Decision: `notify()` inserts into `notifications` with `email_status`. pg_cron calls the `dispatch-notifications` Edge Function every minute (via pg_net, using a secret from Vault), and that function sends pending emails.
- Consequences: Up to ~1 minute email latency, with retries on failure.

## D-017: Rate limiting in the database
- Date: 2026-10-01
- Status: accepted
- Context: Messages, contact requests, reports, offers and connections need rate limits.
- Decision: A `rate_limit_events` table plus `check_rate_limit(action, max, window)`, called from before-insert triggers or RPCs. OTP limits use Supabase Auth settings.
- Consequences: Limits apply regardless of client. Events older than a day are purged by cron.

## D-018: Deterministic approximate flat location
- Date: 2026-10-01
- Status: accepted
- Context: D-004 requires an approximate public point. A random offset per read could be averaged away.
- Decision: The exact point is snapped to a ~400 m grid, then a fixed offset derived from a hash of the listing id is added. The result is stored in `flat_listings.approx_location` by a trigger on `flat_listing_private`.
- Consequences: The public point is stable per listing and within ~500 m of the real location.

## D-019: Listing photos in a public bucket, EXIF stripped
- Date: 2026-10-01
- Status: accepted
- Context: Listing photos need fast delivery, but GPS EXIF data could leak the exact address.
- Decision: `listing-photos` is a public bucket with random UUID paths. Images are re-encoded client-side (canvas) before upload, which strips EXIF. The pages that show them require sign-in.
- Consequences: A photo URL is viewable if leaked, but holds no location metadata.

## D-020: RLS tests with pgTAP on a local stack
- Date: 2026-10-01
- Status: accepted
- Context: CLAUDE.md requires SQL tests for RLS.
- Decision: pgTAP tests in `supabase/tests/`, run with `supabase test db` against a local Docker Supabase stack built from `supabase/migrations/`. The hosted dev project remains the shared dev DB.
- Consequences: Docker Desktop and the Supabase CLI are required. `supabase db reset` doubles as a reproducibility check of the migrations.

## D-021: Three user-facing feature sections
- Date: 2026-10-02
- Status: accepted
- Context: The website groups features into three sections for users, while the spec, schema and build plan are organised by module.
- Decision: User-facing names map onto modules: **Community Portal** = Jobs; **Career Development** = Mentorship + LEAP; **Location Gathering** = Settle In + Places. The names are used in main navigation, landing page sections and page titles. Feature folders (`jobs`, `mentorship`, `leap`, `settle-in`, `places`), routes, tables and build phases are unchanged. Section names are defined once in `src/lib/sections.ts`.
- Consequences: No schema change. Notifications, settings and admin stay outside the sections. Renaming a section later is a one-file change plus copy.

## D-022: Security-definer code lives in the `private` schema
- Date: 2026-10-02
- Status: accepted
- Context: The Supabase security advisor flags every SECURITY DEFINER function in `public` that `authenticated` can execute (lint 0029), because it is exposed as `/rest/v1/rpc/...`. CLAUDE.md requires a clean advisor, and D-015 calls for many definer RPCs.
- Decision: Definer implementations go in an unexposed `private` schema (`private.has_role`, `private.is_admin`, `private.is_blocked_between`, `private.complete_onboarding`, …). The `public.*` names stay as thin SECURITY INVOKER SQL wrappers, so policies and client RPC calls are unchanged. API-callable RPCs deliberately expose only these wrappers. Internal helpers (`check_rate_limit`, `log_admin_action`, trigger functions) are not executable by API roles at all. `private` has default privileges that revoke execute from `anon`/`authenticated`; each function that must be callable gets an explicit grant.
- Consequences: Every new definer RPC needs a `private.*` implementation plus a `public.*` invoker wrapper. The wrapper adds one function call per evaluation (negligible at our scale).

## D-023: Onboarding derives roles from intents; gender is set once
- Date: 2026-10-02
- Status: accepted
- Context: PRODUCT_SPEC §3 asks users what they are here for; D-014 says non-admin roles are self-assigned.
- Decision: `profiles.intents onboarding_intent[]` stores the answers. `complete_onboarding()` maps intents to roles server-side (find_job/relocate → job_seeker, hire → employer, mentor → mentor, help_newcomers → buddy, list_flat → flat_lister) and opens pending `verification_requests` for mentor and buddy. Employers are verified per company in Phase 2. Phone (+91) is required to finish onboarding. Gender is not in the profile update grant: it is set once by onboarding and changes need an admin, because it is a hard matching filter (D-013).
- Consequences: Re-running onboarding only adds roles and intents. Cities and neighbourhoods are reference data seeded in a migration (not `seed.sql`) so every environment has them.

## D-024: Job salaries in their own table
- Date: 2026-10-04
- Status: accepted
- Context: Employers can hide a job's salary. RLS cannot hide a column, so a `salary_visible` flag on `jobs` would only hide it in the UI.
- Decision: `job_salaries (job_id, salary_min, salary_max, currency, is_visible)` with its own RLS: the public reads a row only when `is_visible` and the job is public; company members and admins always can. Amounts are **annual, in paise, as `bigint`** (a yearly salary in paise overflows `integer`). `search_jobs` is SECURITY INVOKER, so its salary filter cannot reveal hidden salaries. Seeker expectations use the same unit in `seeker_salary_prefs`.
- Consequences: Saving a job writes two tables. The UI enters salaries in lakh per year and converts with `src/lib/utils/money.ts`.

## D-025: Company creation and verification flow
- Date: 2026-10-04
- Status: accepted
- Context: D-008 lets any company register but gates publishing on verification.
- Decision: Companies are created only through `create_company()`, which makes the caller the owner member, grants the `employer` role and opens a `company` verification request. A user can own up to 3 companies. `admin_review_verification()` decides requests and sets `companies.verification_status`; after a rejection the owner calls `request_company_verification()`. Verification fields, `slug`, `owner_id` and `hidden_at` are not in the update grant. Job status rules live in the `jobs_enforce_status` trigger: drafts only on insert, publishing needs a verified company, a company's first job goes to `pending_review`, and only `admin_review_job()` moves it live. A minimal admin queue (`/admin/verification`, `/admin/jobs`) ships now because nothing could be published without it; the full admin panel is still Phase 6.
- Consequences: Mentor and buddy requests are decided by the same RPC but only update the request until their profile tables exist (Phases 3–4).

## D-026: Referrals are shareable links
- Date: 2026-10-04
- Status: accepted
- Context: The spec says a member who works at a company can refer a seeker. Phone numbers and emails are private, so a referrer cannot look a seeker up.
- Decision: A member adds a `company_affiliations` row ("I work at X", self-declared; a company member can confirm it). For an open job at that company they create one `referrals` row per job; its id is the code in a link `/jobs/{id}?ref={referral_id}` that they share outside the app. An application made through the link stores `referral_id`, and the employer sees who referred the applicant and whether the affiliation is confirmed. A link can be used by several seekers.
- Consequences: `referrals` has no `seeker_id`/`application_id` (the build plan listed them); the application points at the referral instead. Affiliations are visible only to the user, the company's members and admins.

## D-027: Skills are a shared tag list users can extend
- Date: 2026-10-04
- Status: accepted
- Context: The build plan made `skills` admin-written, but seekers and employers need tags that are not in the seed list.
- Decision: `add_skill(name)` lets any signed-in user add a missing tag (normalised slug, 20 a day). About 70 common skills are seeded in the migration. Admins can rename or delete tags.
- Consequences: Moderating junk tags is an admin task (Phase 6 UI).

## D-028: Employer access to seeker data follows live applications
- Date: 2026-10-04
- Status: accepted
- Context: Employers need an applicant's profile and CV, and nothing else.
- Decision: Seeker profile tables, the `cvs` rows and the CV files in storage are readable by members of a company only while the seeker has an application to one of its jobs that is not withdrawn. Salary expectations additionally need `share_with_employers`. Application status changes only through RPCs (D-015); API roles have no insert or update grant on `job_applications`. Employer notes are never readable by the applicant. Policies use definer helpers in `private` (`is_job_company_member`, `is_applicant_to_my_company`, `can_view_cv`, …) so they do not recurse through each other.
- Consequences: Withdrawing an application removes the employer's access immediately. A CV attached to an application cannot be deleted (FK restrict).

## D-029: Job location without a map picker (until the maps module)
- Date: 2026-10-04
- Status: accepted
- Context: The spec asks for a map pin on job posts, but the map provider wrapper is built in Phase 5.
- Decision: A job has city, optional neighbourhood and address text. `jobs.location` defaults to the neighbourhood or city centre, which is enough for the distance filter ("near me" uses browser geolocation). The pin picker and the map on the job page are added with `src/lib/maps` in Phase 5.
- Consequences: Distance results are approximate to the neighbourhood until pins exist.


## D-030: Sample data lives in `supabase/sample-data/` and is loaded into dev on request
- Date: 2026-10-04
- Status: accepted
- Context: The sample companies and jobs were in `supabase/seed.sql`, which only the local stack loads. The project owner asked for them to be kept in their own folder and loaded into the hosted dev project so the site is not empty.
- Decision: Sample data is kept as numbered `.sql` files in `supabase/sample-data/` (loaded locally by `supabase db reset` via `[db.seed] sql_paths`). On the owner's request the same file was run once against the hosted dev project as a one-off data load. It is not a migration: migrations stay schema and reference data only, so production never receives sample rows. `remove_sample_data.sql.txt` in the same folder removes it and is never run automatically.
- Consequences: CLAUDE.md §3 rule 7 now points at the folder. Loading sample data into hosted is an explicit, owner-requested exception to "execute_sql is for reads only"; it is not a general permission for data changes.

## D-031: LEAP is future scope; it will be integrated with the LEAP team's platform
- Date: 2026-10-04
- Status: accepted (narrows D-005 and D-009 for now)
- Context: The LEAP team runs its own four-stage journey (Learn → Engage → Apply → Progress, PRODUCT_SPEC §5). The project owner decided NextStep should connect to their platform later instead of managing LEAP content itself.
- Decision: No LEAP screens are built now. The "LEAP programs" nav entry stays marked "Soon". The `leap` migration (`leap_programs`, `leap_enrollments`, `leap_badges`, enrollment RPCs, `leap-assets` bucket) was already applied before this decision; it stays in place as unused, empty, RLS-protected groundwork with passing tests (`005_leap.sql`). When the integration is designed, `features/leap/service.ts` (D-005) is still the single access point, and these tables are either used as a local cache or dropped in a new migration.
- Consequences: The employer "LEAP certified" applicant filter and LEAP badges on profiles are deferred with it. `companies.leap_friendly` remains as a plain flag. Removing the tables needs the owner's explicit approval.

## D-032: Mentorship booking rules
- Date: 2026-10-04
- Status: accepted
- Context: PRODUCT_SPEC §6 leaves notice periods and cancellation open.
- Decision: Slots come from `get_mentor_slots()`: weekly rules plus exceptions in the mentor's time zone, cut into the mentor's default duration (30 or 60 minutes), bookable from 12 hours to 30 days ahead. `book_session()` re-checks the slot; an exclusion constraint stops a mentor's requested/confirmed sessions overlapping; a trigger caps a mentee at 2 upcoming requested/confirmed sessions. A request whose start time has passed no longer counts. Either side can cancel any time before the start. Accepting needs an `https://` meeting link. Feedback opens when a confirmed session has ended; the first feedback marks it completed. Mentors pause with `is_accepting` rather than deleting their profile. `admin_review_verification()` now also sets `mentor_profiles.verification_status`.
- Consequences: Only the database (migration `mentorship`, tests `006_mentorship.sql`) exists so far; the mentorship screens are still to be built. Auto-completing past sessions and notifications come in Phase 6.
