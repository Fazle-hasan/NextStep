# NextStep — Setup Guide

## Prerequisites
- Node.js 20+ and pnpm (`npm install -g pnpm`)
- Claude Code installed and signed in
- Supabase project: `zmvdkzphpjjcwwrnniuu` (dev)

## 1. Put the starter files in place
Copy these into your project root:

```
CLAUDE.md
.mcp.json
.env.example
.claude/settings.json
docs/PRODUCT_SPEC.md
docs/DECISIONS.md
docs/PROMPTS.md
docs/SETUP.md
```

## 2. Environment variables
```bash
cp .env.example .env.local
```
Fill in from the Supabase dashboard → **Project Settings → API Keys**:
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the anon / publishable key
- `SUPABASE_SERVICE_ROLE_KEY` — the service role / secret key (server-only, never share)

Mapbox token from mapbox.com → Account → Tokens.

Confirm `.env.local` is in `.gitignore`.

## 3. Connect Supabase MCP
`.mcp.json` already configures the server. If you added it with the CLI, you're set.
```bash
claude
```
Inside Claude Code: `/mcp` → select **supabase** → **Authenticate** → approve in the browser.

Check it: paste prompt **0. Connection check** from `docs/PROMPTS.md`.

## 4. Manual Supabase dashboard config (Phase 1)
Dashboard for the dev project: https://supabase.com/dashboard/project/zmvdkzphpjjcwwrnniuu

**a. URL configuration** (Authentication → URL Configuration)
- Site URL: `http://localhost:3000`
- Redirect URLs: add `http://localhost:3000/**` (and later your preview/production URLs, e.g. `https://*.vercel.app/**`).
- The app sends users back to `/auth/callback`, which handles Google and magic links.

**b. Email** (Authentication → Sign In / Providers → Email) — see D-044
- Enable Email. **Confirm email** (Authentication → Sign In / Providers → User Signups) is **off on the hosted dev project** (D-045): sign-up creates the account and logs the person in without sending an email, because Supabase's built-in email sender allows only a few emails an hour. Turn it back on once custom SMTP is set up, before real users join.
- Minimum password length **8** and **Leaked password protection** on (Authentication → Policies / Settings).
- The default email templates (links only) work: the app finishes every link at `/auth/callback`, and links that land on
  the home page are forwarded there too. Optionally add the 6-digit code to the **Magic Link** template; the log-in page
  offers a "Got a 6-digit code instead?" box:
  ```html
  <p><a href="{{ .ConfirmationURL }}">Log in to NextStep</a></p>
  <p>Or enter this code: <strong>{{ .Token }}</strong></p>
  ```
  The local stack uses `supabase/templates/magic_link.html`.
- Built-in SMTP is limited to a few emails per hour. For real testing set custom SMTP (Authentication → Emails → SMTP Settings), e.g. Resend's SMTP (`smtp.resend.com`, user `resend`, password = API key).
- Set the Email OTP length to **6** (Authentication → Sign In / Providers → Email → Email OTP length) — the UI expects 6 digits.

**c. Phone / SMS** (Authentication → Sign In / Providers → Phone)
- Enable Phone and pick an SMS provider (Twilio, Twilio Verify, MessageBird, Vonage or Textlocal). For India, Twilio Verify or Textlocal; note Indian DLT registration may be required for production SMS.
- Enter the provider's credentials (e.g. Twilio Account SID, Auth Token, Message Service SID).
- For development without SMS cost: add **test phone numbers** with fixed OTPs in the same screen (e.g. `919000000001=123456`). Use fake numbers only.

**d. Google** (Authentication → Sign In / Providers → Google)
1. Google Cloud Console → APIs & Services → OAuth consent screen: set up (External, app name "NextStep", your support email).
2. Credentials → Create credentials → OAuth client ID → **Web application**.
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URI: `https://zmvdkzphpjjcwwrnniuu.supabase.co/auth/v1/callback`
3. Paste the Client ID and Client Secret into the Supabase Google provider and enable it.

**e. Rate limits** (Authentication → Rate Limits): keep OTP/SMS limits low (e.g. 30 SMS/hour project-wide) and consider enabling CAPTCHA (Authentication → Attack Protection) before launch.

**f. First admin**: sign up in the app, then in the SQL editor run (replace the email):
```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'you@example.com';
```
Admins can grant admin to others afterwards; users can never self-assign it.

**g. Env vars**: `.env.local` needs `NEXT_PUBLIC_SUPABASE_URL` and either `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 4b. Local database tests
Requires Docker Desktop running.
```bash
pnpm exec supabase start      # first run pulls images
pnpm exec supabase db reset   # rebuilds local DB from supabase/migrations (reproducibility check)
pnpm test:db                  # pgTAP RLS tests in supabase/tests
```

## 5. Build
Follow `docs/PROMPTS.md` in order: kickoff (plan mode) → Phase 1 → … → Phase 7.
Run `/clear` between phases.

## 6. Run locally
```bash
pnpm install
pnpm dev
```
Open http://localhost:3000

## Safety reminders
- The dev project is for development only. No real user data.
- Never paste the service role key into chats or prompts.
- Production will be a **separate** Supabase project, deployed from `supabase/migrations/`, and never connected to MCP with write access.

## Edge Functions and scheduled jobs (Phase 6)

In-app notifications work without this. Emails, the daily job-alert digest and blocking a suspended user's
sign-in need the three Edge Functions in `supabase/functions/`.

1. Log the Supabase CLI in and link the project (once):
   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref zmvdkzphpjjcwwrnniuu
   ```
2. Set the function secrets (pick a long random value for `CRON_SECRET`; never commit these):
   ```bash
   pnpm exec supabase secrets set CRON_SECRET=<random-string> SITE_URL=<https://your-site> \
     RESEND_API_KEY=<resend key> EMAIL_FROM="NextStep <no-reply@your-verified-domain>"
   ```
   Without `RESEND_API_KEY` and `EMAIL_FROM`, pending emails are marked as failed and nothing is sent.
3. Deploy the functions:
   ```bash
   pnpm exec supabase functions deploy dispatch-notifications job-alert-digest admin-user-action
   ```
4. Tell the database where the functions are. In the dashboard → SQL Editor, run (same `CRON_SECRET` as above):
   ```sql
   select vault.create_secret('https://zmvdkzphpjjcwwrnniuu.supabase.co/functions/v1', 'edge_functions_url');
   select vault.create_secret('<random-string>', 'cron_secret');
   ```
   Until both secrets exist, the two cron jobs that call the functions do nothing.
5. Check: dashboard → Edge Functions → `dispatch-notifications` → Logs should show a call every minute.

## Making someone an admin

There is no screen for this on purpose: the admin role can never be self-assigned (D-014), and NextStep has no
passwords (sign-in is a one-time code by phone or email, or Google). To make someone an admin:

1. They sign in once and finish onboarding, so their account exists.
2. In the Supabase dashboard → SQL Editor, run (replace the email):
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where lower(email) = lower('person@example.com')
   on conflict (user_id, role) do nothing;
   ```
3. They sign out and in again (or reload); "Admin panel" appears in their account menu and `/admin` opens.

Hosted dev project: the account `fazlehasan110@gmail.com` was made admin on 2026-10-04 at the project owner's request.

## Turning on Google sign-in

Google is switched off on the hosted project, so the sign-in page hides the Google button (D-043). To turn it on:

1. Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.
   - Authorised JavaScript origins: `http://localhost:3000` (and your live site later).
   - Authorised redirect URI: `https://zmvdkzphpjjcwwrnniuu.supabase.co/auth/v1/callback`
   - If asked, set up the OAuth consent screen first (External, app name NextStep, your email).
2. Supabase dashboard → Authentication → Sign In / Providers → Google → enable, paste the Client ID and Client secret, save.
3. Supabase dashboard → Authentication → URL Configuration: Site URL `http://localhost:3000` (your live URL later) and add
   `http://localhost:3000/auth/callback` to the Redirect URLs.
4. Reload `/sign-in` after a few minutes: "Continue with Google" appears.

Phone sign-in is also off. It needs an SMS provider (for example Twilio) under Authentication → Sign In / Providers → Phone.

## Password sign-in

Members can add a password in **Settings → Password** after signing in once with an email code, then use the
**Password** tab on the sign-in page. In the dashboard (Authentication → Policies / Settings) set the minimum password
length to 8 and turn on **Leaked password protection**, so the server enforces the same rules as the app.

