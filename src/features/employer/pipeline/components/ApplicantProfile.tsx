import { Badge } from "@/components/ui/badge";
import { EXPERIENCE_LEVEL_LABELS, WORK_MODE_LABELS } from "@/features/jobs/labels";
import { formatDate } from "@/lib/utils/dates";
import { formatAnnualSalary } from "@/lib/utils/money";

import type { ApplicantDetail } from "../queries";
import { pipelineStrings as s } from "../strings";

type Props = { detail: ApplicantDetail };

// The applicant's job profile as shared with this employer. Never includes phone or email.
export function ApplicantProfile({ detail }: Props) {
  const { seekerProfile: profile, skills, experiences, educations, salary } = detail;
  const expected = salary ? formatAnnualSalary(salary.salary_min, salary.salary_max) : null;
  const empty = !profile && skills.length === 0 && experiences.length === 0 && educations.length === 0;

  if (empty) return <p className="text-sm text-muted-foreground">{s.noProfile}</p>;

  return (
    <div className="space-y-5">
      {profile && (profile.experience_level || profile.work_mode_pref) && (
        <div className="flex flex-wrap gap-1.5">
          {profile.experience_level && <Badge variant="secondary">{EXPERIENCE_LEVEL_LABELS[profile.experience_level]}</Badge>}
          {profile.work_mode_pref && <Badge variant="secondary">{WORK_MODE_LABELS[profile.work_mode_pref]}</Badge>}
        </div>
      )}

      {profile?.summary && (
        <Block title={s.summary}>
          <p className="text-sm break-words whitespace-pre-line">{profile.summary}</p>
        </Block>
      )}

      {skills.length > 0 && (
        <Block title={s.skills}>
          <ul className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <li key={skill}>
                <Badge variant="outline">{skill}</Badge>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {experiences.length > 0 && (
        <Block title={s.experience}>
          <ul className="space-y-3">
            {experiences.map((item) => (
              <li key={item.id} className="text-sm">
                <p className="font-medium break-words">
                  {item.title} · {item.company_name}
                </p>
                <p className="text-muted-foreground">
                  {formatDate(item.start_date)} – {item.end_date ? formatDate(item.end_date) : s.present}
                </p>
                {item.description && <p className="mt-1 break-words whitespace-pre-line">{item.description}</p>}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {educations.length > 0 && (
        <Block title={s.education}>
          <ul className="space-y-3">
            {educations.map((item) => (
              <li key={item.id} className="text-sm">
                <p className="font-medium break-words">
                  {item.degree}
                  {item.field ? `, ${item.field}` : ""}
                </p>
                <p className="break-words text-muted-foreground">
                  {item.institution}
                  {item.start_year || item.end_year ? ` · ${[item.start_year, item.end_year].filter(Boolean).join("–")}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {profile && profile.languages.length > 0 && (
        <Block title={s.languages}>
          <p className="text-sm">{profile.languages.join(", ")}</p>
        </Block>
      )}

      {expected && (
        <Block title={s.expectedSalary}>
          <p className="text-sm">{expected}</p>
        </Block>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}
