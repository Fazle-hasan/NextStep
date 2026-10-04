import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field } from "@/features/profiles/components/Field";
import { NativeSelect } from "@/features/profiles/seeker/components/NativeSelect";

import { SESSION_TYPE_LABELS } from "../../labels";
import { SESSION_TYPES } from "../schemas";
import { bookingStrings as s } from "../strings";
import type { MentorFilters as Filters, Option } from "../types";

type Props = { filters: Filters; cities: Option[]; skills: Option[] };

// A plain GET form: filters live in the URL, so results can be shared and work without JavaScript.
export function MentorFilters({ filters, cities, skills }: Props) {
  const hasFilters = Boolean(filters.cityId || filters.sessionType || filters.skillId);

  return (
    <form action="/mentors" method="get" aria-label={s.list.filtersHeading} className="space-y-4 rounded-xl border p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="mentor-city" label={s.list.city}>
          <NativeSelect id="mentor-city" name="city" defaultValue={filters.cityId ?? ""}>
            <option value="">{s.list.anyCity}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="mentor-type" label={s.list.sessionType}>
          <NativeSelect id="mentor-type" name="type" defaultValue={filters.sessionType ?? ""}>
            <option value="">{s.list.anySessionType}</option>
            {SESSION_TYPES.map((type) => (
              <option key={type} value={type}>
                {SESSION_TYPE_LABELS[type]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="mentor-skill" label={s.list.skill}>
          <NativeSelect id="mentor-skill" name="skill" defaultValue={filters.skillId ?? ""}>
            <option value="">{s.list.anySkill}</option>
            {skills.map((skill) => (
              <option key={skill.id} value={skill.id}>
                {skill.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" className="h-11 px-6">
          {s.list.apply}
        </Button>
        {hasFilters && (
          <Button asChild variant="outline" className="h-11">
            <Link href="/mentors">{s.list.clear}</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
