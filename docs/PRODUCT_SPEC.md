# NextStep — Product Specification

> "NextStep: Learn. Earn. Grow."

## 1. Vision

NextStep helps members of the Shia Muslim community take their next step in their careers: finding jobs, growing skills through mentorship and LEAP programs, and settling comfortably into a new city when work takes them there, close to community, masjids, and imambargahs.

### 1.1 Feature sections

The website presents the modules in three user-facing sections. These names appear in the main navigation, landing page sections and page titles. The module structure below (§4–§8) is unchanged.

| Section | Modules | Covers |
|---|---|---|
| **Community Portal** | Module 1 — Jobs (§4) | Job board, employers and company profiles, applications, applicant pipeline, referrals |
| **Career Development** | Module 2 — LEAP (§5), Module 3 — Mentorship (§6) | LEAP programs, enrollments and badges; mentor profiles, booking and feedback |
| **Location Gathering** | Module 4 — Settle In (§7), Module 5 — Places (§8) | Relocation requests, buddies, flats, flatmates, chat, masjid/imambargah map, area guides |

Notifications (§9), account settings and the admin panel (§10) sit outside the three sections.

## 2. Users & roles

A user signs up once and can hold **multiple roles**. Role-specific features unlock after onboarding (and, for some roles, admin verification).

| Role | Who | Needs verification? | Key capabilities |
|---|---|---|---|
| **Job Seeker** | Students, graduates, professionals | No (phone/email verified) | Profile, CV, apply to jobs, book mentors, enroll in LEAP, request relocation help, find flats/flatmates |
| **Employer** | Companies, community business owners, HR staff | Yes (admin approves company) | Company profile, post jobs, manage applicants, schedule interviews |
| **Mentor** | Experienced professionals | Yes | Mentor profile, availability, run sessions, give feedback |
| **Settle-In Buddy** | Community members living in a city | Yes | Respond to relocation requests, chat with newcomers, contribute area tips |
| **Flat Lister** | Anyone offering a flat/room | Phone verified to post; ID badge optional via admin | Post flat/room listings, accept contact requests |
| **Admin** | Platform team | — | Verify users, moderate content, manage LEAP, masjid directory, area guides, analytics |

## 3. Onboarding

1. Sign up with **phone OTP**, **email OTP/magic link**, or **Google**.
2. Basic profile: full name, gender, city, phone (if not used to sign up), profile photo (optional).
3. Choose what you're here for (multi-select): *Find a job*, *Hire*, *Mentor others*, *Relocating to a new city*, *Help newcomers in my city*, *List a flat/room*.
4. Role-specific onboarding steps for each selection.
5. Roles needing verification go to an admin queue; user sees "pending verification" status.

## 4. Module 1 — Jobs

### Job seeker
- **Profile:** headline, summary, skills (tags), experience entries, education entries, languages, preferred cities, remote/onsite preference, expected salary range (private by default), portfolio/LinkedIn links.
- **CV upload:** PDF only, max 5 MB, private bucket.
- **Job search:** keyword search + filters: city, distance from a point, job type (full-time, part-time, contract, internship), work mode (onsite, hybrid, remote), experience level, salary range, posted date, "LEAP-friendly" employers.
- **Job detail page:** description, requirements, salary (if disclosed), company info, location map, apply button, "Relocating for this job? Get help settling in" link.
- **Apply:** choose CV, optional cover note, answer employer screening questions (optional).
- **My applications:** status tracking with history.
- **Saved jobs** and **job alerts** (saved search → daily email/WhatsApp digest).
- **Recommended jobs:** match on skills, preferred cities, and experience level.

### Employer
- **Company profile:** name, logo, industry, size, website, description, locations. Requires admin verification before jobs go live.
- **Post a job:** title, description, requirements, skills, job type, work mode, location (map pin), salary range (+ show/hide), openings count, application deadline, screening questions.
- **Job states:** draft → pending review (first job per company) → published → closed / expired.
- **Applicant pipeline board:** Applied → Shortlisted → Interview → Offer → Hired / Rejected. Drag-and-drop or status dropdown. Private notes per applicant.
- **View CV** via signed URL only.
- **Interview scheduling:** propose time slots; candidate picks one; both notified.
- Multiple team members per company (owner invites recruiters) — *post-MVP*.

### Community referrals
- Any verified member can mark themselves as "works at Company X" and **refer** a seeker to an open job there. Referred applications are flagged to the employer.

## 5. Module 2 — LEAP integration

LEAP is an existing community career initiative. For now, LEAP content is **admin-managed** inside NextStep. Wrap all LEAP access in a service layer (`features/leap/service.ts`) so it can later be swapped for an external LEAP API.

**What LEAP is (from the LEAP team, 2026-10-04):** a four-stage journey, **L**earn → **E**ngage → **A**pply → **P**rogress. Example: the portal directs a member to a 4-week "LEAP Python Sprint" (**Learn**), pairs them with a senior engineer from a partner company for weekly advice (**Engage**), has them build a live API project (**Apply**), and guarantees an interview with hiring partners on completion (**Progress**). Phase 3 must model a program as these four stages: learning content/sprint, mentor pairing (ties into Module 3), a project submission, and a guaranteed interview with partner employers (ties into Module 1; "LEAP-friendly" companies are the hiring partners).

- **Programs:** title, description, type (workshop, training course, internship, cohort), mode (online/in-person), city, start/end dates, capacity, eligibility, status.
- **Enrollment:** apply/enroll, waitlist when full, admin approves if required.
- **Completion:** admin marks completion → user gets a **LEAP badge** on their profile.
- **Employers** can filter applicants by LEAP badges and see a "LEAP certified" highlight.
- **Program pages** are public; enrollment requires sign-in.

## 6. Module 3 — Mentorship & career development

- **Mentor profile:** headline, industries, expertise tags, years of experience, languages, city, session types offered, short bio, availability.
- **Session types:** career guidance, CV review, mock interview, skill roadmap, industry Q&A. Default 30 or 60 minutes.
- **Availability:** weekly recurring slots + one-off exceptions; time-zone aware.
- **Booking flow:** seeker picks mentor → session type → slot → adds a short note/goal → mentor accepts or declines → confirmed session gets a video link (mentor pastes Google Meet/Zoom link, or auto-generated *post-MVP*).
- **Limits:** a seeker can hold at most 2 upcoming sessions at a time (prevent hoarding).
- **After session:** both sides leave feedback; seeker rates mentor (1–5) with optional comment; mentor can add private notes and recommended next steps.
- **Events:** admins/mentors create webinars, networking meetups, career fairs with RSVP — *post-MVP if time is short*.

## 7. Module 4 — Settle In (relocation)

Helps someone moving to a new city for work find housing, local knowledge, and community.

### 7.1 Relocation request
A user creates a request:
- Destination city and preferred neighbourhoods (optional)
- Move date (or range)
- Workplace location (map pin or address) — optional but enables commute filters
- Monthly budget range
- Household: alone / with family / looking for flatmates
- Needs (multi-select): *flat*, *flatmate*, *area guidance*, *nearby masjid/imambargah*, *halal food guidance*, *airport/station pickup*, *temporary stay*, *general advice*
- Short note
- Visibility: verified buddies in that city only (default)

### 7.2 Settle-In Buddies
- Verified buddies see open requests in their city (no phone/email shown).
- A buddy can **offer help**; the requester accepts offers they want → opens a chat.
- Buddies can add **area tips** to neighbourhood guides.
- Requester rates the buddy after the request is closed.
- Gender preference: requester can choose "only buddies of my gender".

### 7.3 Flats & rooms
- **Listing fields:** type (entire flat, private room, shared room, PG/hostel), city, neighbourhood, rent, deposit, furnishing, available from, minimum stay, bedrooms/bathrooms, amenities, food preferences in the home, gender preference for tenants (any / male / female / family), photos (up to 10), description.
- **Exact address & pin** stored privately; **approximate location** shown publicly.
- **Contact request:** interested user sends a request with a short intro → lister accepts → chat opens and exact address becomes visible to that user.
- **Listing states:** active, paused, rented, expired (auto-expire after 30 days unless renewed).

### 7.4 Flatmate matching
- User creates a **flatmate profile:** city, areas, budget, move date, gender, preferred flatmate gender, food habits (veg/non-veg/halal-only), smoking, sleep schedule, work schedule, cleanliness, guests policy, short bio.
- **Match list** sorted by compatibility score (shared city/areas, overlapping budget and dates, matching preferences). Hard filters: gender preference both ways, city.
- Send a **connect request** → accepted → chat opens.

### 7.5 Chat
- 1:1 conversations created only through accepted offers/requests (no cold messaging).
- Text messages + image attachments.
- Real-time via Supabase Realtime; unread counts; push/email notification if offline.
- Report message / block user from any conversation.

## 8. Module 5 — Places & area guides

### 8.1 Places directory
- **Place types:** Shia masjid, imambargah, community center, Islamic school/madrassa, halal restaurant, halal grocery, hospital/clinic, transit station.
- **Fields:** name, type, address, location point, city, neighbourhood, contact (public for institutions), timings (e.g. prayer/majlis timings as free text), photos, verified flag, notes.
- **Admin-managed and verified.** Users can **suggest** a new place or a correction → goes to admin queue.

### 8.2 Area guides (per neighbourhood)
- Summary written by admins/buddies.
- Nearby masjids/imambargahs (auto from places directory).
- Typical rent ranges, commute notes, safety notes, halal food availability.
- Community tips (short posts by verified members, upvotable, moderated).

### 8.3 Map & geo search
- One map showing: flats (approximate), masjids/imambargahs, other places, and the user's workplace pin.
- **Key filter:** "Show flats within **X km of a masjid/imambargah** and within **Y km of my workplace**."
- Additional filters: rent range, listing type, gender preference.
- Results list synced with the map.
- Implemented with PostGIS (`ST_DWithin`, `ST_Distance`) in RPC functions.

## 9. Module 6 — Notifications

- In-app notification centre (bell icon, unread count, realtime).
- Email for important events.
- WhatsApp (via WhatsApp Business API in an Edge Function) for: application status changes, session confirmations, accepted contact requests, daily job alerts — *configurable per user; WhatsApp is post-MVP if API access isn't ready*.
- Per-user notification preferences.

## 10. Module 7 — Admin panel

- **Verification queue:** employers, mentors, buddies, flat-lister ID badges. Approve / reject with reason.
- **Moderation queue:** reported users, jobs, listings, reviews, tips, messages. Actions: dismiss, hide content, warn user, suspend user.
- **Places directory management:** add/edit/verify places; review user suggestions.
- **Area guides management.**
- **LEAP management:** programs, enrollments, completions.
- **Analytics dashboard:** signups by role, jobs posted, applications, hires, mentorship sessions, relocation requests opened/closed, active listings, per-city breakdown.
- **Audit log** of all admin actions.

## 11. Trust & safety summary

- Phone/email verified accounts only.
- ID-verified badges for employers, mentors, buddies (and optionally flat listers).
- No public phone numbers/emails; contact only through accepted requests.
- Approximate flat locations until consent.
- Gender preference respected in flatmate matching, buddy matching, and listing visibility.
- Report and block everywhere.
- Rate limits on messages, requests, and OTPs.
- Admin audit log.

## 12. MVP scope

**In MVP**
1. Auth (phone OTP, email, Google), onboarding, multi-role profiles
2. Jobs: company profiles, posting, search & filters, applications, pipeline, saved jobs
3. Mentorship: mentor profiles, availability, booking, feedback
4. LEAP: programs, enrollment, completion badges
5. Settle In: relocation requests, buddy offers, flat listings, contact requests, flatmate profiles & matching, real-time chat
6. Places directory + map + "near masjid and workplace" geo filter
7. Admin: verification, moderation, places management, basic analytics
8. In-app + email notifications

**Post-MVP**
- WhatsApp notifications and job-alert digests over WhatsApp
- Events / webinars / career fairs
- Employer team accounts
- Auto-generated video links
- Urdu/Hindi translations
- External LEAP API integration
- Mobile app (PWA first)

## 13. Non-goals (for now)

- Payments of any kind (rent, mentorship fees, job posting fees)
- Background checks
- Public social feed
- Native mobile apps

## 14. Open questions (resolve with the product owner)

- Which cities to launch with (needed for seed data and area guides)?
- Currency/country: single country at launch or multi-country?
- Should employers outside the community be allowed to post jobs?
- Who approves LEAP enrollments: LEAP team via NextStep admin, or automatic?
- WhatsApp Business API: do we already have an account?
