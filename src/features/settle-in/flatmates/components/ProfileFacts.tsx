import { formatDate } from "@/lib/utils/dates";
import { formatMonthlyBudget } from "@/lib/utils/money";
import type { Enums } from "@/types/database";

import { FOOD_HABIT_LABELS, GUESTS_POLICY_LABELS, SLEEP_SCHEDULE_LABELS, WORK_SCHEDULE_LABELS } from "../labels";
import { flatmateStrings as s } from "../strings";

type Props = {
  budgetMin: number;
  budgetMax: number;
  moveDate: string;
  areaNames: string[];
  foodHabit: Enums<"food_habit">;
  smokes: boolean;
  sleepSchedule: Enums<"sleep_schedule">;
  workSchedule: Enums<"work_schedule">;
  cleanliness: number;
  guestsPolicy: Enums<"guests_policy">;
};

// The facts of a flatmate profile as a compact definition list (used for matches and the viewer's own summary).
export function ProfileFacts(props: Props) {
  const m = s.matches;
  const facts: [string, string][] = [
    [m.budget, formatMonthlyBudget(props.budgetMin, props.budgetMax) ?? "—"],
    [m.moveDate, formatDate(`${props.moveDate}T00:00:00+05:30`)],
    [m.areas, props.areaNames.length > 0 ? props.areaNames.join(", ") : m.anyArea],
    [m.food, FOOD_HABIT_LABELS[props.foodHabit]],
    [m.smoking, props.smokes ? m.smokes : m.nonSmoker],
    [m.sleep, SLEEP_SCHEDULE_LABELS[props.sleepSchedule]],
    [m.work, WORK_SCHEDULE_LABELS[props.workSchedule]],
    [m.cleanliness, m.cleanlinessValue(props.cleanliness)],
    [m.guests, GUESTS_POLICY_LABELS[props.guestsPolicy]],
  ];

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {facts.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
