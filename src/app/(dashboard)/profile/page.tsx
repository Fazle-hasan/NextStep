import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { getSkills } from "@/features/jobs/queries";
import { getActiveCities } from "@/features/profiles/queries";
import { BasicsForm } from "@/features/profiles/seeker/components/BasicsForm";
import { CompletenessHint } from "@/features/profiles/seeker/components/CompletenessHint";
import { CvSection } from "@/features/profiles/seeker/components/CvSection";
import { EducationSection } from "@/features/profiles/seeker/components/EducationSection";
import { ExperienceSection } from "@/features/profiles/seeker/components/ExperienceSection";
import { SalaryForm } from "@/features/profiles/seeker/components/SalaryForm";
import { SkillsForm } from "@/features/profiles/seeker/components/SkillsForm";
import { getSeekerProfileData, profileGaps } from "@/features/profiles/seeker/queries";
import { seekerStrings as s } from "@/features/profiles/seeker/strings";
import { paiseToLakh } from "@/lib/utils/money";

export const metadata: Metadata = { title: s.pageTitle };

function lakhInput(paise: number | null | undefined): string {
  return paise == null ? "" : String(paiseToLakh(paise));
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="text-lg">
          <h2>{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function ProfilePage() {
  const viewer = await requireViewer("/profile");
  const [data, cities, skills] = await Promise.all([getSeekerProfileData(viewer.id), getActiveCities(), getSkills()]);
  const { profile, salary } = data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{s.pageTitle}</h1>
        <p className="text-muted-foreground">{s.pageIntro}</p>
      </header>

      <CompletenessHint gaps={profileGaps(data)} />

      <Section id="cv" title={s.cv.title}>
        <CvSection userId={viewer.id} cvs={data.cvs} />
      </Section>

      <Section id="basics" title={s.basics.title}>
        <BasicsForm
          cities={cities}
          defaults={{
            headline: profile?.headline ?? "",
            summary: profile?.summary ?? "",
            experienceLevel: profile?.experience_level ?? "",
            workModePref: profile?.work_mode_pref ?? "",
            preferredCityIds: profile?.preferred_city_ids ?? [],
            languages: (profile?.languages ?? []).join(", "),
            linkedinUrl: profile?.linkedin_url ?? "",
            portfolioUrl: profile?.portfolio_url ?? "",
            openToRelocate: profile?.open_to_relocate ?? false,
          }}
        />
      </Section>

      <Section id="skills" title={s.skills.title}>
        <SkillsForm skills={skills} selectedIds={data.skillIds} />
      </Section>

      <Section id="experience" title={s.experience.title}>
        <ExperienceSection experiences={data.experiences} />
      </Section>

      <Section id="education" title={s.education.title}>
        <EducationSection educations={data.educations} />
      </Section>

      <Section id="salary" title={s.salary.title}>
        <SalaryForm
          defaults={{
            minLakh: lakhInput(salary?.salary_min),
            maxLakh: lakhInput(salary?.salary_max),
            shareWithEmployers: salary?.share_with_employers ?? false,
          }}
        />
      </Section>
    </div>
  );
}
