# Claude Code Prompts

Paste these one at a time. Use **plan mode** (Shift+Tab) for the kickoff and at the start of each phase.
Run `/clear` between phases; CLAUDE.md and the docs carry the context forward.

---

## 0. Connection check

```
Using the Supabase MCP, list the tables in the project and the enabled extensions. Don't change anything.
```

---

## 1. Kickoff (plan mode)

```
Read CLAUDE.md, docs/PRODUCT_SPEC.md, and docs/DECISIONS.md fully.

Before writing any code, propose:
1. The full database schema for the MVP as a list of migrations (tables, columns, enums, PostGIS geography columns, indexes, triggers).
2. RLS policies for every table, organized by table and role.
3. Storage buckets (public/private) and their policies.
4. RPC functions needed (geo search, flatmate matching, approximate locations, has_role, etc.).
5. Edge Functions needed and what each does.
6. The folder structure and a phased build plan for the MVP, broken into small tasks.

List any open questions from PRODUCT_SPEC.md section 14 or anything else you need me to decide.
Don't implement anything until I approve. Save the approved plan to docs/BUILD_PLAN.md.
```

---

## 2. Phase 1 — Foundation

```
Phase 1 (follow docs/BUILD_PLAN.md and CLAUDE.md):
1. Scaffold Next.js (App Router, TypeScript strict, Tailwind, shadcn/ui, pnpm) if not already done. Add ESLint, Vitest, Playwright, and the pnpm scripts listed in CLAUDE.md.
2. Enable PostGIS and pg_cron via apply_migration.
3. Create migrations for: profiles, app_role enum, user_roles, has_role() helper, updated_at trigger function, a trigger that creates a profile on signup, verification_requests, reports, blocks, audit_log.
4. RLS policies + SQL tests for all of the above.
5. Supabase clients in src/lib/supabase (server, client, middleware) using @supabase/ssr, plus route protection middleware.
6. Auth UI: phone OTP, email OTP/magic link, Google. Onboarding flow with multi-role selection as described in PRODUCT_SPEC section 3.
7. App shell: mobile-first layout, navigation that adapts to the user's roles.
8. Generate types, run advisors, run lint/typecheck/tests. Commit.

Tell me what I need to configure manually in the Supabase dashboard (Google OAuth, SMS provider, redirect URLs).
```

---

## 3. Phase 2 — Jobs

```
Phase 2: Build Module 1 (Jobs) from PRODUCT_SPEC section 4, end to end:
- Migrations: companies, company_members, jobs, job_skills, job_screening_questions, job_applications, application_status_history, saved_jobs, saved_searches, referrals. Indexes for search and a GIST index on job locations.
- RLS + SQL tests (seekers see only their applications; employers see only applications to their jobs; unverified companies can't publish).
- Private "cvs" storage bucket + policies; signed URL (10 min) for employers via a server action.
- Seeker: profile builder, CV upload, job search with all filters, job detail, apply, my applications, saved jobs, saved searches.
- Employer: company profile + verification request, job posting with states, applicant pipeline board with notes, interview slot proposals.
- Community referrals.
- Seed realistic fake jobs and companies in 2–3 cities.
- Follow the Definition of Done in CLAUDE.md. Commit.
```

---

## 4. Phase 3 — Mentorship & LEAP

```
Phase 3: Build Module 2 (LEAP) and Module 3 (Mentorship) from PRODUCT_SPEC sections 5 and 6:
- LEAP: programs, enrollments (with waitlist), completions, badges on profiles, all behind features/leap/service.ts. Admin screens to manage them.
- Mentorship: mentor profiles + verification, recurring availability + exceptions (time-zone aware), booking flow, accept/decline, 2-upcoming-session limit (enforced in DB), feedback and ratings.
- Employers can filter applicants by LEAP badge.
- RLS + tests, seed data, Definition of Done. Commit.
```

---

## 5. Phase 4 — Settle In

```
Phase 4: Build Module 4 (Settle In) from PRODUCT_SPEC section 7:
- Relocation requests, buddy offers, accept offer → conversation.
- Flat listings with photos (public bucket) and a restricted flat_listing_private table for exact address/point. Approximate point stored on the public listing. Contact requests; exact address visible only after acceptance (enforce in RLS/RPC).
- Listing states and 30-day auto-expiry via pg_cron.
- Flatmate profiles and a compatibility-scored matching RPC with hard gender and city filters both ways.
- Chat: conversations, participants, messages (text + image), Supabase Realtime subscriptions filtered by conversation, unread counts. Only participants can read/write. Blocked users can't message.
- Report and block from chats, listings, and profiles.
- Rate limits on contact requests and messages.
- RLS + tests (especially: a non-accepted user can never read exact flat addresses; non-participants can never read messages). Definition of Done. Commit.
```

---

## 6. Phase 5 — Places, area guides & map

```
Phase 5: Build Module 5 from PRODUCT_SPEC section 8:
- places table (Shia masjids, imambargahs, community centers, halal food, groceries, hospitals, transit) with verified flag; place_suggestions for user submissions.
- neighbourhoods and area_guides; community tips with upvotes and moderation.
- RPC: search_flats_near(masjid_radius_km, workplace_point, workplace_radius_km, filters) using ST_DWithin on approximate flat points. Return distance to nearest masjid/imambargah and to workplace.
- Map page with Mapbox (wrapped in src/lib/maps): flats (approximate), places, workplace pin; synced results list; filters.
- Area guide pages per neighbourhood.
- Seed sample places and neighbourhoods for the seed cities (clearly fake/sample, to be replaced by admin-verified data).
- RLS + tests, Definition of Done. Commit.
```

---

## 7. Phase 6 — Notifications & Admin

```
Phase 6: Build Module 6 (Notifications) and Module 7 (Admin) from PRODUCT_SPEC sections 9 and 10:
- notifications table + realtime bell, notification preferences.
- Edge Function for email notifications; stub a WhatsApp sender behind an interface (real WhatsApp API is post-MVP).
- Daily job-alert digest via pg_cron + Edge Function.
- Admin: verification queue, moderation queue with actions, places & area guide management, LEAP management, analytics dashboard, audit log of every admin action.
- RLS + tests, Definition of Done. Commit.
```

---

## 8. Phase 7 — Hardening

```
Phase 7: Full security and quality review:
1. Run Supabase security and performance advisors; fix everything.
2. Audit every table's RLS policies against CLAUDE.md section 4. List any gaps and fix them.
3. Search the codebase for any service-role key usage reachable from the browser.
4. Check every page at 375px width; fix layout issues.
5. Check loading/empty/error states on every page.
6. Write Playwright e2e tests for the main flows: sign up + onboarding, apply to a job, book a mentor, create a relocation request and accept a buddy offer, send a flat contact request and get accepted, map search near a masjid.
7. Produce a short report of what was fixed and what remains. Commit.
```

---

## Useful anytime

**RLS audit**
```
Audit the RLS policies on all tables. For each table list who can select/insert/update/delete and flag anything broader than CLAUDE.md allows. Don't change anything yet; give me the report first.
```

**Update docs after a phase**
```
Update CLAUDE.md, docs/PRODUCT_SPEC.md, and docs/DECISIONS.md with any decisions or changes from this phase. Keep CLAUDE.md concise.
```

**Bug fix**
```
Bug: [describe what happens, what you expected, steps to reproduce].
Find the root cause first and explain it before changing code. Add a test that fails before the fix and passes after.
```
