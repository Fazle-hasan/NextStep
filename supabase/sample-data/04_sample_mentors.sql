-- Sample data for mentorship: 5 fake, verified mentors with weekly availability and skills.
-- Everything is clearly fake (CLAUDE.md §3): example.test emails, +91000000xxxx phone numbers and names
-- marked "Sample". Nobody can sign in as these mentors (their inboxes do not exist), so session requests sent
-- to them are never answered.
-- Safe to run more than once. To remove it, run remove_sample_data.sql.txt from this folder.

insert into auth.users (id, instance_id, aud, role, email, phone, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, u.phone,
  jsonb_build_object('full_name', u.full_name), '{"provider": "email", "providers": ["email"]}'::jsonb,
  now(), now(), now(), '', '', '', ''
from (values
  ('00000000-0000-4000-a000-000000000021', 'sample.mentor1@example.test', '910000000121', 'Sample Mentor Raza'),
  ('00000000-0000-4000-a000-000000000022', 'sample.mentor2@example.test', '910000000122', 'Sample Mentor Batool'),
  ('00000000-0000-4000-a000-000000000023', 'sample.mentor3@example.test', '910000000123', 'Sample Mentor Jafri'),
  ('00000000-0000-4000-a000-000000000024', 'sample.mentor4@example.test', '910000000124', 'Sample Mentor Naqvi'),
  ('00000000-0000-4000-a000-000000000025', 'sample.mentor5@example.test', '910000000125', 'Sample Mentor Rizvi')
) as u (id, email, phone, full_name)
on conflict (id) do nothing;

update public.profiles p
set gender = m.gender::public.gender,
    city_id = (select id from public.cities where slug = m.city),
    intents = '{mentor}',
    onboarding_completed_at = coalesce(p.onboarding_completed_at, now())
from (values
  ('00000000-0000-4000-a000-000000000021', 'male', 'mumbai'),
  ('00000000-0000-4000-a000-000000000022', 'female', 'bengaluru'),
  ('00000000-0000-4000-a000-000000000023', 'male', 'hyderabad'),
  ('00000000-0000-4000-a000-000000000024', 'female', 'delhi-ncr'),
  ('00000000-0000-4000-a000-000000000025', 'male', 'lucknow')
) as m (id, gender, city)
where p.id = m.id::uuid;

-- The insert trigger adds the mentor role and opens a verification request.
insert into public.mentor_profiles (user_id, headline, bio, industries, years_experience, languages, city_id,
  session_types, default_duration_min)
select m.id::uuid, m.headline, m.bio, m.industries, m.years, m.languages, c.id,
  m.session_types::public.session_type[], m.duration
from (values
  ('00000000-0000-4000-a000-000000000021', 'mumbai', 'Sample: Engineering manager, 12 years in software',
   'Sample mentor. Leads backend teams and enjoys helping graduates plan their first five years.',
   array['Software', 'Fintech'], 12, array['English', 'Hindi', 'Urdu'],
   array['career_guidance', 'mock_interview', 'skill_roadmap'], 30),
  ('00000000-0000-4000-a000-000000000022', 'bengaluru', 'Sample: Product designer and UX lead',
   'Sample mentor. Reviews portfolios and CVs for design and product roles.',
   array['Design', 'Software'], 8, array['English', 'Urdu'],
   array['cv_review', 'career_guidance', 'industry_qa'], 30),
  ('00000000-0000-4000-a000-000000000023', 'hyderabad', 'Sample: Data analyst turned analytics head',
   'Sample mentor. Helps with roadmaps into data and analytics careers.',
   array['Analytics', 'Healthcare'], 10, array['English', 'Hindi', 'Urdu'],
   array['skill_roadmap', 'mock_interview', 'industry_qa'], 60),
  ('00000000-0000-4000-a000-000000000024', 'delhi-ncr', 'Sample: Chartered accountant in a large firm',
   'Sample mentor. Guidance on finance, accounting and audit careers.',
   array['Finance', 'Accounting'], 15, array['English', 'Hindi'],
   array['career_guidance', 'cv_review'], 30),
  ('00000000-0000-4000-a000-000000000025', 'lucknow', 'Sample: HR business partner and recruiter',
   'Sample mentor. Mock interviews and honest CV feedback from the hiring side.',
   array['HR', 'Recruitment'], 9, array['English', 'Hindi', 'Urdu'],
   array['mock_interview', 'cv_review', 'career_guidance'], 30)
) as m (id, city, headline, bio, industries, years, languages, session_types, duration)
join public.cities c on c.slug = m.city
on conflict (user_id) do nothing;

update public.verification_requests
set status = 'approved', reviewed_at = now()
where kind = 'mentor' and status = 'pending' and user_id in (
  '00000000-0000-4000-a000-000000000021', '00000000-0000-4000-a000-000000000022', '00000000-0000-4000-a000-000000000023',
  '00000000-0000-4000-a000-000000000024', '00000000-0000-4000-a000-000000000025');
update public.mentor_profiles
set verification_status = 'approved', verified_at = coalesce(verified_at, now())
where headline like 'Sample: %';

-- Weekly availability (in the mentor's time zone, Asia/Kolkata): weekday evenings and Saturday mornings.
insert into public.mentor_availability_rules (mentor_id, weekday, start_time, end_time)
select m.user_id, d.weekday, d.start_time::time, d.end_time::time
from public.mentor_profiles m
cross join (values (1, '19:00', '21:00'), (3, '19:00', '21:00'), (6, '10:00', '12:00')) as d (weekday, start_time, end_time)
where m.headline like 'Sample: %'
  and not exists (select 1 from public.mentor_availability_rules r where r.mentor_id = m.user_id);

-- Expertise tags from the shared skills list.
insert into public.mentor_skills (mentor_id, skill_id)
select s.mentor::uuid, sk.id
from (values
  ('00000000-0000-4000-a000-000000000021', 'python'), ('00000000-0000-4000-a000-000000000021', 'postgresql'),
  ('00000000-0000-4000-a000-000000000021', 'project-management'),
  ('00000000-0000-4000-a000-000000000022', 'ui-design'), ('00000000-0000-4000-a000-000000000022', 'figma'),
  ('00000000-0000-4000-a000-000000000022', 'ux-research'),
  ('00000000-0000-4000-a000-000000000023', 'data-analysis'), ('00000000-0000-4000-a000-000000000023', 'sql'),
  ('00000000-0000-4000-a000-000000000023', 'power-bi'),
  ('00000000-0000-4000-a000-000000000024', 'accounting'), ('00000000-0000-4000-a000-000000000024', 'financial-analysis'),
  ('00000000-0000-4000-a000-000000000025', 'recruitment'), ('00000000-0000-4000-a000-000000000025', 'hr')
) as s (mentor, slug)
join public.skills sk on sk.slug = s.slug
on conflict (mentor_id, skill_id) do nothing;
