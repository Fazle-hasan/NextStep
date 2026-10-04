# NextStep — Community Job & Career Portal

> Tagline: **"NextStep: Learn. Earn. Grow."**

This file is the source of truth for how to work in this repo. Read it fully at the start of every session.
Detailed product requirements live in the files below. Read them before planning or building any feature:

- @docs/PRODUCT_SPEC.md — roles, modules, features, user flows, MVP scope
- @docs/DECISIONS.md — architectural decisions already made (append new ones, never silently contradict old ones)

---

## 1. What we are building

A web platform for a Shia Muslim community that:

1. Connects **job seekers, employers, and mentors** (job board, applications, mentorship).
2. Integrates **LEAP**, an existing community career initiative (programs, enrollments, badges).
3. Helps people **relocate to a new city for work** ("Settle In"): finding flats and flatmates, getting to know an area, connecting with local community members ("Settle-In Buddies"), and finding nearby **Shia masjids, imambargahs, and community centers**.
4. Gives **admins** tools to verify users, moderate content, manage directories, and see analytics.

Primary users are on mobile. Design mobile-first.

### Feature sections (user-facing names)
The site groups modules into three sections. Use these names in navigation, landing page sections and page titles. Internal folders, routes, tables and code keep the module names.

| User-facing section | Modules | Feature folders |
|---|---|---|
| **Community Job Portal** | Jobs | `features/jobs` |
| **Relocation Support** | Settle In, Places | `features/settle-in`, `features/places` |
| **Career Development** | Mentorship, LEAP | `features/mentorship`, `features/leap` |

Section names, their order and their nav entries live in one place (`src/lib/sections.ts`) so they can be translated later. See D-021 and D-042 (the ids `community-portal` and `location-gathering` are kept in URLs and code).

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript (strict mode) |
| Styling | Tailwind CSS + shadcn/ui components |
| Database | Supabase Postgres + PostGIS extension |
| Auth | Supabase Auth: phone OTP, email OTP / magic link, Google OAuth |
| File storage | Supabase Storage |
| Realtime | Supabase Realtime (chat, live notifications) |
| Server logic | Next.js Server Actions + Supabase Edge Functions (Deno) |
| Scheduled jobs | pg_cron |
| Supabase client | `@supabase/ssr` (server, client, middleware clients). Next.js 16 calls middleware `src/proxy.ts`; it uses `src/lib/supabase/middleware.ts` |
| Validation | Zod (every input, client and server) |
| Forms | react-hook-form + Zod resolver |
| Maps | Mapbox GL JS, wrapped in `src/lib/maps/` so the provider can be swapped |
| Testing | Vitest (unit), Playwright (e2e), SQL tests for RLS |
| Package manager | pnpm |

Next.js is version 16, which differs from older docs (e.g. `proxy.ts`, async `params`). Check `node_modules/next/dist/docs/` before using an unfamiliar API (see `AGENTS.md`).

Do not add new major dependencies (ORMs, state libraries, UI kits) without asking first and logging the decision in `docs/DECISIONS.md`.

---

## 3. Supabase setup & MCP rules

- Supabase project: **hosted DEV project**, ref `zmvdkzphpjjcwwrnniuu`
- URL: `https://zmvdkzphpjjcwwrnniuu.supabase.co`
- Claude Code is connected through the **Supabase MCP server with write access** (see `.mcp.json`).
- This is a development project only. Never treat it as production. No real user data.

### How to change the database
1. **Every schema change** (tables, columns, indexes, RLS policies, functions, triggers, extensions, storage policies) is applied with the MCP **`apply_migration`** tool, so it is recorded in the project's migration history.
2. **The same SQL is saved** as a file in `supabase/migrations/` named `YYYYMMDDHHMMSS_short_description.sql`. The repo is the source of truth; the DB must always be reproducible from these files.
3. **`execute_sql` is for reads and debugging only.** Never use it for DDL or bulk data changes.
4. **Never** drop tables, drop columns, truncate, or delete data without asking me first and getting an explicit yes.
5. After any schema change, **regenerate types** (MCP `generate_typescript_types`) into `src/types/database.ts`.
6. After any schema change, run the MCP **security and performance advisors** and fix every RLS / security warning before moving on.
7. Seed/sample data goes in `supabase/sample-data/` (numbered `.sql` files, loaded by `supabase db reset`) and must be clearly fake (fake names, fake phone numbers like `+910000000001`). It is loaded into the hosted dev project only when I ask, and never into production.

### Database conventions
- `snake_case` for tables and columns; plural table names (`jobs`, `job_applications`).
- Primary keys: `id uuid primary key default gen_random_uuid()`.
- Every table has `created_at timestamptz not null default now()` and `updated_at timestamptz not null default now()` with an `updated_at` trigger.
- Foreign keys to users reference `public.profiles(id)` (which references `auth.users(id)` with `on delete cascade`).
- Use Postgres enums (or check constraints) for fixed sets: roles, statuses, job types.
- Locations use PostGIS `geography(Point, 4326)` with a GIST index.
- Soft delete user-generated content with `deleted_at timestamptz` where moderation may need history (listings, reviews, messages).
- Use `security definer` only when necessary, and always `set search_path = ''` on every function. Definer code lives in the unexposed `private` schema; `public` exposes a SECURITY INVOKER wrapper with the same name when the API or policies need it (D-022). Revoke `execute` from `anon`/`authenticated` on anything they should not call.

---

## 4. Security rules (non-negotiable)

### Row Level Security
- **RLS is enabled on every table in `public`.** No table ships without explicit policies.
- Roles live in `public.user_roles (user_id, role)`. A user can hold several roles.
- Use a helper `public.has_role(role app_role) returns boolean` in policies. Never trust a role sent from the client.
- Write policies per operation (`select`, `insert`, `update`, `delete`) and per role. Prefer clear, narrow policies over one broad policy.
- Every new table gets SQL tests proving at least: owner can access their rows, other users cannot, admin can.

### Keys & secrets
- `SUPABASE_SERVICE_ROLE_KEY` is used **only** in Edge Functions and server-only code. Never import it into any file that can reach the browser. Never prefix it with `NEXT_PUBLIC_`.
- Never commit `.env.local`. Never print secrets in logs or responses.
- Never read `.env.local` contents into the conversation.

### Personal data & privacy
- **Phone numbers and emails are never public.** They are shared only through in-app chat or after explicit consent.
- **Flat locations:** store the exact point and address in a restricted table (`flat_listing_private`). Expose only an **approximate location** (offset ~300–500 m or rounded) via a view or RPC for maps and search. The exact address is revealed only after the lister accepts a contact request.
- **Flatmate & listing gender preferences** are enforced in queries/RLS, not only hidden in the UI.
- **CVs** are stored in a **private** bucket. Employers access a CV only through a short-lived signed URL (≤ 10 min), and only for applications made to their own jobs.
- **Chat:** only conversation participants can read or write messages (RLS + Realtime filters).
- Users can **report** and **block** users, listings, jobs, reviews, and messages. Blocked users cannot message or see each other's listings.
- Mentors, buddies, flat listers, and employers get an **ID-verified badge** only after admin approval.

### App security
- Role and ownership checks happen **server-side** (RLS + server actions). UI checks are for UX only.
- Validate every input with Zod on the server, even if validated on the client.
- Rate-limit sensitive actions (OTP requests, messages, report submissions, contact requests) in Edge Functions or via DB checks.
- Sanitize any user-generated rich text; prefer plain text with line breaks.

---

## 5. Project structure

```
/
├── CLAUDE.md
├── .mcp.json
├── .env.example
├── docs/
│   ├── PRODUCT_SPEC.md
│   ├── DECISIONS.md
│   ├── PROMPTS.md
│   └── SETUP.md
├── supabase/
│   ├── migrations/          # every schema change, timestamped
│   ├── functions/           # Edge Functions (Deno)
│   ├── tests/               # SQL / RLS tests
│   └── sample-data/         # fake sample data (numbered .sql files)
├── src/
│   ├── app/                 # Next.js routes (App Router)
│   │   ├── (public)/        # landing, job search, area guides
│   │   ├── (auth)/          # sign in, OTP, onboarding
│   │   ├── (dashboard)/     # role dashboards
│   │   └── admin/
│   ├── features/
│   │   ├── auth/
│   │   ├── profiles/
│   │   ├── jobs/            # search, job detail, apply, applications, saved, referrals (sub-folders)
│   │   ├── employer/        # company profile, job posting, applicant pipeline
│   │   ├── leap/
│   │   ├── mentorship/
│   │   ├── settle-in/       # relocation, flats, flatmates, buddies, chat
│   │   ├── places/          # masjids, imambargahs, area guides, maps
│   │   ├── notifications/
│   │   ├── safety/          # report & block (shared by all modules)
│   │   └── admin/
│   ├── components/ui/       # shadcn/ui primitives
│   ├── components/shared/   # shared app components
│   ├── lib/
│   │   ├── supabase/        # server.ts, client.ts, middleware.ts
│   │   ├── maps/            # map provider wrapper
│   │   ├── validation/      # shared Zod schemas
│   │   └── utils/
│   └── types/
│       └── database.ts      # generated, never edit by hand
└── tests/
    └── e2e/                 # Playwright
```

Large features are split into sub-folders with the same file layout (e.g. `features/jobs/search/`, `features/jobs/applications/`, `features/employer/pipeline/`).

Inside each feature folder:

```
features/jobs/
├── components/     # UI for this feature
├── actions.ts      # server actions ("use server")
├── queries.ts      # data fetching (server)
├── schemas.ts      # Zod schemas
└── types.ts
```

---

## 6. Code conventions

- TypeScript strict; no `any`. Use generated DB types.
- Server Components by default; add `"use client"` only when needed (interactivity, maps, realtime).
- Data fetching in Server Components / `queries.ts`; mutations in Server Actions (`actions.ts`).
- Server actions return a typed result: `{ ok: true, data } | { ok: false, error: string }`. Never throw raw DB errors to the UI.
- Components: PascalCase files; one component per file; keep them under ~200 lines.
- Every page handles **loading, empty, and error states**.
- Accessibility: labels on all inputs, keyboard navigable, color contrast AA.
- Text is in English, but keep user-facing strings in one place per feature so Urdu/Hindi can be added later.
- Dates stored in UTC; displayed in the user's local time zone.
- Money stored as integers (smallest currency unit) with a currency code.

---

## 7. Commands

```bash
pnpm install          # install deps
pnpm dev              # run locally at http://localhost:3000
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm test             # Vitest
pnpm test:e2e         # Playwright
pnpm test:db          # pgTAP RLS tests (local Supabase in Docker)
pnpm build            # production build check
```

---

## 8. How to work (workflow)

1. **Plan before building.** For any new phase or feature, propose a plan (schema changes, RLS, files, UI) and wait for my approval.
2. **Small steps.** Build one feature at a time, end to end (migration → RLS → types → server logic → UI → tests).
3. **Ask, don't guess,** when a product decision isn't covered in `docs/PRODUCT_SPEC.md`.
4. **Log decisions.** Any non-trivial architectural or product decision gets a short entry in `docs/DECISIONS.md`.
5. **Keep docs current.** If you change how something works, update this file or the spec in the same task.
6. **Commit** after each completed task with a clear message (`feat(jobs): add application pipeline board`).

### Definition of done (every task)
- [ ] Migration applied via `apply_migration` AND saved in `supabase/migrations/`
- [ ] RLS policies written and tested
- [ ] Supabase advisors show no security warnings
- [ ] Types regenerated
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` all pass
- [ ] Loading / empty / error states handled
- [ ] Works on a 375px-wide mobile screen
- [ ] Docs updated if behaviour changed
- [ ] Committed
