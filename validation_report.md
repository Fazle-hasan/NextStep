# Validation Report – NextStep data package

Generated 2026-10-03 by `scripts/validate.py`. All CSVs were also test-loaded into PostgreSQL 16 with `schema.sql` (constraints enabled): 9,887 courses, 9,887 source-map rows, 0 production professionals, 300 sample professionals – no load errors.

## 1. File checks

| Check | course_platform_database.csv | career_guidance_database.csv | career_guidance_sample_database.csv |
|---|---|---|---|
| Parses as CSV (UTF-8) | yes | yes | yes |
| Header matches requested schema (names + order) | True | True | True |
| Data rows | 9,887 | 0 | 300 |
| Rows with wrong field count | 0 | 0 | 0 |
| Duplicate primary IDs | 0 | 0 | 0 |
| Duplicate canonical course URLs | 0 | – | – |
| Duplicate slugs | 0 | – | – |

## 2. Record classification

| Dataset | Verified | Source-listed (official catalogue, URL not individually checked) | Unverified | Synthetic sample |
|---|---|---|---|---|
| Courses | 8,872 | 1,014 | 1 | 0 |
| Professionals – production | 0 | – | 0 | 0 |
| Professionals – sample file | 0 | – | 0 | 300 |

No verified real professionals exist yet; nothing in the career files is presented as a real person.

## 3. Deduplication and exclusions (build stage)

- Coursera courses removed because the course page returned HTTP 404: **23** (listed in `excluded_broken_links.csv`)
- SWAYAM-NPTEL runs merged into their NPTEL archive course (same course, one record): **1,031**
- Repeated SWAYAM runs of the same course collapsed to the latest run: **88**
- Microsoft Learn courses duplicating a learning path of the same title: **31**
- Retired Microsoft certifications excluded: **64**
- Coursera titles duplicated within the same partner were removed before sampling (normalised title + partner).
- Remaining same title + provider + instructor groups: **67** extra rows, all NPTEL, where NPTEL publishes separate course IDs (web vs video editions or re-recordings); kept as distinct resources.

## 4. URL verification

Each host was first tested with a deliberately invalid URL to confirm it returns 404 for missing pages, so a 200 is meaningful.

| Source | HTTP 200 | Not checked | Other |
|---|---|---|---|
| coursera_catalog_api | 4,150 | 0 | – |
| microsoft_learn_catalog_api | 1,054 | 0 | – |
| nptel_course_catalog | 3,483 | 0 | err: 1 |
| swayam_course_explorer | 93 | 1,014 | – |
| freecodecamp_github_curriculum | 92 | 0 | – |

The 1,014 unchecked SWAYAM URLs are on `onlinecourses.swayam2.ac.in`; a 75-URL sample from that host all returned 200, but the full check was cut off when the browser connection dropped, so they stay `source_listed`.

## 5. Field-level checks (courses)

| Check | Failures |
|---|---|
| Missing required fields | 0 |
| Values outside controlled vocabularies | 0 |
| Unknown domain labels | 0 |
| Invalid booleans | 0 |
| Non-numeric values in numeric columns | 0 |
| Invalid ISO dates | 0 |
| Malformed URLs (must be https://host/path) | 0 |
| Placeholder values (N/A, NA, nil, -, …) | 0 |
| Embedded newlines | 0 |
| Leading/trailing whitespace | 0 |
| Contradictory combinations* | 0 |

*Contradiction rules: free with fee > 0; fee without currency; certificate type/fee without certificate; free certificate with a fee; exam fields without an exam; end date before start; verified without a verification date; rating without source or outside 0–5; duration without unit; professional certification outside the certification domain.

## 6. Career guidance checks

| Check | Failures |
|---|---|
| Production: sample records present | 0 |
| Production: public profile without granted + dated consent | 0 |
| Production: affiliation claimed without source | 0 |
| Production: verified without method/date | 0 |
| Production: public but identity unverified | 0 |
| Sample: not marked profile_type=sample / sample_only | 0 |
| Sample: visibility other than test_environment_only | 0 |
| Sample: carries a community-affiliation claim | 0 |
| Sample: marked identity-verified | 0 |
| Sample: has email/phone/LinkedIn/photo/website | 0 |
| Sample: name not marked as sample | 0 |
| Sample: invalid controlled values | 0 |
| Sample: invalid booleans | 0 |
| Sample: invalid dates | 0 |
| Sample: contradictory fields | 0 |

The production file has no rows, so its row-level checks are vacuous; the same checks run automatically once registrations are loaded.

## 7. Missing-value statistics – courses (% empty)

| Column | % empty | Column | % empty | Column | % empty |
|---|---|---|---|---|---|
| course_id | 0.0 | course_name | 0.0 | course_slug | 0.0 |
| course_description | 11.2 | domain | 0.0 | sub_domain | 0.0 |
| subject | 4.7 | skills_taught | 90.2 | prerequisites | 100.0 |
| target_audience | 82.9 | difficulty_level | 89.3 | course_duration | 46.6 |
| duration_unit | 46.6 | estimated_study_hours | 81.7 | learning_mode | 0.5 |
| course_language | 23.3 | course_format | 52.0 | syllabus_or_curriculum_url | 53.5 |
| learning_outcomes | 100.0 | practical_projects | 100.0 | course_materials_available | 55.5 |
| provider_name | 0.0 | provider_type | 0.0 | instructor_name | 12.0 |
| course_url | 0.0 | enrollment_url | 0.0 | enrollment_status | 67.6 |
| course_start_date | 78.1 | course_end_date | 79.2 | self_paced | 0.5 |
| batch_availability | 76.3 | pricing_type | 0.0 | course_fee | 44.3 |
| currency | 100.0 | free_certificate_available | 79.4 | financial_aid_available | 100.0 |
| financial_aid_url | 100.0 | scholarship_available | 100.0 | scholarship_url | 100.0 |
| accessibility_features | 100.0 | certificate_available | 28.3 | certificate_type | 29.4 |
| certificate_issuing_organization | 10.2 | certificate_fee | 99.9 | examination_available | 28.0 |
| examination_type | 79.4 | examination_mode | 87.8 | examination_duration_minutes | 100.0 |
| passing_percentage | 100.0 | number_of_assessments | 100.0 | final_project_required | 99.7 |
| proctored_exam | 36.2 | exam_registration_url | 79.4 | relevant_job_roles | 89.3 |
| career_relevance | 73.8 | industry_recognition | 100.0 | accreditation_details | 78.5 |
| continuing_education_credits | 78.5 | portfolio_value | 99.9 | course_rating | 100.0 |
| rating_source | 100.0 | rating_count | 100.0 | official_source_url | 0.0 |
| verification_status | 0.0 | last_verified_date | 10.3 | data_source | 0.0 |
| record_created_date | 0.0 | record_updated_date | 0.0 |  |  |

Empty means the source does not publish the value or it could not be verified; nothing was estimated to fill gaps. Columns at 100% (prerequisites, learning outcomes, financial aid, accessibility, exam duration, passing percentage, industry recognition, currency) are present for the schema but no source in this release supplied verified values.

## 8. Distribution

**By provider:** Coursera 4,150, Microsoft Learn 929, Microsoft 125, NPTEL 3,484, SWAYAM 1,107, freeCodeCamp 92

**By pricing_type:** unknown 4,238, free 5,504, paid 145

**By certificate_type:** certificate_of_completion 6,031, (blank) 2,910, none 821, professional_certification 88, skills_credential 37

**By domain:**

| Domain | Courses |
|---|---|
| engineering_core | 1,652 |
| science_mathematics | 1,072 |
| computer_science_software_engineering | 634 |
| artificial_intelligence_machine_learning | 522 |
| cloud_computing_devops | 515 |
| healthcare_administration_allied_health | 490 |
| business_management_leadership | 484 |
| personal_development_workplace_skills | 439 |
| humanities_social_sciences | 431 |
| data_analytics_business_intelligence | 410 |
| cybersecurity_networking | 390 |
| finance_accounting_banking | 349 |
| generative_ai_data_science | 336 |
| web_mobile_development | 234 |
| communication_english_language | 229 |
| marketing_digital_marketing | 209 |
| teaching_education_instructional_design | 202 |
| business_analysis_project_management | 198 |
| agriculture_environment_sustainability | 177 |
| arts_design_media | 158 |
| entrepreneurship_business_development | 143 |
| database_sql_data_engineering | 141 |
| professional_certifications | 125 |
| law_legal_studies | 94 |
| ui_ux_product_management | 85 |
| languages_other | 78 |
| human_resources_talent_acquisition | 41 |
| vocational_technical_skills | 28 |
| government_competitive_exam_preparation | 16 |
| freelancing_remote_work | 5 |
