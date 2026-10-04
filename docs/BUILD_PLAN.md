# NextStep — MVP Build Plan

> Status: **approved 2026-10-01**. Decisions referenced here are logged as D-006…D-020 in `docs/DECISIONS.md`.

## Context
The repo has only docs (CLAUDE.md, PRODUCT_SPEC, DECISIONS, PROMPTS, SETUP). The hosted dev Supabase project `zmvdkzphpjjcwwrnniuu` is empty: no public tables, no migrations. Only `uuid-ossp`, `pgcrypto`, `pg_stat_statements` and `vault` are installed. `postgis` 3.3.7, `pg_cron`, `pg_net`, `pg_trgm`, `btree_gist` and `pgtap` are available. This plan covers the full MVP (PRODUCT_SPEC §12): schema, RLS, storage, RPCs, Edge Functions, folder layout and a phased task list. **First step after approval:** copy this plan to `docs/BUILD_PLAN.md` and add decisions D-006…D-020 (§8) to `docs/DECISIONS.md`.

### Decisions taken in planning (answers to PRODUCT_SPEC §14 and follow-ups)
- **Country:** India only, INR at launch. `country_code` and `currency` columns stay, so going multi-country later is a data change.
- **Launch cities:** Mumbai, Delhi NCR, Bengaluru, Hyderabad, Lucknow.
- **Employers:** any company may register. Publishing needs admin verification. Companies carry an optional `is_community_owned` flag.
- **LEAP enrollment:** each program has a `requires_approval` setting. When it is off, enrollment is automatic until capacity, then waitlisted. When it is on, an admin approves.
- **Email:** Resend, called from an Edge Function.
- **WhatsApp:** stubbed behind an interface (no-op/log sender) plus a per-user opt-in column. Post-MVP.
- **Signed-out visitors** can see jobs, verified companies, LEAP programs, places and area guides. Flats, flatmates, mentors, buddies, requests and profiles need sign-in.
- **Gender:** `male | female`, required at onboarding.
- **Tests:** pgTAP in `supabase/tests/`, run with `supabase test db` on a local Docker stack built from `supabase/migrations/`.

---

## 1. Database schema (migrations)

Conventions throughout: uuid PK `gen_random_uuid()`, `created_at`/`updated_at` with an `updated_at` trigger, FKs to `public.profiles(id)`, money as `integer` paise plus `currency char(3) default 'INR'`, points as `geography(Point,4326)` with a GIST index, and `deleted_at` (owner soft delete) plus `hidden_at` (moderation) on user-generated content.

### Phase 1 — Foundation
**M001 `extensions`**: `postgis`, `pg_cron`, `pg_net`, `pg_trgm`, `btree_gist` (in schema `extensions`).

**M002 `core_enums_and_helpers`**
- Enums:
  - `app_role` (job_seeker, employer, mentor, buddy, flat_lister, admin)
  - `gender` (male, female)
  - `verification_status` (pending, approved, rejected)
  - `verification_kind` (company, mentor, buddy, flat_lister_id)
- `set_updated_at()` trigger function.

**M003 `geo_reference`**
- `cities`: name, slug, state, country_code, `center` geography, timezone default `Asia/Kolkata`, is_active.
- `neighbourhoods`: city_id, name, slug, `center` geography (GIST).
- Both are seeded with the 5 launch cities.

**M004 `profiles_and_roles`**
- `profiles`: id → auth.users on delete cascade; full_name, gender, city_id, avatar_path, bio, onboarding_completed_at, suspended_at. **Holds no phone or email.**
- `profile_private`: user_id PK; phone, whatsapp_opt_in. Only the owner and admins can read it.
- `user_roles`: (user_id, role) unique.
- `has_role(app_role)`: `stable security definer set search_path=''`, uses `(select auth.uid())`. Also `is_admin()`.
- `handle_new_user()` trigger on `auth.users` insert creates the `profiles` row and `profile_private.phone` from `auth.users.phone`.

**M005 `trust_safety`**
- `verification_requests`: user_id, kind, subject_id (company_id for kind=company), status, document_paths text[], applicant_note, reviewed_by, reviewed_at, rejection_reason.
- `blocks`: blocker_id, blocked_id, unique pair, check that they differ.
- `reports`: reporter_id, target_type enum (user, company, job, flat_listing, relocation_request, review, area_tip, message, place_suggestion), target_id, reason enum, details, status (open, dismissed, actioned), resolved_by, resolution_note.
- `audit_log`: actor_id, action, target_table, target_id, details jsonb.
- `rate_limit_events`: user_id, action, created_at; index (user_id, action, created_at).
- Helpers:
  - `is_blocked_between(a,b)`
  - `check_rate_limit(action text, max int, window interval)`, which raises on excess
  - `log_admin_action(...)`
  - generic `audit_admin_change()` trigger, attached later to admin-managed tables

### Phase 2 — Jobs
**M006 `skills_and_seeker_profile`**
- `skills`: name, slug unique, trigram index.
- `seeker_profiles`: user_id PK; headline, summary, experience_level enum, work_mode_pref, preferred_city_ids uuid[], languages text[], linkedin_url, portfolio_url, open_to_relocate.
- `seeker_salary_prefs`: user_id PK; min, max, currency, `share_with_employers` default false. Kept separate so salary stays private.
- `profile_skills`: user_id, skill_id.
- `experiences`: title, company_name, dates, is_current, description.
- `educations`: institution, degree, field, dates.
- `cvs`: user_id, storage_path, file_name, size_bytes, is_default; only one default per user (partial unique index).

**M007 `companies`**
- `companies`: owner_id, name, slug, logo_path, industry, size enum, website, description, is_community_owned, leap_friendly, verification_status, verified_at, hidden_at.
- `company_members`: company_id, user_id, member_role (owner, recruiter). MVP uses owner only.
- `company_locations`: company_id, city_id, address, location (GIST).
- `company_affiliations`: user_id, company_id, confirmed_by_company_at. This backs "works at Company X" for referrals.
- Helper `is_company_member(company_id)`.

**M008 `jobs`**
- Enums:
  - `job_type` (full_time, part_time, contract, internship)
  - `work_mode` (onsite, hybrid, remote)
  - `experience_level` (entry, mid, senior, lead)
  - `job_status` (draft, pending_review, published, closed, expired)
- `jobs`: company_id, posted_by, title, description, requirements, job_type, work_mode, experience_level, city_id, address_text, location, salary_min, salary_max, currency, salary_visible, openings, application_deadline, status, published_at, expires_at, hidden_at, `search_tsv` generated tsvector.
- Indexes: GIN(search_tsv), GIST(location), (status, published_at desc), city_id.
- `job_skills`, `job_screening_questions` (question, is_required, position).
- Trigger `jobs_enforce_status`:
  - The company must be verified to reach `published`.
  - A company's first job goes to `pending_review` instead.
  - Only admins move `pending_review` → `published`.

**M009 `applications`**
- `application_status` enum: applied, shortlisted, interview, offer, hired, rejected, withdrawn.
- `job_applications`: job_id, applicant_id, cv_id, cover_note, status, referral_id; unique (job_id, applicant_id).
- `application_answers`: application_id, question_id, answer.
- `application_status_history`: from, to, changed_by.
- `application_notes`: employer-private; application_id, author_id, body.
- `interview_slots`: application_id, proposed_by, starts_at, ends_at, location_or_link, status (proposed, selected, cancelled).
- `referrals`: job_id, referrer_id, seeker_id, note, application_id. A trigger checks that the referrer has an affiliation with the job's company.

**M010 `saved_jobs_and_searches`**
- `saved_jobs`: (user_id, job_id) PK.
- `saved_searches`: user_id, name, filters jsonb, alert_frequency (none, daily), last_alerted_at.

### Phase 3 — LEAP & Mentorship
**M011 `leap`**
- Enums: `leap_program_type` (workshop, training_course, internship, cohort), `program_mode` (online, in_person), `leap_program_status` (draft, open, closed, completed, cancelled), `enrollment_status` (pending, enrolled, waitlisted, rejected, cancelled, completed).
- `leap_programs`: title, slug, description, type, mode, city_id, venue, start_date, end_date, capacity, eligibility, requires_approval, status, badge_name, image_path.
- `leap_enrollments`: program_id, user_id unique pair, status, motivation, decided_by, decided_at, completed_at.
- `leap_badges`: user_id, program_id, awarded_by, awarded_at; unique pair.
- Trigger: when an enrolled user cancels, the oldest waitlisted user is promoted.

**M012 `mentorship`**
- Enums: `session_type` (career_guidance, cv_review, mock_interview, skill_roadmap, industry_qa), `session_status` (requested, confirmed, declined, cancelled, completed).
- `mentor_profiles`: user_id PK; headline, bio, industries text[], years_experience, languages, city_id, timezone, session_types session_type[], default_duration_min (30 or 60), is_accepting, verification_status, verified_at, rating_avg, rating_count.
- `mentor_skills`: reuses `skills`.
- `mentor_availability_rules`: weekday 0–6, start_time, end_time, interpreted in the mentor's timezone.
- `mentor_availability_exceptions`: date, start_time, end_time, kind (unavailable, extra).
- `mentorship_sessions`: mentor_id, mentee_id, session_type, starts_at, ends_at, status, goal_note, meeting_url, decline_reason, cancelled_by.
  - **Exclusion constraint** (btree_gist) prevents a mentor's requested or confirmed sessions from overlapping.
  - A **trigger** enforces at most 2 upcoming requested/confirmed sessions per mentee. It runs with an advisory lock on the mentee.
- `session_feedback`: session_id, author_id, author_side (mentee, mentor), rating 1–5 (required for mentee, null for mentor), comment, next_steps (mentor). Unique (session_id, author_id). A trigger keeps `mentor_profiles.rating_*` current.
- `mentor_private_notes`: session_id, mentor_id, body.

### Phase 4 — Settle In
**M013 `settle_in_relocation`**
- Enums: `relocation_need` (flat, flatmate, area_guidance, nearby_masjid, halal_food, pickup, temporary_stay, general_advice), `household_type` (alone, family, with_flatmates), `request_status` (open, closed, cancelled), `offer_status` (pending, accepted, declined, withdrawn).
- `buddy_profiles`: user_id PK; city_id, neighbourhood_ids, bio, languages, help_types relocation_need[], is_active, verification_status, verified_at, rating_avg, rating_count.
- `relocation_requests`: user_id, city_id, neighbourhood_ids, move_from, move_to, workplace_location (nullable, GIST), budget_min, budget_max, currency, household, needs relocation_need[], note, same_gender_buddies_only, status, closed_at, hidden_at.
- `relocation_offers`: request_id, buddy_id, message, status; unique pair.
- `buddy_ratings`: request_id, buddy_id, rater_id, rating, comment. Allowed only after the request is closed and the offer was accepted.

**M014 `flats`**
- Enums: `listing_type` (entire_flat, private_room, shared_room, pg_hostel), `listing_status` (active, paused, rented, expired), `tenant_gender_pref` (any, male, female, family), `furnishing` (unfurnished, semi, full), `food_pref` (veg_only, non_veg_ok, halal_only).
- `flat_listings`: lister_id, listing_type, city_id, neighbourhood_id, title, description, rent, deposit, currency, furnishing, available_from, min_stay_months, bedrooms, bathrooms, amenities text[], food_pref, tenant_gender_pref, **approx_location** (GIST), status, expires_at (default now + 30 days), renewed_at, deleted_at, hidden_at.
- `flat_listing_private`: listing_id PK; address_line, landmark, **exact_location**.
  - A security-definer trigger here computes `flat_listings.approx_location`: snap to a ~400 m grid, then add a deterministic offset seeded from a hash of the listing id. Because the offset is fixed per listing, repeated reads cannot be averaged to recover the exact point.
- `flat_listing_photos`: listing_id, storage_path, position. A trigger caps a listing at 10 photos.
- `flat_contact_requests`: listing_id, requester_id, intro, status (pending, accepted, declined, withdrawn), decided_at. Partial unique index on (listing_id, requester_id) while pending or accepted.

**M015 `flatmates`**
- Enums: `sleep_schedule`, `work_schedule`, `guests_policy`.
- `flatmate_profiles`: user_id PK; city_id, neighbourhood_ids, budget_min, budget_max, move_date, preferred_gender (any, male, female), food_habit (veg, non_veg, halal_only), smokes bool, ok_with_smoker bool, sleep_schedule, work_schedule, cleanliness 1–5, guests_policy, bio, is_active.
- `flatmate_connections`: requester_id, recipient_id, message, status; unique pair.

**M016 `chat`**
- `conversation_context` enum: relocation_offer, flat_contact, flatmate_connection.
- `conversations`: context_type, context_id unique pair, last_message_at.
- `conversation_participants`: (conversation_id, user_id) PK, last_read_at.
- `messages`: conversation_id, sender_id, body (≤ 2000 chars, plain text), attachment_path, deleted_at, hidden_at. Index (conversation_id, created_at desc).
- Helper `is_conversation_participant(conv_id)`.
- Before-insert trigger: sender must be a participant, must not be blocked by the other participant, and passes the rate limit (30 messages/min). After-insert, it bumps `last_message_at`.
- Realtime publication includes `messages`, `notifications` and `conversation_participants`.

### Phase 5 — Places & area guides
**M017 `places`**
- `place_type` enum: shia_masjid, imambargah, community_center, islamic_school, halal_restaurant, halal_grocery, hospital_clinic, transit_station.
- `places`: name, place_type, address, location (GIST), city_id, neighbourhood_id, phone, website, timings text, notes, is_verified, created_by, hidden_at.
- `place_photos`.
- `place_suggestions`: user_id, place_id (null means a new place), payload jsonb, status, reviewed_by, review_note.

**M018 `area_guides`**
- `area_guides`: neighbourhood_id unique; summary, rent_ranges jsonb (by listing_type), commute_notes, safety_notes, halal_food_notes, is_published, updated_by.
- `area_tips`: neighbourhood_id, author_id, body, upvote_count, deleted_at, hidden_at.
- `area_tip_votes`: (tip_id, user_id) PK; a trigger maintains `upvote_count`.

### Phase 6 — Notifications & admin
**M019 `notifications`**
- `notifications`: user_id, type text, title, body, link, data jsonb, read_at, email_status (skipped, pending, sent, failed), emailed_at. Index (user_id, read_at, created_at).
- `notification_preferences`: user_id PK; email_enabled, email_types text[] (opt-out list), whatsapp_opt_in false.
- Helper `notify(user_id, type, title, body, link, data)` is security definer and sets email_status from preferences. Domain triggers and RPCs call it: application status change, session confirmed, offer/contact/connection accepted, verification decided, enrollment decided, interview slot picked.

**M020 `cron_jobs`** (pg_cron)
- Expire flat listings past `expires_at` (hourly).
- Expire jobs past their deadline (hourly).
- Mark past confirmed sessions completed (hourly).
- Purge `rate_limit_events` older than 1 day (daily).
- Every minute, call `dispatch-notifications` via `pg_net` with a secret from Vault.
- Daily at 07:30 IST, call `job-alert-digest`.

**M021 `admin_analytics`**: analytics RPCs (§4).

The `audit_admin_change` trigger is attached to places, area_guides, leap_programs, companies and jobs (when the actor is an admin).

---

## 2. RLS policies (by table and role)
Global rules:
- RLS is on for every table, with one policy per operation.
- The `authenticated` and `anon` grants are explicit.
- Every policy uses `(select auth.uid())` and `(select has_role(...))` for performance.
- **Admin:** an `admin_all` policy on every table, checking `is_admin()`.
- **Blocked:** wherever one user sees another's content, the policy adds `not is_blocked_between(auth.uid(), owner)`.
- **Suspended:** users with `profiles.suspended_at` fail insert checks on user-generated tables, and their content is hidden from others.
- **State changes** (status columns) go only through security-definer RPCs that check the caller. The tables have no direct UPDATE policy on those columns; a guard trigger rejects status edits that don't come from an RPC.

| Table | anon | Owner / self | Other authenticated | Special roles |
|---|---|---|---|---|
| cities, neighbourhoods, skills | select | — | select | admin writes |
| profiles | — | select/update own (not suspended_at) | select if not blocked/suspended | admin |
| profile_private, notification_preferences | — | select/insert/update own | none | admin select |
| user_roles | — | select own; insert/delete own **except `admin`** | none | admin manages; admin role is granted only by admin |
| verification_requests | — | insert own (status forced to pending), select own | none | admin select; decision via RPC |
| blocks | — | select/insert/delete own (blocker) | none | admin select |
| reports | — | insert (rate-limited), select own | none | admin |
| audit_log, rate_limit_events | — | none | none | admin select; inserts only via definer functions |
| seeker_profiles, experiences, educations, profile_skills | — | full CRUD own | none | employer select where the user applied to their company's job |
| seeker_salary_prefs | — | full own | none | employer select only if `share_with_employers` and the user applied |
| cvs | — | full own | none | employer select of the cv_id used in an application to their job |
| companies | select verified and not hidden | owner/members select and update (not verification fields); any user can insert as owner | select verified | admin |
| company_members, company_locations | locations of verified companies | members manage | locations of verified companies | admin |
| company_affiliations | — | CRUD own | select | company owner can set `confirmed_by_company_at` |
| jobs, job_skills, job_screening_questions | select published, not hidden, company verified | company members full (status via trigger rules) | same as anon | admin (approves pending_review) |
| job_applications | — | applicant: insert own (job published, before deadline), select own; withdraw via RPC | none | company members select for their jobs; status via RPC |
| application_answers | — | applicant insert/select own | none | company members select |
| application_status_history | — | applicant select | none | company members select; insert via RPC only |
| application_notes | — | none for applicant | none | company members CRUD |
| interview_slots | — | applicant select; pick via RPC | none | company members insert/select/cancel |
| referrals | — | referrer insert (affiliation check) and select; seeker select | none | company members select for their jobs |
| saved_jobs, saved_searches | — | full own | none | — |
| leap_programs | select non-draft | — | select non-draft | admin CRUD |
| leap_enrollments | — | select own; enroll/cancel via RPC | none | admin decide/complete via RPC |
| leap_badges | — | select own | select (shown on profiles) | admin; employer filtering via RPC |
| mentor_profiles, mentor_skills | — | owner CRUD (not verification fields) | select verified and accepting | admin |
| mentor_availability_* | — | owner CRUD | select for verified mentors | — |
| mentorship_sessions | — | mentor and mentee select; mentee inserts `requested` (trigger enforces limits); accept/decline/cancel via RPC | none | admin |
| session_feedback | — | author insert after completion; both participants select | none | admin; hidden on report |
| mentor_private_notes | — | mentor only | none | admin |
| buddy_profiles | — | owner CRUD | select verified (only by users who have an open request in that city, or by admins) | admin |
| relocation_requests | — | owner CRUD; status via RPC | **verified buddy in the same city**, request open, not blocked, and gender matches if `same_gender_buddies_only` | admin |
| relocation_offers | — | buddy insert/select/withdraw own; requester select offers on own requests; accept/decline via RPC | none | admin |
| buddy_ratings | — | requester insert (closed and accepted); select | select | admin |
| flat_listings | — | lister full own | select active, not deleted/hidden/blocked, **and `tenant_gender_pref` in (any, family, my gender)** | admin |
| **flat_listing_private** | — | lister full | **select only if an accepted contact request exists for (listing, me)** | admin |
| flat_listing_photos | — | lister CRUD | select when the parent listing is visible | admin |
| flat_contact_requests | — | requester insert (rate-limited 10/day, not own listing, listing visible to them) and select; lister selects requests on own listings; decisions via RPC | none | admin |
| flatmate_profiles | — | owner CRUD | select active, same city, **gender both ways**, not blocked | admin |
| flatmate_connections | — | requester insert (rate-limited, gender/city rules re-checked); both parties select; decision via RPC | none | admin |
| conversations, conversation_participants | — | participants select; participant updates own `last_read_at` | none | admin select (only for moderation of reported messages) |
| messages | — | participants select; sender insert (trigger: participant, not blocked, rate limit); sender soft-delete own | none | admin hide |
| places, place_photos | select verified, not hidden | — | same | admin CRUD |
| place_suggestions | — | insert/select own | none | admin |
| area_guides | select published | — | select published | admin CRUD |
| area_tips | select not hidden/deleted | author insert (verified buddy) and soft-delete own | select | admin hide |
| area_tip_votes | — | insert/delete own | — | — |
| notifications | — | select own, update `read_at` own | none | insert only via `notify()` |

---

## 3. Storage buckets
All paths are prefixed with the owning id so policies can use `storage.foldername(name)`.

| Bucket | Public | Limits | Write | Read |
|---|---|---|---|---|
| `avatars` | yes | 2 MB, jpeg/png/webp | owner: `{user_id}/…` | public |
| `company-logos` | yes | 2 MB, images | company members: `{company_id}/…` | public |
| `cvs` | **no** | 5 MB, `application/pdf` only | owner: `{user_id}/…` | owner; company members of a job where an application references that CV. The server action issues a **600 s signed URL** with the employer's own session (no service role). |
| `verification-docs` | **no** | 5 MB, pdf/jpeg/png | owner `{user_id}/…` | owner, admin |
| `listing-photos` | yes (random UUID paths) | 5 MB, jpeg/png/webp | lister `{listing_id}/…` (checked against `flat_listings.lister_id`) | public URL; pages that link to them require sign-in. **EXIF/GPS is stripped client-side** (canvas re-encode) before upload so photos cannot leak the exact location. |
| `chat-attachments` | **no** | 5 MB, images | participant `{conversation_id}/…` | participants (signed URLs) |
| `place-photos` | yes | 5 MB, images | admin | public |
| `leap-assets` | yes | 5 MB, images | admin | public |

---

## 4. RPC functions
All set `search_path = ''`. They are SECURITY INVOKER unless marked **(definer)**. Every definer function re-checks `auth.uid()` and the caller's role/ownership, and `execute` is revoked from `anon` unless the function is public.

**Auth/roles/helpers:**
- `has_role(app_role)` (definer), `is_admin()`
- `is_company_member(uuid)` (definer)
- `is_conversation_participant(uuid)` (definer)
- `is_blocked_between(uuid, uuid)` (definer)
- `my_gender()` (definer)
- `is_verified_buddy_in_city(uuid)` (definer)
- `check_rate_limit(text, int, interval)` (definer)
- `complete_onboarding(roles app_role[], …)` (definer): writes the profile, inserts non-admin roles, and creates `verification_requests` for mentor, buddy and company kinds.

**Jobs:**
- `search_jobs(q, city_id, near geography, radius_km, job_types[], work_modes[], levels[], salary_min, posted_within_days, leap_friendly, limit, offset)`: full text, ST_DWithin, ordered by rank/distance/date. Public.
- `recommended_jobs(limit)`: score from skill overlap, preferred cities and level.
- `apply_to_job(job_id, cv_id, cover_note, answers jsonb, referral_id)` (definer): validates in one transaction.
- `withdraw_application(id)` (definer).
- `set_application_status(id, status, note)` (definer): writes history and notifies.
- `pick_interview_slot(slot_id)` (definer).
- `get_applicants(job_id, leap_badge_only bool)` (definer): returns applicant summary, LEAP badges and referral flag, with salary only if shared.

**LEAP:**
- `enroll_in_program(program_id, motivation)` (definer): row-locks the program; result is enrolled, waitlisted or pending.
- `cancel_enrollment(id)`
- `admin_decide_enrollment(id, approve, reason)`, `admin_complete_enrollment(id)` (awards the badge). Both are definer, admin only, and audited.

**Mentorship:**
- `search_mentors(filters)`
- `get_mentor_slots(mentor_id, from date, to date)`: expands weekly rules in the mentor's timezone, applies exceptions, subtracts booked sessions, and returns UTC slots.
- `request_session(...)`, `respond_to_session(id, accept, meeting_url, reason)`, `cancel_session(id)`: all definer.

**Settle In:**
- `list_open_requests_for_buddy()`
- `offer_help(request_id, message)` (rate-limited)
- `accept_relocation_offer(offer_id)` (definer): creates the conversation and participants, then notifies.
- `close_relocation_request(id)`
- `send_contact_request(listing_id, intro)`, `respond_contact_request(id, accept)` (definer; accepting creates a conversation and unlocks `flat_listing_private` through RLS).
- `renew_listing(id)`
- `get_flatmate_matches(limit, offset)`:
  - Hard filters: same city, active, gender both ways, not blocked.
  - Score (0–100): area overlap 25, budget overlap 20, move-date proximity 15, food 15, smoking 10, sleep/work schedule 10, cleanliness/guests 5.
- `send_flatmate_connection(...)`, `respond_flatmate_connection(...)` (definer).

**Chat:**
- `get_my_conversations()`: other participant, context, last message and unread count.
- `mark_conversation_read(id)`.

**Geo/map:**
- `search_flats(city_id, masjid_radius_km, workplace geography, workplace_radius_km, rent_min, rent_max, listing_types[], bbox, limit, offset)`:
  - Works on `approx_location`. The masjid filter is an EXISTS over verified places of type shia_masjid or imambargah.
  - Returns `nearest_masjid_km` and `workplace_km`.
  - SECURITY INVOKER, so RLS (gender and blocks) still applies.
- `places_in_view(bbox, types[])`: public.
- `nearby_places(point, radius_km, types[])`: used by area guides and the job detail page.

**Trust/admin** (all definer, admin only, all write `audit_log`):
- `block_user(id)`, `unblock_user(id)`
- `admin_review_verification(id, approve, reason)`: sets the verified flags on company/mentor/buddy/profile.
- `admin_resolve_report(id, action, note)`: action is dismiss, hide, warn or suspend. Hide sets `hidden_at`; warn sends a notification; suspend sets `suspended_at` and then calls the Edge Function for an auth ban.
- `admin_review_place_suggestion(id, approve, note)`
- `admin_analytics(from, to, city_id)`: signups by role, jobs posted, applications, hires, sessions, relocation requests opened/closed, active listings, per-city breakdown.

---

## 5. Edge Functions (Deno, `supabase/functions/`)
| Function | Trigger | Does |
|---|---|---|
| `dispatch-notifications` | pg_cron every minute via pg_net (Vault secret header) | Reads `notifications` where `email_status='pending'` (service role) and checks preferences. Sends via **Resend** through the `_shared/email.ts` interface, renders simple templates and marks sent/failed with retry. `_shared/whatsapp.ts` is a stub interface with a log-only implementation. |
| `job-alert-digest` | pg_cron daily 07:30 IST | For each daily `saved_searches` entry, runs the `search_jobs` logic for jobs published since `last_alerted_at`, creates one digest notification (email), and updates `last_alerted_at`. |
| `admin-user-action` | called from an admin server action (admin JWT verified inside the function) | Suspend/unsuspend: auth ban through the Admin API plus `profiles.suspended_at` and audit log. This is the only place that needs the service role outside cron. |

Rate limiting for messages, contact requests, reports, offers and connections uses DB triggers with `check_rate_limit`. Auth's built-in OTP rate limits are configured in the dashboard, plus an optional captcha. No other functions are needed. CV signed URLs, uploads and RPCs run under the user's own JWT.

---

## 6. Folder structure
This follows CLAUDE.md §5 exactly, plus:
```
supabase/functions/_shared/      # cors.ts, supabaseAdmin.ts, email.ts (Resend), whatsapp.ts (stub), auth.ts
supabase/tests/                  # 000_helpers.sql (tests.create_user / authenticate_as), one file per table group
src/app/(public)/                # /, /jobs, /jobs/[id], /companies/[slug], /leap, /leap/[slug], /places, /areas/[city]/[hood]
src/app/(auth)/                  # /sign-in, /verify, /onboarding/[step], /auth/callback
src/app/(dashboard)/             # /home, /profile, /applications, /saved, /employer/*, /mentor/*, /mentors, /sessions,
                                 # /settle-in, /settle-in/requests, /buddy/*, /flats, /flats/[id], /flats/new, /flatmates,
                                 # /map, /messages, /messages/[id], /notifications, /settings
src/app/admin/                   # verification, moderation, places, areas, leap, analytics, audit
src/features/<feature>/          # components/, actions.ts, queries.ts, schemas.ts, types.ts, strings.ts (+ leap/service.ts)
src/lib/maps/                    # MapProvider interface + mapbox implementation, <MapView/> client component
src/lib/supabase/                # server.ts, client.ts, middleware.ts, storage.ts (signed URLs, image re-encode helper)
src/lib/result.ts                # ActionResult<T> type + helpers
src/lib/sections.ts              # the 3 user-facing sections (D-021): names, nav entries, module mapping
```

---

## 7. Phased build plan
Each task follows the CLAUDE.md Definition of Done: apply_migration plus a file, RLS, pgTAP tests, types, advisors, lint/typecheck/test, 375 px check, docs, commit.

Phases are labelled with the user-facing section they deliver (D-021): **Community Portal** = Jobs, **Career Development** = LEAP + Mentorship, **Location Gathering** = Settle In + Places. Scope and order are unchanged.

**Phase 0: Approve and record.** Save this plan to `docs/BUILD_PLAN.md` and log D-006…D-020 in DECISIONS.md. Run `git init` and make the first commit.

**Phase 1: Foundation** — done 2026-10-02 (migrations `20261002070113`…`20261002070427`; see D-022, D-023)
1. Scaffold Next.js, TypeScript strict, Tailwind, shadcn/ui, ESLint, Vitest, Playwright and pnpm scripts. Add `.gitignore` and `.env.example`.
2. `supabase init` for the local stack and pgTAP test harness (`000_helpers.sql`).
3. Migrations M001–M005, then pgTAP tests (owner, other user, admin, anon) for profiles, roles, verification, blocks, reports and audit.
4. `src/lib/supabase/*`, middleware route protection, and the `ActionResult` type.
5. Auth UI: phone OTP, email OTP/magic link, Google, and `/auth/callback`.
6. Onboarding steps (basic profile, intent multi-select, role-specific steps, pending-verification state) via `complete_onboarding`.
7. App shell: mobile bottom nav plus desktop sidebar with the three sections (Community Portal, Career Development, Location Gathering) from `src/lib/sections.ts`, adapting entries to roles. Landing page with one block per section. Report/block shared components.
8. Seed the 5 cities and neighbourhoods. Generate types, run advisors, commit. Then a list of dashboard steps for the user (providers, SMS, redirect URLs, OTP rate limits).

**Phase 2: Community Portal (Jobs)** — done 2026-10-04 (migrations `20261003190650`…`20261003191016`; see D-024…D-029). Deferred: avatar upload, map pin picker (Phase 5), `get_applicants` LEAP filter (Phase 3), job-alert emails and expiry cron (Phase 6).
1. M006 seeker profile, skills and CVs, plus the `cvs` and `avatars` buckets. Profile builder UI and CV upload.
2. M007 companies, plus the `company-logos` bucket. Company profile and verification request.
3. M008 jobs with status trigger. Employer job form with map pin; drafts, publish and close.
4. `search_jobs` RPC, then the public search page with filters, job detail page, and the "Relocating?" link.
5. M009 applications, `apply_to_job` and my-applications with history.
6. Employer pipeline board (status dropdown plus drag-and-drop), notes, signed CV view, interview slots.
7. Affiliations and referrals. M010 saved jobs and searches. `recommended_jobs`.
8. Seed fake companies and jobs across the 5 cities. Tests, advisors, commit.

**Phase 3: Career Development (LEAP and mentorship)** — done 2026-10-04 (migrations `20261004063042_leap`, `20261004063219_mentorship`; see D-031, D-032). Mentorship is built end to end. LEAP is future scope (D-031): its tables exist, and `/leap` is a page announcing the coming integration with the LEAP program.
1. M011 LEAP plus `leap-assets`, `features/leap/service.ts`, public program pages, enroll/waitlist, admin LEAP screens, badges on profiles, and the LEAP filter in `get_applicants`.
2. M012 mentorship. Mentor onboarding and verification, availability editor (rules and exceptions, timezone), `get_mentor_slots`.
3. Booking flow, accept/decline with meeting URL, 2-session limit and overlap tests, feedback and ratings, private notes. Seed, tests, commit.

**Phase 4: Location Gathering, part 1 (Settle In)** — done 2026-10-04 (migrations `20261004065051_chat`, `20261004065206_settle_in_relocation`, `20261004065330_flats`, `20261004065417_flatmates`, `20261004070332_flats_renew_requires_address`; see D-033…D-035). Deferred: map pin picker and radius filters (Phase 5), notifications and the moderation queue (Phase 6).
1. M013 relocation requests, buddy profiles, offers, ratings, and the buddy dashboard.
2. M016 chat (built before flats so accept-flows can open conversations), the `chat-attachments` bucket, Realtime subscription per conversation, unread counts, report/block in chat.
3. M014 flats: listing wizard with photos (EXIF stripped), private address, approximate-location trigger, contact requests, address reveal. pg_cron expiry and renew.
4. M015 flatmate profiles, `get_flatmate_matches`, connections.
5. Critical pgTAP tests: a non-accepted user can never read `flat_listing_private`; non-participants can never read messages; gender filters hold in both directions; blocked users are fully hidden; rate limits fire. Commit.

**Phase 5: Location Gathering, part 2 (places, area guides and map)**
1. M017 places plus `place-photos`, the public directory, and suggestions.
2. M018 area guides and tips with votes.
3. `src/lib/maps` wrapper (Mapbox). `search_flats`, `places_in_view`, `nearby_places`. `/map` page with layers, workplace pin, the masjid-radius and workplace-radius filters, and a synced list.
4. Seed sample places (clearly marked SAMPLE, fake coordinates near city centers) and neighbourhood guides. Tests, commit.

**Phase 6: Notifications and admin**
1. M019 notifications, the `notify()` wiring in all RPCs, realtime bell, preferences page.
2. Edge Functions `dispatch-notifications` (Resend) and the WhatsApp stub. M020 cron jobs, `job-alert-digest`.
3. Admin: verification queue, moderation queue with actions, `admin-user-action` function, places/areas/LEAP management, M021 analytics dashboard, audit log viewer. Tests, commit.

**Phase 7: Hardening.** As in `docs/PROMPTS.md` §8: advisors, RLS audit, service-key scan, 375 px pass, states pass, Playwright e2e for the 6 main flows, report.

---

## 8. Decisions to log in DECISIONS.md
- D-006: India/INR single country, multi-country-ready columns.
- D-007: Launch cities.
- D-008: Open employer registration gated by verification; `is_community_owned` flag.
- D-009: LEAP `requires_approval` per program.
- D-010: Resend for email.
- D-011: WhatsApp stubbed.
- D-012: Public visibility scope.
- D-013: Binary gender field for matching.
- D-014: Role model. Verification-required roles are granted at onboarding, but capabilities are gated by `verified_at` on the role profile. `admin` is never self-assignable.
- D-015: State transitions only via security-definer RPCs.
- D-016: Notification outbox, delivered by pg_cron → Edge Function.
- D-017: DB-trigger rate limiting via `rate_limit_events`.
- D-018: Deterministic approximate-location algorithm.
- D-019: Listing photos in a public bucket with UUID paths and client-side EXIF stripping.
- D-020: pgTAP on a local Docker stack for RLS tests.

Minor product calls I made (tell me if you disagree):
- Area tips are posted by verified buddies; admins write guide summaries.
- Referral affiliations are self-declared and the company owner can confirm them. The employer sees whether an affiliation is confirmed.
- Salary expectations are hidden from employers unless the seeker opts in.
- Workplace pins on relocation requests are visible to eligible buddies.

---

## 9. Verification (how each phase is proven)
- `supabase start` then `supabase db reset` rebuilds the DB from `supabase/migrations/`, which proves reproducibility. `supabase test db` runs all pgTAP files.
- On the hosted dev project after each migration: `list_migrations` matches the repo files, `get_advisors` (security and performance) is clean, and `generate_typescript_types` → `src/types/database.ts`.
- `pnpm lint && pnpm typecheck && pnpm test` pass, and `pnpm build` succeeds.
- Manual check in `pnpm dev` at 375 px for every new page, covering loading, empty and error states.
- Phase 7 Playwright e2e: sign-up and onboarding, apply to a job, book a mentor, relocation request and buddy acceptance, flat contact accepted with address revealed, map search near a masjid.

## Manual setup you'll need to do (later, when Phase 1 asks)
- Enable the Phone (with an SMS provider such as Twilio), Email and Google providers, and set redirect URLs.
- Set the OTP rate limits.
- Add a Resend API key and `CRON_SECRET` as Edge Function secrets, and the same `CRON_SECRET` in Vault.
- Add a Mapbox public token to `.env.local`.
- Install Docker Desktop and the Supabase CLI.
