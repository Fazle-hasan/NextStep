-- Sample data: 3 fake employer accounts, 6 fake companies and 16 fake jobs in Mumbai, Bengaluru and Hyderabad.
-- Everything is clearly fake (CLAUDE.md §3): example.test emails, +91000000xxxx phone numbers and
-- company names marked "(Sample)". Nobody can sign in as the sample employers (their inboxes do not exist).
-- Reference data (cities, neighbourhoods, skills) lives in migrations, not here.
-- Safe to run more than once. To remove it, run remove_sample_data.sql.txt from this folder.

-- Sample employers --------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, phone, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, u.phone,
  jsonb_build_object('full_name', u.full_name), '{"provider": "email", "providers": ["email"]}'::jsonb,
  now(), now(), now(), '', '', '', ''
from (values
  ('00000000-0000-4000-a000-000000000001', 'sample.employer1@example.test', '910000000101', 'Sample Employer One'),
  ('00000000-0000-4000-a000-000000000002', 'sample.employer2@example.test', '910000000102', 'Sample Employer Two'),
  ('00000000-0000-4000-a000-000000000003', 'sample.employer3@example.test', '910000000103', 'Sample Employer Three')
) as u (id, email, phone, full_name)
on conflict (id) do nothing;

update public.profiles p
set gender = 'male',
    city_id = (select id from public.cities where slug = 'mumbai'),
    intents = '{hire}',
    onboarding_completed_at = coalesce(p.onboarding_completed_at, now())
where p.id in ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000003');

insert into public.user_roles (user_id, role)
select id::uuid, 'employer' from (values
  ('00000000-0000-4000-a000-000000000001'), ('00000000-0000-4000-a000-000000000002'), ('00000000-0000-4000-a000-000000000003')
) as u (id)
on conflict (user_id, role) do nothing;

-- Sample companies (verified) -----------------------------------------------------------
insert into public.companies (id, owner_id, name, slug, industry, size, website, description,
  is_community_owned, leap_friendly, verification_status, verified_at)
select c.id::uuid, c.owner::uuid, c.name, c.slug, c.industry, c.size::public.company_size, c.website, c.description,
  c.community, c.leap, 'approved', now()
from (values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001', 'Zainab Tech Labs (Sample)', 'zainab-tech-labs-sample',
   'Software', 's51_200', 'https://zainabtech.example.test', 'Sample product studio building web and mobile apps for small businesses.', true, true),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000001', 'Kazmi Logistics (Sample)', 'kazmi-logistics-sample',
   'Logistics', 's201_1000', 'https://kazmilogistics.example.test', 'Sample logistics company moving goods between ports and warehouses.', true, false),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000002', 'Deccan Data Works (Sample)', 'deccan-data-works-sample',
   'Analytics', 's11_50', 'https://deccandata.example.test', 'Sample analytics consultancy for retail and healthcare clients.', false, true),
  ('00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000002', 'Charminar Foods (Sample)', 'charminar-foods-sample',
   'Food & Beverage', 's51_200', 'https://charminarfoods.example.test', 'Sample halal packaged-food brand with kitchens in Hyderabad.', true, false),
  ('00000000-0000-4000-b000-000000000005', '00000000-0000-4000-a000-000000000003', 'Garden City Fintech (Sample)', 'garden-city-fintech-sample',
   'Fintech', 's201_1000', 'https://gardencityfin.example.test', 'Sample payments startup serving small merchants.', false, true),
  ('00000000-0000-4000-b000-000000000006', '00000000-0000-4000-a000-000000000003', 'Noor Health Clinics (Sample)', 'noor-health-clinics-sample',
   'Healthcare', 's51_200', 'https://noorhealth.example.test', 'Sample chain of neighbourhood clinics and pharmacies.', true, false)
) as c (id, owner, name, slug, industry, size, website, description, community, leap)
on conflict (id) do nothing;

insert into public.company_members (company_id, user_id, member_role)
select c.id, c.owner_id, 'owner' from public.companies c
where c.slug like '%-sample'
on conflict (company_id, user_id) do nothing;

insert into public.company_locations (company_id, city_id, address)
select c.id, ci.id, l.address
from (values
  ('zainab-tech-labs-sample', 'mumbai', 'Sample Tower, Andheri West'),
  ('kazmi-logistics-sample', 'mumbai', 'Sample Dock Road, Byculla'),
  ('deccan-data-works-sample', 'hyderabad', 'Sample Park, HITEC City'),
  ('charminar-foods-sample', 'hyderabad', 'Sample Lane, Old City'),
  ('garden-city-fintech-sample', 'bengaluru', 'Sample Square, Koramangala'),
  ('noor-health-clinics-sample', 'bengaluru', 'Sample Road, Frazer Town')
) as l (company_slug, city_slug, address)
join public.companies c on c.slug = l.company_slug
join public.cities ci on ci.slug = l.city_slug
where not exists (select 1 from public.company_locations x where x.company_id = c.id);

-- Sample jobs (published) ---------------------------------------------------------------
-- Salaries are annual, in paise (e.g. 80000000 = Rs 8,00,000 a year).
with new_jobs as (
  insert into public.jobs (id, company_id, posted_by, title, description, requirements, job_type, work_mode,
    experience_level, city_id, neighbourhood_id, address_text, openings, application_deadline, status, published_at)
  select j.id::uuid, c.id, c.owner_id, j.title, j.description, j.requirements, j.job_type::public.job_type,
    j.work_mode::public.work_mode, j.level::public.experience_level, ci.id, n.id, j.address, j.openings,
    case when j.deadline_days is not null then current_date + j.deadline_days end,
    'published', now() - make_interval(days => j.age_days)
  from (values
    ('00000000-0000-4000-8c00-000000000001', 'zainab-tech-labs-sample', 'mumbai', 'andheri-west', 'Frontend Developer (React)',
     'Build responsive web apps for our small-business clients. You will work with designers and a backend team in a hybrid setup.',
     '2+ years with React and TypeScript. Good eye for detail. Comfortable with Git and code reviews.',
     'full_time', 'hybrid', 'mid', 'Sample Tower, Andheri West', 2, 30, 2),
    ('00000000-0000-4000-8c00-000000000002', 'zainab-tech-labs-sample', 'mumbai', 'andheri-west', 'Backend Developer (Node.js)',
     'Design and build APIs and background jobs on Node.js and PostgreSQL for client products.',
     '3+ years backend experience. Strong SQL. Experience with cloud deployment is a plus.',
     'full_time', 'hybrid', 'senior', 'Sample Tower, Andheri West', 1, 45, 5),
    ('00000000-0000-4000-8c00-000000000003', 'zainab-tech-labs-sample', null, null, 'Junior QA Tester (Remote)',
     'Test web and mobile apps, write clear bug reports and help automate regression checks. Fully remote.',
     'Careful and curious. Basic understanding of web apps. Freshers welcome.',
     'full_time', 'remote', 'entry', null, 2, null, 1),
    ('00000000-0000-4000-8c00-000000000004', 'zainab-tech-labs-sample', 'mumbai', 'andheri-west', 'UI/UX Design Intern',
     'Six-month internship helping design app screens and run user tests. Stipend provided.',
     'Portfolio with 2 or more projects. Working knowledge of Figma.',
     'internship', 'onsite', 'entry', 'Sample Tower, Andheri West', 2, 20, 3),
    ('00000000-0000-4000-8c00-000000000005', 'kazmi-logistics-sample', 'mumbai', 'byculla', 'Operations Executive',
     'Coordinate daily dispatches between the port and our warehouses, track vehicles and resolve delays.',
     '1 to 3 years in logistics or operations. Good Hindi and English. Comfortable with Excel.',
     'full_time', 'onsite', 'entry', 'Sample Dock Road, Byculla', 3, 25, 4),
    ('00000000-0000-4000-8c00-000000000006', 'kazmi-logistics-sample', 'mumbai', 'kurla', 'Accounts Assistant (Part-time)',
     'Maintain ledgers in Tally, prepare GST returns and reconcile vendor payments. Four hours a day.',
     'B.Com or similar. Tally and GST filing experience.',
     'part_time', 'onsite', 'entry', 'Sample Yard, Kurla', 1, null, 8),
    ('00000000-0000-4000-8c00-000000000007', 'deccan-data-works-sample', 'hyderabad', 'hitec-city', 'Data Analyst',
     'Turn retail and healthcare data into dashboards and insights for clients using SQL and Power BI.',
     '2+ years in analytics. Strong SQL and Excel. Power BI or similar BI tool.',
     'full_time', 'hybrid', 'mid', 'Sample Park, HITEC City', 2, 30, 2),
    ('00000000-0000-4000-8c00-000000000008', 'deccan-data-works-sample', 'hyderabad', 'gachibowli', 'Senior Python Engineer',
     'Lead data pipeline work in Python, mentor junior engineers and own delivery for two client accounts.',
     '5+ years Python. Experience with data pipelines and cloud platforms. Team leadership.',
     'full_time', 'hybrid', 'lead', 'Sample Hub, Gachibowli', 1, 40, 6),
    ('00000000-0000-4000-8c00-000000000009', 'deccan-data-works-sample', null, null, 'Machine Learning Engineer (Contract, Remote)',
     'Six-month contract building demand-forecasting models for a retail client. Remote within India.',
     '3+ years in machine learning with Python. Experience shipping models to production.',
     'contract', 'remote', 'senior', null, 1, 15, 1),
    ('00000000-0000-4000-8c00-000000000010', 'charminar-foods-sample', 'hyderabad', 'old-city', 'Sales Executive',
     'Grow our retail network across Hyderabad: visit stores, take orders and build relationships.',
     '1+ year in FMCG sales. Urdu or Telugu and Hindi. Two-wheeler preferred.',
     'full_time', 'onsite', 'entry', 'Sample Lane, Old City', 4, 30, 7),
    ('00000000-0000-4000-8c00-000000000011', 'charminar-foods-sample', 'hyderabad', 'mehdipatnam', 'Digital Marketing Specialist',
     'Run social media, SEO and paid campaigns for our halal food brand and its online store.',
     '2+ years in digital marketing. Strong copywriting. Experience with food or retail brands is a plus.',
     'full_time', 'hybrid', 'mid', 'Sample Plaza, Mehdipatnam', 1, null, 10),
    ('00000000-0000-4000-8c00-000000000012', 'garden-city-fintech-sample', 'bengaluru', 'koramangala', 'Product Manager',
     'Own the merchant onboarding product: research, roadmap, specs and launch with engineering and design.',
     '4+ years in product management, ideally in payments or SaaS. Data-driven and a clear writer.',
     'full_time', 'hybrid', 'senior', 'Sample Square, Koramangala', 1, 35, 3),
    ('00000000-0000-4000-8c00-000000000013', 'garden-city-fintech-sample', 'bengaluru', 'hsr-layout', 'Android Developer',
     'Build and maintain our merchant app used by thousands of small shops every day.',
     '2+ years Android (Kotlin). Experience with offline-first apps is a plus.',
     'full_time', 'onsite', 'mid', 'Sample Block, HSR Layout', 2, 30, 5),
    ('00000000-0000-4000-8c00-000000000014', 'garden-city-fintech-sample', 'bengaluru', 'koramangala', 'Customer Support Associate',
     'Help merchants by phone and chat, resolve payment issues and pass product feedback to the team.',
     'Clear communication in English and Hindi. Patience and empathy. Freshers welcome.',
     'full_time', 'onsite', 'entry', 'Sample Square, Koramangala', 5, 20, 2),
    ('00000000-0000-4000-8c00-000000000015', 'noor-health-clinics-sample', 'bengaluru', 'frazer-town', 'Staff Nurse',
     'Provide outpatient care at our neighbourhood clinic, assist doctors and manage patient records.',
     'GNM or B.Sc Nursing with valid registration. 1+ year clinical experience.',
     'full_time', 'onsite', 'mid', 'Sample Road, Frazer Town', 3, 30, 4),
    ('00000000-0000-4000-8c00-000000000016', 'noor-health-clinics-sample', 'bengaluru', 'frazer-town', 'Pharmacist',
     'Dispense medicines, manage inventory and counsel patients at the clinic pharmacy.',
     'B.Pharm or D.Pharm with registration. Good record keeping.',
     'full_time', 'onsite', 'entry', 'Sample Road, Frazer Town', 1, null, 9)
  ) as j (id, company_slug, city_slug, hood_slug, title, description, requirements, job_type, work_mode, level, address, openings, deadline_days, age_days)
  join public.companies c on c.slug = j.company_slug
  left join public.cities ci on ci.slug = j.city_slug
  left join public.neighbourhoods n on n.city_id = ci.id and n.slug = j.hood_slug
  on conflict (id) do nothing
  returning id
)
select count(*) as sample_jobs_added from new_jobs;

insert into public.job_salaries (job_id, salary_min, salary_max, is_visible)
select s.id::uuid, s.min_lakh * 10000000::bigint, s.max_lakh * 10000000::bigint, s.visible
from (values
  ('00000000-0000-4000-8c00-000000000001', 8, 12, true),
  ('00000000-0000-4000-8c00-000000000002', 14, 20, true),
  ('00000000-0000-4000-8c00-000000000003', 3, 5, true),
  ('00000000-0000-4000-8c00-000000000004', 2, 2, true),
  ('00000000-0000-4000-8c00-000000000005', 3, 4, true),
  ('00000000-0000-4000-8c00-000000000007', 7, 10, true),
  ('00000000-0000-4000-8c00-000000000008', 28, 38, false),
  ('00000000-0000-4000-8c00-000000000009', 18, 24, true),
  ('00000000-0000-4000-8c00-000000000010', 3, 4, true),
  ('00000000-0000-4000-8c00-000000000012', 25, 35, false),
  ('00000000-0000-4000-8c00-000000000013', 10, 16, true),
  ('00000000-0000-4000-8c00-000000000014', 3, 4, true),
  ('00000000-0000-4000-8c00-000000000015', 4, 6, true)
) as s (id, min_lakh, max_lakh, visible)
on conflict (job_id) do nothing;

insert into public.job_skills (job_id, skill_id)
select js.id::uuid, sk.id
from (values
  ('00000000-0000-4000-8c00-000000000001', 'React'), ('00000000-0000-4000-8c00-000000000001', 'TypeScript'), ('00000000-0000-4000-8c00-000000000001', 'CSS'),
  ('00000000-0000-4000-8c00-000000000002', 'Node.js'), ('00000000-0000-4000-8c00-000000000002', 'PostgreSQL'), ('00000000-0000-4000-8c00-000000000002', 'AWS'),
  ('00000000-0000-4000-8c00-000000000003', 'QA Testing'),
  ('00000000-0000-4000-8c00-000000000004', 'Figma'), ('00000000-0000-4000-8c00-000000000004', 'UI Design'),
  ('00000000-0000-4000-8c00-000000000005', 'Operations'), ('00000000-0000-4000-8c00-000000000005', 'Excel'),
  ('00000000-0000-4000-8c00-000000000006', 'Tally'), ('00000000-0000-4000-8c00-000000000006', 'GST'), ('00000000-0000-4000-8c00-000000000006', 'Accounting'),
  ('00000000-0000-4000-8c00-000000000007', 'SQL'), ('00000000-0000-4000-8c00-000000000007', 'Power BI'), ('00000000-0000-4000-8c00-000000000007', 'Data Analysis'),
  ('00000000-0000-4000-8c00-000000000008', 'Python'), ('00000000-0000-4000-8c00-000000000008', 'AWS'),
  ('00000000-0000-4000-8c00-000000000009', 'Machine Learning'), ('00000000-0000-4000-8c00-000000000009', 'Python'),
  ('00000000-0000-4000-8c00-000000000010', 'Sales'), ('00000000-0000-4000-8c00-000000000010', 'Urdu'),
  ('00000000-0000-4000-8c00-000000000011', 'Digital Marketing'), ('00000000-0000-4000-8c00-000000000011', 'SEO'), ('00000000-0000-4000-8c00-000000000011', 'Social Media'),
  ('00000000-0000-4000-8c00-000000000012', 'Product Management'),
  ('00000000-0000-4000-8c00-000000000013', 'Android'),
  ('00000000-0000-4000-8c00-000000000014', 'Customer Support'), ('00000000-0000-4000-8c00-000000000014', 'Communication'),
  ('00000000-0000-4000-8c00-000000000015', 'Nursing'),
  ('00000000-0000-4000-8c00-000000000016', 'Pharmacy')
) as js (id, skill)
join public.skills sk on sk.name = js.skill
on conflict (job_id, skill_id) do nothing;

insert into public.job_screening_questions (job_id, question, is_required, position)
select q.id::uuid, q.question, q.required, q.pos
from (values
  ('00000000-0000-4000-8c00-000000000001', 'How many years have you worked with React?', true, 0),
  ('00000000-0000-4000-8c00-000000000001', 'Share a link to something you built (optional).', false, 1),
  ('00000000-0000-4000-8c00-000000000007', 'Which BI tools have you used?', true, 0),
  ('00000000-0000-4000-8c00-000000000015', 'What is your nursing registration number?', true, 0)
) as q (id, question, required, pos)
where not exists (select 1 from public.job_screening_questions x where x.job_id = q.id::uuid);
