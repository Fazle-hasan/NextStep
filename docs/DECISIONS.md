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
- Decision: No LEAP features are built now. The "LEAP programs" nav entry opens `/leap`, a public page that says NextStep will integrate with the LEAP program and outlines the four stages (strings in `features/leap/strings.ts`). The `leap` migration (`leap_programs`, `leap_enrollments`, `leap_badges`, enrollment RPCs, `leap-assets` bucket) was already applied before this decision; it stays in place as unused, empty, RLS-protected groundwork with passing tests (`005_leap.sql`). When the integration is designed, `features/leap/service.ts` (D-005) is still the single access point, and these tables are either used as a local cache or dropped in a new migration.
- Consequences: The employer "LEAP certified" applicant filter and LEAP badges on profiles are deferred with it. `companies.leap_friendly` remains as a plain flag. Removing the tables needs the owner's explicit approval.

## D-032: Mentorship booking rules
- Date: 2026-10-04
- Status: accepted
- Context: PRODUCT_SPEC §6 leaves notice periods and cancellation open.
- Decision: Slots come from `get_mentor_slots()`: weekly rules plus exceptions in the mentor's time zone, cut into the mentor's default duration (30 or 60 minutes), bookable from 12 hours to 30 days ahead. `book_session()` re-checks the slot; an exclusion constraint stops a mentor's requested/confirmed sessions overlapping; a trigger caps a mentee at 2 upcoming requested/confirmed sessions. A request whose start time has passed no longer counts. Either side can cancel any time before the start. Accepting needs an `https://` meeting link. Feedback opens when a confirmed session has ended; the first feedback marks it completed. Mentors pause with `is_accepting` rather than deleting their profile. `admin_review_verification()` now also sets `mentor_profiles.verification_status`.
- Consequences: Screens: `/mentors`, `/mentors/[id]` (booking), `/sessions`, `/sessions/[id]` for mentees (`features/mentorship/booking`) and `/mentor`, `/mentor/profile`, `/mentor/availability`, `/mentor/sessions/[id]` for mentors (`features/mentorship/mentor`). Slot times are shown in the viewer's browser time zone. The admin verification queue shows a mentor profile summary. Auto-completing past sessions and notifications come in Phase 6.

## D-033: Chat is opened only by accept-RPCs; messages are insert-only
- Date: 2026-10-04
- Status: accepted
- Context: PRODUCT_SPEC §7.5 forbids cold messaging and requires that only participants read or write messages.
- Decision: `conversations` and `conversation_participants` have no insert grant for API roles. `private.open_conversation(context, context_id, a, b)` is the only way to create one, and it is called by `respond_to_offer`, `respond_contact_request` and `respond_flatmate_connection` when a request is accepted (one conversation per accepted offer/request/connection). Clients insert into `messages` directly (so Realtime sees a plain INSERT); a before-insert trigger re-checks the sender, participation, suspension, blocks in either direction, the attachment folder and the 30-messages-a-minute rate limit. Messages cannot be updated; `delete_message()` soft-deletes (a direct update would fail RLS because the row stops being selectable). Unread counts come from `conversation_participants.last_read_at` via `get_my_conversations()` / `mark_conversation_read()`. Images live in the private `chat-attachments` bucket under `{conversation_id}/` and are shown through 10-minute signed URLs; they are re-encoded in the browser first (no EXIF).
- Consequences: `messages` is in the `supabase_realtime` publication and RLS decides delivery. Admins can read messages (moderation); the hide/suspend actions come with the Phase 6 moderation queue.

## D-034: Flat listing flow and the exact-address gate
- Date: 2026-10-04
- Status: accepted
- Context: D-004/D-018 require that the exact address is revealed only after the lister accepts a contact request.
- Decision: `flat_listing_private` (address, landmark, exact point) is readable only by the lister, admins, and a user with an **accepted** `flat_contact_requests` row for that listing and no block with the lister (`private.has_accepted_contact`). Pending, declined and withdrawn requests reveal nothing. A trigger on that table writes `flat_listings.approx_location`: the exact point snapped to a ~400 m grid, then moved 50–200 m in a direction fixed by a hash of the listing id. A new listing starts `paused`; the lister saves the address (`save_listing_address`), adds photos and publishes with `set_listing_status`. Status, `expires_at`, `approx_location`, `deleted_at` are not writable by API roles (`set_listing_status`, `renew_listing`, `delete_listing`). Listings expire 30 days after creation or renewal: RLS hides them immediately and an hourly pg_cron job (`expire-flat-listings`) sets `expired`. `tenant_gender_pref` is enforced in RLS (`private.listing_open_to_me`): male-only and female-only listings are invisible to the other gender; `any` and `family` are open to all.
- Consequences: Until the map module (Phase 5) there is no pin picker: the lister uses "Use my current location" at the flat, otherwise the point falls back to the neighbourhood (or city) centre. `search_flats` is list-only for now and returns the approximate point; the masjid/workplace radius filters are added in Phase 5.

## D-035: Buddy and flatmate visibility rules live in RLS
- Date: 2026-10-04
- Status: accepted
- Context: PRODUCT_SPEC §7.2/§7.4 and §11 require gender preferences and city filters to be enforced in queries, not only in the UI.
- Decision: A relocation request is readable by its owner, admins, buddies who already offered, and verified, active buddies of the same city while it is open and not hidden, with no block either way and the same gender when `same_gender_buddies_only` is set (`private.is_eligible_buddy_for`). Buddy profiles are readable only by requesters with an open request in that city or an offer from that buddy. A flatmate profile is readable by another user only when both profiles are active, in the same city, neither is suspended or blocked, and each side's gender preference accepts the other's gender (`private.flatmate_compatible`), or when a live connection exists. `get_flatmate_matches` is SECURITY INVOKER and only ranks rows RLS already allows (score 0–100: areas 20, budget 20, move date 15, food 10, smoking 10, cleanliness 10, sleep 5, work 5, guests 5). Offers, contact requests and connections share the `offer_status` enum and change only through RPCs (D-015). Limits: 3 open relocation requests, 20 offers/day, 10 contact requests/day, 20 connections/day, 10 live listings.
- Consequences: A user needs their own active flatmate profile to see matches. `admin_review_verification()` now also sets `buddy_profiles.verification_status`.

## D-036: Map provider wrapper and pin pickers
- Date: 2026-10-04
- Status: accepted (completes D-029 and the Phase 4 location fallbacks in D-034)
- Context: CLAUDE.md names Mapbox GL JS, wrapped so the provider can be swapped. Earlier phases had no map.
- Decision: `mapbox-gl` is used only inside `src/lib/maps/` (`MapView`, `PinPicker`, `parseEwkbPoint`, `toEwktPoint`, `formatDistance`, provider-neutral types). Feature code imports from `@/lib/maps` and never from the provider. The public token is `NEXT_PUBLIC_MAPBOX_TOKEN`; when it is missing or the map fails to load, `MapView` and `PinPicker` render a notice and every page keeps working from its list (the map is an enhancement, never the only way to a result). Pin pickers now set the flat's exact point, the workplace on a relocation request and the job location; "Use my current location" and the neighbourhood/city-centre fallback remain for when the map is unavailable.
- Consequences: The token must be added to `.env.local` (and restricted by URL in the Mapbox dashboard) for maps to appear. Swapping providers means rewriting the two components in `src/lib/maps/`.

## D-037: Places, area guides and the "near a masjid and my workplace" search
- Date: 2026-10-04
- Status: accepted
- Context: PRODUCT_SPEC §8 and the Phase 5 prompt (docs/PROMPTS.md §6).
- Decision: `places` are admin-managed; the public (including signed-out visitors) reads only verified, non-hidden places. Users submit `place_suggestions` (a JSON payload of proposed fields, 10 a day) that only they and admins can read. `area_guides` (one per neighbourhood) are public once published. `area_tips` are posted by verified, active Settle-In Buddies or admins (10 a day), are public, soft-deleted by the author through `delete_area_tip()`, hidden by admins, and upvoted through `area_tip_votes` (one vote per user per tip, never on your own; a trigger maintains `upvote_count`). Geo RPCs are SECURITY INVOKER: `places_in_view` and `nearby_places` are public; `search_flats_near(...)` needs sign-in, filters flats within X km of a verified Shia masjid or imambargah and Y km of a workplace point with `ST_DWithin`, and returns the distance to the nearest masjid/imambargah and to the workplace. It works on `flat_listings.approx_location` only, so distances are accurate to about 500 m and the exact point is never read; RLS still applies the gender, block and live-status rules.
- Consequences: The admin screens for places, suggestions, guides and tip moderation come with the Phase 6 admin panel; until then places and guides come from `supabase/sample-data/03_sample_places_and_guides.sql` and suggestions wait in the queue. Signed-out visitors see tips without author names, because member profiles need sign-in (D-012).

## D-038: Notifications are created by database triggers
- Date: 2026-10-04
- Status: accepted (implements D-016)
- Context: Many RPCs change state (applications, sessions, offers, contact requests, connections, verification, job review, suggestions, chat). Editing each of them to notify would touch every earlier migration.
- Decision: `private.notify(user, type, title, body, link, data, dedupe)` is the only writer of `notifications`. AFTER triggers on the domain tables call it (`notify_job_applications`, `notify_mentorship_sessions`, `notify_flat_contact_requests`, `notify_messages`, ...), so the state-changing RPCs are unchanged. `notify()` sets `email_status` to `pending` or `skipped` from `notification_preferences` (`email_enabled`, `email_muted_types`); WhatsApp opt-in stays in `profile_private.whatsapp_opt_in` (D-011). With `dedupe`, no new row is added while the user still has an unread notification of the same type and link, so a burst of chat messages gives one alert. Users select and delete their own rows and mark them read through `mark_notifications_read()`; they have no insert or update grant. `notifications` is in the Realtime publication for the bell.
- Consequences: A new event type means one more trigger branch and one more label in `features/notifications`. Titles and bodies are plain English strings written in SQL for now (translation would move them to templates keyed by type).

## D-039: Admin actions, moderation and two-level suspension
- Date: 2026-10-04
- Status: accepted
- Context: PRODUCT_SPEC §10 and the Phase 6 prompt.
- Decision: Every admin action is a definer RPC that checks `is_admin()` and writes `audit_log`: `admin_resolve_report(id, action, note)` with `dismiss`, `hide` (sets `hidden_at` on the reported company, job, listing, relocation request, buddy rating, tip or message), `warn` (a notification with the admin's note) and `suspend`; `admin_set_content_hidden` for hiding or restoring outside a report; `admin_set_user_suspension`; `admin_review_place_suggestion` (approving a new-place suggestion creates a verified place from its payload, approving a correction applies the proposed fields); `admin_analytics(from, to, city)`; and `admin_review_verification`, which now also grants the flat-lister ID badge (`profiles.lister_verified_at`, requested with `request_lister_verification()`). Suspension has two levels: `profiles.suspended_at` (enforced by RLS and the RPCs: a suspended user cannot post, message, book or be seen) is set by the RPC, and the `admin-user-action` Edge Function additionally bans the account in Supabase Auth so the user cannot sign in. The function calls the RPC with the admin's own JWT first, so the database decides who is an admin; the service role is used only for the auth ban. Admins cannot be suspended, and nobody can suspend themselves.
- Consequences: LEAP management is not part of the admin panel because LEAP is future scope (D-031). Until the function is deployed, the Users screen falls back to the RPC and says that sign-in could not be blocked.

## D-040: Scheduled jobs, Edge Function secrets and the job-alert digest
- Date: 2026-10-04
- Status: accepted (implements D-010, D-011, D-016)
- Context: Emails and the daily digest run outside user requests.
- Decision: pg_cron runs `hourly-maintenance` (expire jobs past their deadline, complete confirmed mentor sessions that ended over an hour ago), `expire-flat-listings`, `purge-rate-limit-events`, `purge-old-notifications` (read ones older than 90 days), `dispatch-notifications` (every minute) and `job-alert-digest` (02:00 UTC = 07:30 IST). The last two call Edge Functions through `private.call_edge_function()`, which reads `edge_functions_url` and `cron_secret` from Vault at run time and does nothing while either is missing. The functions accept only requests carrying that secret in `x-cron-secret` (they fail closed when `CRON_SECRET` is unset) and have `verify_jwt = false`. `dispatch-notifications` sends up to 50 pending emails a run through Resend behind `_shared/email.ts`, retries up to 3 times, skips users without a deliverable address (phone-only accounts, sample and test domains) and marks everything failed when `RESEND_API_KEY`/`EMAIL_FROM` are not set. `_shared/whatsapp.ts` is an interface with a log-only sender. The digest's matching runs in the database (`private.create_job_alert_digests()`, exposed to the service role only as `run_job_alert_digest()`); it ignores the salary filter so a digest can never reveal that a hidden salary matches.
- Consequences: Setup needs four function secrets (`CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `SITE_URL`) and two Vault secrets (see docs/SETUP.md). In-app notifications work without any of them.

## D-041: Design system — warm neutrals, status tones, section accents, dark mode
- Date: 2026-10-04
- Status: accepted
- Context: The UI used the default neutral shadcn theme with one teal brand colour. Almost everything was grey, every status (pending, approved, rejected, expired) looked the same, the three sections were visually identical, dark mode was defined but unreachable, and chat was hidden from the mobile bar.
- Decision: Colour tokens live in `src/app/globals.css` (light and dark). Warm off-white background `#FAFAF7`, white cards, text `#17211D`, secondary text `#5D6A63`, brand teal `#1F6B57`. Status tones are fixed app-wide: success `#18794E`, warning `#9A5B00`, info `#2457A7`, destructive `#B42318`, each with a pale "-soft" background. Section accents mark location only (icons, nav indicators, highlights): Earn teal `#1F6B57`, Learn indigo `#4338CA`, Grow terracotta `#9A4508`; they never replace status colours. Every text pair is checked for WCAG AA (4.5:1); input borders (`#8A968F`) and the focus ring meet 3:1. One `StatusBadge` (`components/shared/StatusBadge.tsx`) maps statuses to five tones (success, attention, progress, danger, inactive), always with an icon and a label so colour is never the only signal. Solid brand-coloured fills are reserved for primary actions. The mobile bar has five tabs: Home · Earn · Learn · Grow · Inbox (unread count), with safe-area padding and an active state shown by a bar, a tinted pill and bold text. Dark mode is a light/dark/system choice in the user menu (`next-themes`, class strategy). The header carries a three-step brand mark.
- Consequences: New screens use tokens (`text-success`, `bg-warning-soft`, `text-learn` …), never raw Tailwind colours for meaning. Map marker colours stay separate from status colours and are explained by a legend. Hindi/Urdu fonts and right-to-left layout are deferred to the translation work (post-MVP).

## D-042: Sections renamed and reordered
- Date: 2026-10-04
- Status: accepted (supersedes the names and order in D-021; the module mapping is unchanged)
- Context: The project owner asked for clearer section names and for relocation to come before career development.
- Decision: The user-facing sections are, in this order: **Community Job Portal** (Jobs, "Earn"), **Relocation Support** (Settle In + Places, "Grow"), **Career Development** (Mentorship + LEAP, "Learn"). Only the names and order changed, in `src/lib/sections.ts`; the internal ids, routes and colours stay (`/community-portal`, `/location-gathering`, `/career-development`; Earn teal, Grow terracotta, Learn indigo), so existing links and code keep working.
- Consequences: Navigation, the mobile bar (Home · Earn · Grow · Learn · Inbox), the landing page, Home and the section pages follow the new order automatically. The tagline "Learn. Earn. Grow." is unchanged.

## D-043: Email first, optional password sign-in, and only enabled providers shown
- Date: 2026-10-04
- Status: accepted (extends PRODUCT_SPEC §3 sign-in methods)
- Context: On the hosted project only the email provider is switched on (Google and phone are off), so the Google button failed and the Phone tab could not work. The project owner also asked for a login with a password.
- Decision: The sign-in page reads `/auth/v1/settings` (cached 5 minutes) and shows only providers that are switched on; Google and Phone appear by themselves once enabled in the dashboard. The default tab is **Email code**. A **Password** tab signs in with email + password (`signInWithPassword`). Passwords are optional: a member first signs in with an email code, then sets one in **Settings → Password** (`auth.updateUser`, 8–72 characters, both checked in the browser and on the server). There is no sign-up with a password and no password reset by email: a forgotten password is handled by signing in with an email code and setting a new one. A wrong email/password pair gets one message that does not say which part was wrong. Accounts that only have a phone number cannot use passwords. Passwords are never shown, logged or stored outside Supabase Auth.
- Consequences: Turn on "Leaked password protection" and set the minimum password length to 8 in the Supabase dashboard (Authentication → Policies/Settings) so the server enforces the same rules as the app. Google needs an OAuth client (docs/SETUP.md).

