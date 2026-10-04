import { CircleCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import type { ProfileGap } from "../queries";
import { seekerStrings as s } from "../strings";

const SECTION_COUNT = 5;

// Tells the seeker which sections are still empty.
export function CompletenessHint({ gaps }: { gaps: ProfileGap[] }) {
  if (gaps.length === 0) {
    return (
      <Alert>
        <CircleCheck aria-hidden="true" />
        <AlertDescription>{s.completeness.done}</AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert>
      <AlertTitle>
        {s.completeness.title} ({SECTION_COUNT - gaps.length}/{SECTION_COUNT})
      </AlertTitle>
      <AlertDescription>
        <p>{s.completeness.intro}</p>
        <ul className="mt-1 list-disc pl-5">
          {gaps.map((gap) => (
            <li key={gap}>
              <a href={`#${gap}`} className="underline underline-offset-2">
                {s.completeness[gap]}
              </a>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
