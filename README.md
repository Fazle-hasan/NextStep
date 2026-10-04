# NextStep – Course Platform & Career Guidance Data Package

Data dictionary, verification and consent rules, and import instructions for the two datasets built for the NextStep Community Education & Career Development features. Build date: **2026-10-03**.

## 1. Files

| File | What it is | Rows |
|---|---|---|
| `course_platform_database.csv` | Course discovery dataset (requested deliverable 1) | 9,887 |
| `career_guidance_database.csv` | **Production** professional network – real, consented profiles only (requested deliverable 2) | 0 (header only – see §6) |
| `career_guidance_sample_database.csv` | Synthetic test profiles for development; same columns as production | 300 |
| `course_source_map.csv` | Provenance side-table: provider course ID, canonical URL, link-check result, pricing/run notes (1:1 with courses via `course_id`) | 9,887 |
| `excluded_broken_links.csv` | Courses dropped because their page returned HTTP 404 | 23 |
| `schema.sql` | PostgreSQL DDL for all tables, a public-directory view and consent/sample guard constraints | – |
| `validation_report.md` / `validation_results.json` | Automated validation output | – |
| `scripts/` | `build_courses.py`, `build_career.py`, `validate.py` – reproducible build and checks | – |

**Repository compatibility.** `https://github.com/Fazle-hasan/NextStep` returned 404 publicly and GitHub access is not linked to this session, so the repository's stack, schema and import conventions could not be reviewed. The files therefore follow generic, import-friendly conventions (snake_case headers identical to the requested schema, UTF-8, RFC 4180 quoting, ISO dates, `true`/`false`, PostgreSQL DDL provided). Map them onto the app's ORM models once the repository is accessible; no repository files were modified.

## 2. Conventions (both datasets)

- UTF-8, one header row, one record per row, comma-separated, RFC 4180 double-quote escaping, `\n` line endings, no embedded newlines.
- Column names are exactly those in the brief, in the brief's order.
- **Dates** `YYYY-MM-DD` (ISO 8601). SWAYAM run dates are converted to the Indian calendar date (source timestamps are 18:30 UTC = 00:00 IST).
- **Booleans** `true` / `false`. **Empty = not known / not stated by the source.** An empty boolean never means `false`.
- **Missing values**: always an empty field. No `N/A`, `NA`, `nil`, `-`, `not available` anywhere (checked automatically). The literal `unknown` is used **only** as a controlled value in classification fields (`pricing_type`, `hiring_status`, `community_affiliation_status`) where the field is mandatory.
- **Multi-value fields** (skills, roles, languages, topics…) are one text field with items separated by `"; "`.
- **Numbers** are plain numerics (no currency symbols, no ranges). Fees are only filled when verified; currency is ISO 4217 and required whenever a fee is > 0.

<<<<<<< HEAD
## Quick start (one command)

Everything needed to start and stop the app is in the **`run/`** folder.

| What you want | Windows: double-click | Any terminal (from the project folder) |
|---|---|---|
| Run with the hosted database from `.env.local` | `run/run.bat` | `pnpm dev:hosted` |
| Run with a local database (Docker Desktop must be running) | `run/run-local.bat` | `pnpm dev:local` |
| Stop the app and the local database | `run/stop.bat` | `pnpm dev:stop` |

Then open **http://localhost:3000**.

- **First time?** Use `run-local.bat`. It needs no `.env.local`: it starts a local database with sample jobs, and you sign in with any email and read the code at http://127.0.0.1:54324.
- **Hosted version** needs `.env.local` filled in (see [section 6](#6-option-b-run-against-a-hosted-supabase-project)).
- Each launcher installs dependencies on the first run and stops any old dev server of this project first, so the port is always 3000.
- Press `Ctrl+C` in the window to stop the app, or run `stop.bat`.
- On macOS or Linux use `./run/run.sh hosted`, `./run/run.sh local` or `./run/run.sh stop`.

What is in `run/`:

| File | What it does |
|---|---|
| `run.bat` | Starts the app against the hosted database |
| `run-local.bat` | Starts local Supabase, then the app against it |
| `stop.bat` | Stops the app and local Supabase |
| `run.sh` | The same three actions for macOS/Linux |
| `run.mjs` | The script the files above call: `node run/run.mjs hosted` (or `local`, or `stop`) |

## Contents
=======
## 3. Course dataset – `course_platform_database.csv`
>>>>>>> f9b5dae9234b7075f0d9c467f05b8774dcdeaa10

### 3.1 Column dictionary

R = required (never empty). Types: `text`, `int`, `num`, `bool`, `date`, `url`, `enum` (see §3.2).

| Column | Type | R | Purpose / rule |
|---|---|---|---|
| course_id | text | R | Stable primary key `CRS-` + 12 hex chars of SHA-1(`data_source` + provider course ID). Re-running the build gives the same ID for the same provider course. |
| course_name | text | R | Title exactly as published by the provider (NPTEL `NOC:` prefix removed). Microsoft partner-led courses append the course code. |
| course_slug | text | R | URL-safe unique slug from the title; collisions get a provider suffix (`-nptel`, `-coursera-2`). |
| course_description | text | | Provider summary, HTML stripped, truncated at a word boundary (≈220–400 chars, ends with `…`). NPTEL has no public summary: a factual description is generated from catalogue metadata (format, discipline, institute, instructor, number of units/lessons) – flagged in `course_source_map.notes`. |
| domain | enum | R | NextStep domain (§3.2), assigned by keyword rules on the title with the provider's own category as fallback. |
| sub_domain | text | R | Provider category (Coursera subdomain, NPTEL discipline, SWAYAM category, Microsoft content type). |
| subject | text | | Provider subject/product/industry tag. |
| skills_taught | text | | Microsoft products covered (from the catalogue). Left empty when the provider does not publish skills. |
| prerequisites | text | | Not published in any source catalogue used – empty. |
| target_audience | text | | Microsoft roles or SWAYAM programme alignment (e.g. `B.A., M.A.`). |
| difficulty_level | enum | | `beginner`, `intermediate`, `advanced`, `mixed` (only Microsoft publishes levels). |
| course_duration / duration_unit | num / enum | | Only when unambiguous: Microsoft minutes/hours, SWAYAM weeks, NPTEL weeks (when the outline is week-based), Coursera workload text when it parses cleanly (ranges are left empty; raw text kept in the source map). Both or neither are filled. |
| estimated_study_hours | num | | Derived only from explicit figures (minutes ÷ 60, or weeks × a single hours-per-week value). |
| learning_mode | enum | | `online_self_paced`, `online_cohort` (scheduled SWAYAM run), `instructor_led`, `hybrid`, `in_person`. |
| course_language | text | | ISO 639-1 codes, `; `-separated when several. NPTEL archive language is not published – empty unless the title states it or the matching SWAYAM run does. |
| course_format | enum | | `video_lectures`, `web_text_modules`, `interactive_modules`, `interactive_coding`, `guided_project` (Coursera page resolves to `/projects/`), `hands_on_lab`, `mixed`. |
| syllabus_or_curriculum_url | url | | Page that lists the curriculum (NPTEL course page, Microsoft path/cert page, freeCodeCamp curriculum). |
| learning_outcomes, practical_projects | text | | Not available from the catalogues used – empty (never invented). |
| course_materials_available | bool | | `true` when materials are openly viewable (NPTEL, Microsoft Learn paths, freeCodeCamp). |
| provider_name | text | R | Platform: `Coursera`, `Microsoft Learn`, `Microsoft` (certifications), `NPTEL`, `SWAYAM`, `freeCodeCamp`. The teaching institution is in `certificate_issuing_organization` and `course_source_map.offering_partner`. |
| provider_type | enum | R | `mooc_platform`, `technology_company`, `university`, `university_consortium`, `government_body`, `nonprofit`, `professional_body`, `training_company`. |
| instructor_name | text | | Instructor names as published by the provider (Coursera instructors API, NPTEL/SWAYAM catalogues). Never inferred. |
| course_url | url | R | Canonical course page (after following Coursera redirects). Unique. |
| enrollment_url | url | | Where to enrol – the current SWAYAM run for NPTEL courses that have one. |
| enrollment_status | enum | | `open`, `closed`, `upcoming`, `archived`. Only SWAYAM publishes this (`openForRegistration`); Microsoft paths and freeCodeCamp are always open. |
| course_start_date / course_end_date | date | | SWAYAM run dates only. |
| self_paced | bool | | |
| batch_availability | text | | Run information (SWAYAM enrolment close date, Microsoft partner scheduling). |
| pricing_type | enum | R | `free`, `paid`, `freemium`, `free_audit`, `subscription`, `financial_aid_available`, `unknown`. Coursera is `unknown` because audit/purchase/Coursera Plus/financial-aid options vary by course and country and were not verified per course. |
| course_fee | num | | `0` for verified-free learning (Microsoft Learn paths, NPTEL, SWAYAM, freeCodeCamp). Empty when the fee is not verified. |
| currency | text | | ISO 4217 – required whenever a fee > 0 (none recorded in this release). |
| free_certificate_available | bool | | `true` for freeCodeCamp certifications; `false` for NPTEL runs (certificate requires the paid proctored exam). |
| financial_aid_available, financial_aid_url, scholarship_available, scholarship_url, accessibility_features | | | Not verified per course – empty. |
| certificate_available | bool | | From the source: Coursera `VerifiedCert`, SWAYAM exam listed, Microsoft certification/credential, freeCodeCamp certification. `false` for Microsoft Learn paths (they award achievements, not certificates). |
| certificate_type | enum | | `certificate_of_completion` (provider-issued), `professional_certification` (requires a separate exam), `skills_credential` (Microsoft Applied Skills assessment), `academic_credit`, `none`. |
| certificate_issuing_organization | text | | Partner + platform (e.g. `Stanford Online; Coursera`), `IIT Madras (NPTEL)`, `Microsoft`. |
| certificate_fee | num | | Only when verified (`0` for freeCodeCamp). |
| examination_available | bool | | |
| examination_type | enum | | `final_exam`, `certification_exam`, `lab_based_assessment`, `quizzes_only`. |
| examination_mode | enum | | `in_person_proctored` (NPTEL), `online_proctored`, `online_unproctored`, `online_or_test_centre`. |
| examination_duration_minutes, passing_percentage, number_of_assessments | num | | Not verified per course – empty. |
| final_project_required | bool | | Coursera capstones; freeCodeCamp certifications whose description requires projects. |
| proctored_exam | bool | | |
| exam_registration_url | url | | Microsoft exam page, SWAYAM run page. |
| relevant_job_roles | text | | Microsoft job roles from the catalogue. |
| career_relevance | text | | Sourced links only: Microsoft certification study-guide membership / exam alignment; Coursera Specialization membership. |
| industry_recognition | text | | Never claimed – empty. |
| accreditation_details | text | | SWAYAM academic credits as listed by SWAYAM. |
| continuing_education_credits | num | | SWAYAM credits. |
| portfolio_value | enum | | `high`/`medium`/`low` – only set where projects are required. |
| course_rating / rating_source / rating_count | num / enum / int | | Only provider-published ratings (Microsoft Learn); never estimated. |
| official_source_url | url | R | Official page the record was verified against. |
| verification_status | enum | R | See §5.1. |
| last_verified_date | date | | Date the URL was link-checked. |
| data_source | enum | R | `coursera_catalog_api`, `microsoft_learn_catalog_api`, `nptel_course_catalog`, `swayam_course_explorer`, `freecodecamp_github_curriculum`. |
| record_created_date / record_updated_date | date | R | |

### 3.2 Domain vocabulary (`domain`)

`computer_science_software_engineering`, `data_analytics_business_intelligence`, `artificial_intelligence_machine_learning`, `generative_ai_data_science`, `cloud_computing_devops`, `cybersecurity_networking`, `web_mobile_development`, `database_sql_data_engineering`, `ui_ux_product_management`, `business_analysis_project_management`, `finance_accounting_banking`, `marketing_digital_marketing`, `human_resources_talent_acquisition`, `communication_english_language`, `entrepreneurship_business_development`, `teaching_education_instructional_design`, `government_competitive_exam_preparation`, `healthcare_administration_allied_health`, `vocational_technical_skills`, `freelancing_remote_work`, `professional_certifications`, `personal_development_workplace_skills`, plus additional domains supported by the sources: `business_management_leadership`, `engineering_core`, `science_mathematics`, `humanities_social_sciences`, `law_legal_studies`, `arts_design_media`, `agriculture_environment_sustainability`, `languages_other`.

Domain is a NextStep classification (not a provider claim). It is rule-based, so a small share of titles will be mis-filed; correct them in the app's admin UI or adjust `RULES` in `build_courses.py`.

## 4. Career guidance datasets

Production (`career_guidance_database.csv`) and sample (`career_guidance_sample_database.csv`) share one schema (exact column order from the brief).

### 4.1 Column dictionary

PII = personal information. **SC** = special-category data (religious affiliation) – never public without explicit, recorded consent.

| Group | Column | Type | R | PII | Notes |
|---|---|---|---|---|---|
| Identity | professional_id | text | R | | `PRO-` + UUID for real profiles; `PRO-SAMPLE-0001…` for samples. |
| | profile_type | enum | R | | `real`, `sample`. |
| | profile_status | enum | R | | `active`, `inactive`, `pending_review`, `suspended`, `withdrawn`, `sample_only`. |
| | full_name, preferred_name | text | R/ | PII | As submitted by the professional. Samples are named `Sample Professional NNNN`. |
| | professional_headline, professional_bio | text | | PII | Written or approved by the professional. |
| | profile_photo_url, public_profile_url, linkedin_url, portfolio_url, personal_website | url | | PII | Only links the professional supplied and agreed to publish. |
| | professional_email, professional_phone | text | | PII | Never public; reveal only via accepted connection requests. |
| | preferred_contact_method | enum | | | `in_platform_request` (default), `email`, `phone`, `linkedin`. |
| Community | community_affiliation_status | enum | R | SC | `self_declared_consented`, `verified`, `pending`, `unknown`, `not_disclosed`, `not_applicable` (samples). Never inferred from name, photo, family, employer or location. |
| | community_affiliation_source | text | | SC | How the affiliation was recorded, e.g. `registration_form_v1 self-declaration`, or the community organisation that confirmed it. |
| | community_organization, community_role, community_city | text | | SC | Shown publicly only when `community_participation_opt_in = true`. |
| | community_participation_opt_in, community_mentorship_opt_in, community_networking_opt_in | bool | | | Separate opt-ins. |
| Professional | current_job_title … languages_spoken | text/num | | PII | Self-reported; `years_of_experience` ≤ `total_career_experience`. `seniority_level`: `student`, `entry_level`, `mid_level`, `senior`, `lead`, `executive`, `founder`. |
| Education | highest_qualification … research_interests | text/int | | PII | `highest_qualification`: `secondary`, `diploma`, `bachelors`, `masters`, `doctorate`, `professional_qualification`. |
| Mentorship | mentorship_available … mentoring_currency | bool/text/num | | | `mentoring_fee_type`: `free`, `paid`, `sliding_scale`; fee numeric + ISO currency when paid. `job_referral_support` must stay `false` unless a written `referral_policy` exists – guidance is never a promise of employment or referral. |
| Location | country, state, city, locality | text | | PII | City/locality only – **never a home address**. |
| | work_location_type | enum | | | `onsite`, `hybrid`, `remote`. |
| | available_time_zone | text | | | IANA zone (e.g. `Asia/Kolkata`). |
| | availability_status | enum | | | `available`, `limited`, `not_available`. |
| Jobs | hiring_status | enum | | | `hiring_verified` (requires `job_application_url` to a live official posting checked on a recorded date), `not_hiring`, `unknown`. |
| | hiring_for_roles … industry_trends_or_advice | text/url | | | Only verified current openings. `referral_policy`: `not_offered`, `case_by_case`, `formal_company_programme`. |
| Platform | connection_request_enabled, messaging_enabled | bool | | | |
| | profile_visibility | enum | R | | `public`, `community_members_only`, `verified_members_only`, `private`, `test_environment_only` (samples). |
| | profile_consent_status | enum | R | | `granted`, `pending`, `withdrawn`, `not_applicable` (samples). |
| | consent_date | date | | | Required when consent is `granted`. |
| | identity_verification_status | enum | R | | `pending`, `verified`, `unverified`, `rejected`. |
| | professional_verification_method | text | | | e.g. `work_email_otp`, `video_call`, `employer_letter`, `community_reference`, `none`. |
| | verification_date, last_profile_updated_date | date | | | |
| | data_source | text | R | | `registration_form_v1`, `community_bulk_submission`, `synthetic_generator_v1`. |
| | source_url | url | | | Public source the professional pointed to, if any. |
| | record_created_date, record_updated_date | date | R | | |
| | additional_notes | text | | | Internal only. |

### 4.2 Sample data rules

- 300 synthetic profiles: 30 professional categories × 10, spanning entry-level to executive, founders, educators, recruiters, tradespeople and freelancers.
- Every sample has `profile_type=sample`, `profile_status=sample_only`, `profile_visibility=test_environment_only`, `community_affiliation_status=not_applicable`, `identity_verification_status=unverified`, `connection_request_enabled=false`, `messaging_enabled=false`, a `[SAMPLE]` headline, a fictional employer `Fictional … (sample)` and the note `SYNTHETIC TEST RECORD`.
- No email, phone, LinkedIn, photo or website is filled for samples (validated). Cities are real places so location filters can be tested; nothing else refers to real people or organisations.
- Load samples **only** into development/staging databases, or into a separate `professionals_sample` table. The `chk_sample_hidden` constraint and the `professionals_public_directory` view keep them out of public results even if loaded by mistake.

## 5. Verification

### 5.1 Courses

| `verification_status` | Meaning | Count |
|---|---|---|
| `verified` | Record built from the provider's official catalogue/API **and** its `course_url` returned HTTP 200 on `last_verified_date` (Coursera redirects followed; 404 control URLs confirmed each host returns 404 for missing pages) | 8,872 |
| `source_listed` | Built from the official catalogue but the individual URL was not link-checked (1,014 SWAYAM runs; a 75-URL sample from the same host all returned 200) | 1,014 |
| `unverified` | Link check could not complete (network error) | 1 |
| `broken_link` | URL returned 4xx/5xx – these 23 rows were removed and listed in `excluded_broken_links.csv` | 0 |

A URL is never marked verified because it matches a pattern. Fees, durations, ratings and instructors come only from the provider sources listed in §9.

### 5.2 Professionals – three independent checks

1. **Identity** (`identity_verification_status`, `professional_verification_method`, `verification_date`): the person is who they say they are – e.g. video call with a community coordinator, or OTP to a work email.
2. **Professional credentials**: job title/employer/qualifications checked against a document, work email domain or a public professional page the person controls. Record the method in `professional_verification_method`; leave unverified claims as self-reported in the bio.
3. **Community affiliation**: recorded **only** from the person's own explicit declaration on the consent form (`self_declared_consented`) or confirmation by a named community organisation with the person's permission (`verified`). Otherwise `unknown`, `pending` or `not_disclosed`.

A profile reaches `profile_status=active` only when identity is `verified` and consent is `granted`.

## 6. Why the production career file is empty

No real professionals have registered or consented yet, and the brief forbids scraping profiles, inferring religious identity, or fabricating real people. The production file is therefore delivered with headers only and must be populated through an opt-in registration form. Recommended intake:

1. Registration form collecting the fields in §4.1, with separate tick-boxes for: (a) publishing the profile, (b) displaying community affiliation, (c) mentorship listing, (d) sharing contact details with accepted connections.
2. Store the consent text version, timestamp (`consent_date`) and IP/session reference in a separate `consent_log` table.
3. Verification call or work-email OTP → set identity status and date.
4. Admin review → `profile_status=active`.

## 7. Consent – recording and revocation

- **Record**: `profile_consent_status=granted` + `consent_date`; keep the signed form version in `consent_log`. Community affiliation needs its own explicit opt-in (special-category data under India's DPDP Act 2023 and GDPR Art. 9 for EU/UK residents).
- **Partial withdrawal** (e.g. stop showing affiliation): clear the community fields, set the matching opt-in to `false`, update `record_updated_date`.
- **Full withdrawal**: set `profile_consent_status=withdrawn`, `profile_status=withdrawn`, `profile_visibility=private` immediately (removes the profile from `professionals_public_directory`), then delete or anonymise personal fields within the retention period set by the community's privacy policy (suggested ≤ 30 days). Keep only `professional_id`, dates and the withdrawal event in `consent_log`.
- Re-confirm consent annually; set `pending` and hide the profile if not re-confirmed.

## 8. Updating the datasets

- **Courses**: re-run the exports (Coursera `api.coursera.org/api/courses.v1`, Microsoft `learn.microsoft.com/api/catalog`, NPTEL `nptel.ac.in/courses/__data.json`, SWAYAM explorer GraphQL, freeCodeCamp curriculum on GitHub), then `python3 scripts/build_courses.py && python3 scripts/validate.py`. IDs are deterministic, so upserts on `course_id` update existing rows. Suggested cadence: monthly for SWAYAM (runs change each semester), quarterly for others. Re-link-check before each release and drop or flag 404s.
- **Retired content**: Microsoft certifications whose catalogue summary says “retired” are excluded (64 removed); repeat this check each refresh.
- **Professionals**: changes only through the profile owner or an admin acting on their written request; every change updates `record_updated_date` and `last_profile_updated_date`.

## 9. Import

### PostgreSQL (tested on PostgreSQL 16 – all files load with constraints enabled)

```bash
psql -d nextstep -f schema.sql
psql -d nextstep -c "\copy courses from 'course_platform_database.csv' csv header"
psql -d nextstep -c "\copy course_source_map from 'course_source_map.csv' csv header"
psql -d nextstep -c "\copy professionals from 'career_guidance_database.csv' csv header"
# development / staging only:
psql -d nextstep_dev -c "\copy professionals from 'career_guidance_sample_database.csv' csv header"
```

Empty fields load as `NULL`. Upserts: load into a staging table, then `INSERT … ON CONFLICT (course_id) DO UPDATE`.

### MongoDB

```bash
mongoimport --db nextstep --collection courses --type csv --headerline --ignoreBlanks --file course_platform_database.csv
```
Convert `true`/`false` strings and `"; "` lists in a post-import script (or use `--columnsHaveTypes` with a typed header).

### Node / Prisma / Sequelize

Parse with `csv-parse` (`{columns: true, skip_empty_lines: true}`), map `''` → `null`, `'true'/'false'` → boolean, split list fields on `"; "`, and `createMany` in batches of 500. Public pages must query `professionals_public_directory` (or an equivalent ORM scope filtering `profile_type='real' AND profile_status='active' AND profile_consent_status='granted' AND identity_verification_status='verified'`).

## 10. Sources and known limitations

| Source | Records | Notes |
|---|---|---|
| Coursera public catalog API + instructors/partners APIs | 4,150 | Stratified sample of the 24,705-course catalogue (≈13% per subdomain, min 60; English/Arabic/Hindi/Urdu preferred); 23 courses with 404 pages removed |
| Microsoft Learn Catalog API | 1,054 | 821 learning paths, 108 courses, 88 current certifications, 37 Applied Skills credentials |
| NPTEL course catalogue | 3,484 | Every course page confirmed via its outline endpoint; 1,031 enriched with the current SWAYAM-NPTEL run |
| SWAYAM course explorer | 1,107 | Current runs from AICTE, CEC, IGNOU, IIMB, INI, NCERT, NIOS, NITTTR, UGC and unmatched NPTEL runs; repeated runs collapsed |
| freeCodeCamp curriculum (GitHub) | 92 | Superblocks whose page returned 200 |

<<<<<<< HEAD
If a required variable is missing, the app stops with an error naming it (see `src/lib/env.ts`).

## 8. Using the app for the first time

1. Open http://localhost:3000. The landing page shows the three sections.
2. Click **Sign in** and use phone, email or Google.
   - Local: read the email code in Mailpit (http://127.0.0.1:54324).
   - Hosted with test phone numbers: enter the fixed code you configured.
3. **Onboarding:** enter your full name, gender, city and phone number (+91), then choose what you're here for: *Find a job*, *Hire*, *Mentor others*, *Relocating*, *Help newcomers*, *List a flat/room*.
4. Your roles are set from those choices. Mentor and buddy roles stay **pending verification** until an admin approves them.
5. You land on **/home**, your dashboard, with navigation for each section.

> Gender can only be set once, during onboarding. It's used as a hard filter in matching, so changing it needs an admin.

### Community Portal (jobs)

| I want to… | Where |
|---|---|
| Browse and search jobs (no sign-in needed) | `/jobs`, with filters for city, job type, work mode, level, salary, date posted, LEAP-friendly and "near me" |
| Build my job profile and upload a CV (PDF, up to 5 MB) | `/profile` |
| Apply to a job | open the job → **Apply** |
| Track my applications, pick an interview time, withdraw | `/applications` |
| Save jobs and searches | `/saved` |
| Refer someone to a job where I work | `/referrals` (say where you work, then share the link it gives you) |
| Register a company and post jobs | `/employer` |
| Review applicants, move them through stages, view CVs, add notes, propose interview times | `/employer` → **View applicants** |
| Approve companies and first job posts (admins) | `/admin` |

How a job goes live:

1. The employer registers a company at `/employer`. It starts as **waiting for verification**.
2. An admin approves it at `/admin/verification`.
3. The employer publishes a job. A company's **first** job goes to `/admin/jobs` for review; later jobs go live straight away.

Salaries are entered in lakh per year. Employers can hide a salary; hidden salaries are not readable by anyone outside the company.

**Sample data:** `supabase/sample-data/` adds six fake companies and 16 fake jobs in Mumbai, Bengaluru and Hyderabad, all marked "(Sample)". It is loaded locally by `pnpm exec supabase db reset`, and has been loaded once into the hosted dev project. See `supabase/sample-data/README.md` for how to reload or remove it.

## 9. Make yourself an admin

Users can never give themselves the admin role. To create the first admin:

1. Sign up in the app as usual.
2. Run this SQL. Locally, use Studio (http://127.0.0.1:54323) → SQL Editor; on a hosted project, use Dashboard → SQL Editor. Replace the email:

   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'you@example.com';
   ```

   If you signed up with a phone number, use `where phone = '919000000001'` instead.
3. Refresh the app, then open **/admin**.

After that, an existing admin can grant the admin role to other users. The database allows it, and the admin panel UI for it comes in a later phase. For now `/admin` has two queues: verification requests and jobs waiting for review.

## 10. Running tests and checks

Run these before every commit:

```bash
pnpm lint        # ESLint
pnpm typecheck   # route types + TypeScript
pnpm test        # Vitest unit tests
```

### End-to-end tests (Playwright)

Playwright starts `pnpm dev` itself (or reuses one that's already running) and tests at a 375 px mobile width and at desktop width.

```bash
pnpm exec playwright install   # first time only: download browsers
pnpm test:e2e
```

### Database / RLS tests (pgTAP)

These need Docker Desktop and run against the local stack:

```bash
pnpm exec supabase start
pnpm exec supabase db reset    # rebuild from migrations (also checks they're reproducible)
pnpm test:db                   # runs supabase/tests/*.sql
```

The tests check that Row Level Security works: owners can reach their own rows, other users can't, and admins can.

### Production build

```bash
pnpm build
pnpm start       # serve the build at http://localhost:3000
```

## 11. All commands

| Command | What it does |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Dev server at http://localhost:3000 |
| `pnpm dev:hosted` / `run/run.bat` | Same, but first stops any old dev server and frees port 3000 |
| `pnpm dev:local` / `run/run-local.bat` | Starts local Supabase and runs the app against it |
| `pnpm dev:stop` / `run/stop.bat` | Stops the dev server and local Supabase |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Generate route types and run `tsc --noEmit` |
| `pnpm test` | Unit tests (Vitest), run once |
| `pnpm test:watch` | Unit tests in watch mode |
| `pnpm test:e2e` | End-to-end tests (Playwright) |
| `pnpm test:db` | Database / RLS tests (pgTAP, local stack) |
| `pnpm exec supabase start` | Start local Supabase (Docker) |
| `pnpm exec supabase status` | Show local URLs and keys |
| `pnpm exec supabase db reset` | Rebuild the local DB from migrations and the seed |
| `pnpm exec supabase stop` | Stop local Supabase |

## 12. Project structure

```
.
├── src/
│   ├── app/                  # Next.js routes (App Router)
│   │   ├── (public)/         # landing page and public pages
│   │   ├── (auth)/           # sign-in, auth callback, onboarding
│   │   ├── (dashboard)/      # /home and section pages
│   │   └── admin/            # admin panel
│   ├── features/             # one folder per module
│   │   ├── auth/             #   each has components/, actions.ts (server actions),
│   │   ├── profiles/         #   queries.ts (data fetching), schemas.ts (Zod), types.ts
│   │   ├── jobs/             #   search, job detail, apply, applications, saved, referrals
│   │   ├── employer/         #   company profile, job posting, applicant pipeline
│   │   ├── admin/            #   verification and job review queues
│   │   └── safety/           #   report & block
│   ├── components/ui/        # shadcn/ui primitives
│   ├── components/shared/    # shared app components
│   ├── lib/
│   │   ├── supabase/         # server, browser and middleware Supabase clients
│   │   ├── sections.ts       # the three sections and their nav items
│   │   └── env.ts            # validated environment variables
│   ├── proxy.ts              # Next.js 16 middleware (session refresh)
│   └── types/database.ts     # generated DB types, do not edit by hand
├── supabase/
│   ├── migrations/           # every schema change, timestamped
│   ├── tests/                # pgTAP RLS tests
│   ├── sample-data/          # fake sample companies and jobs
│   └── config.toml           # local stack config
├── tests/e2e/                # Playwright tests
├── run/                      # one-click launchers (run.bat, run-local.bat, stop.bat, run.sh)
└── docs/                     # spec, decisions, setup, build prompts
```

## 13. Working on the database

- **Every schema change is a migration** in `supabase/migrations/`, named `YYYYMMDDHHMMSS_short_description.sql`. The repo is the source of truth.
- Create one with `pnpm exec supabase migration new <name>`, write the SQL, then run `pnpm exec supabase db reset` to apply it locally.
- **RLS is required on every table**, with policies per operation and SQL tests in `supabase/tests/`.
- Security-definer functions live in the `private` schema, with thin `public` wrappers (see D-022 in `docs/DECISIONS.md`).
- After a schema change, **regenerate the types**:
  ```bash
  pnpm exec supabase gen types typescript --local > src/types/database.ts
  ```
- Seed data must be clearly fake (fake names, phone numbers like `+910000000001`).
- Never drop tables or columns, or delete data, without the project owner's approval.

Full rules: [CLAUDE.md §3](CLAUDE.md).

## 14. Deploying

Production uses a **separate** Supabase project, built from the migrations. Never point production at the dev project.

1. Create a new Supabase project, then `supabase link` and `supabase db push` (see 6.1).
2. Configure Auth as in 6.3, using your production domain for the Site URL, redirect URLs and Google origins.
3. Deploy the Next.js app, for example to [Vercel](https://vercel.com): import the repo and add the environment variables from section 7, with `NEXT_PUBLIC_SITE_URL` set to your domain.
4. Keep `SUPABASE_SERVICE_ROLE_KEY` as a server-only secret.

## 15. Troubleshooting

| Problem | Fix |
|---|---|
| Nothing at http://localhost:3000, or `Another next dev server is already running` | An old dev server of this project is still running (maybe on another port). Run `pnpm dev:stop` (or `run/stop.bat`), then start again with `pnpm dev:hosted` / `run/run.bat`. |
| `Missing environment variable NEXT_PUBLIC_SUPABASE_URL` | `.env.local` is missing or empty. Copy `.env.example` and fill it in, then restart `pnpm dev`. |
| `supabase start` fails or hangs | Make sure Docker Desktop is running. Then try `pnpm exec supabase stop --no-backup` and start again. |
| Port 54321/54322/54323 already in use | Another Supabase stack is running. Stop it with `pnpm exec supabase stop --project-id <id>`, or change the ports in `supabase/config.toml`. |
| No sign-in email arrives (local) | Emails aren't really sent locally. Open Mailpit at http://127.0.0.1:54324. |
| No sign-in email arrives (hosted) | The built-in email limit was hit. Set custom SMTP (6.3 b) or wait an hour. |
| The magic link goes to the wrong page or errors | Check that the Site URL and redirect URLs include `http://localhost:3000/**`, and that the email template uses `/auth/callback?token_hash=...`. |
| The OTP field won't accept the code | Set Email OTP length to 6 in the dashboard. |
| Google sign-in shows `redirect_uri_mismatch` | The Google redirect URI must be exactly `https://<project-ref>.supabase.co/auth/v1/callback`. |
| Type errors after pulling | Run `pnpm install` again, then `pnpm typecheck`. If the schema changed, regenerate `src/types/database.ts`. |
| Playwright says browsers are missing | `pnpm exec playwright install` |
| Windows: `cp` not found | Use `Copy-Item .env.example .env.local` in PowerShell, or use Git Bash. |

## 16. Docs and conventions

- [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md): roles, modules, features, MVP scope
- [docs/DECISIONS.md](docs/DECISIONS.md): architecture decision log (D-001 onwards)
- [docs/SETUP.md](docs/SETUP.md): setup notes, including Claude Code and Supabase MCP
- [docs/PROMPTS.md](docs/PROMPTS.md): phase-by-phase build prompts
- [CLAUDE.md](CLAUDE.md): coding conventions, security rules, definition of done

**Main rules:**
- TypeScript strict, no `any`. Server Components by default.
- Every input is validated with Zod on the server.
- Server actions return `{ ok: true, data } | { ok: false, error }`.
- Every page handles loading, empty and error states, and works at 375 px wide.
- Commit messages follow `type(scope): message`, e.g. `feat(jobs): add application pipeline board`.

**Security:**
- RLS is on for every table, and role and ownership checks happen on the server.
- Phone numbers and emails are never public.
- Flat locations are shown only approximately until the lister accepts a contact request.
- CVs are in a private bucket and shared only through short-lived signed URLs.
=======
Limitations:
- **Not covered**: edX, FutureLearn, Udemy, Kaggle Learn, AWS Skill Builder, Cisco NetAcad, IBM SkillsBuild, Trailhead, HubSpot, Google Skills, Simplilearn, Infosys Springboard, Alison and professional bodies (PMI, CompTIA, ISC2…). Their catalogues were not reachable from the build environment or permission requests for them went unanswered. They are the priority for the next release.
- **Thin domains**: government/competitive-exam preparation (16), freelancing (5), vocational trades (28) and HR (42) – the sources used publish few such courses.
- **Coursera pricing, levels, ratings and skills** were not verified per course and are left empty/`unknown`.
- **Fees** for exams/certificates vary by country and run and are never recorded as numbers in this release.
- **Domain labels** are rule-based NextStep classifications.
- **NPTEL** keeps separate course IDs for some re-recorded or web/video versions of the same title (65 groups); they are kept as distinct records because they are distinct resources.
- **Career guidance**: zero verified professionals – production rollout depends on the opt-in registration flow in §6.
>>>>>>> f9b5dae9234b7075f0d9c467f05b8774dcdeaa10
