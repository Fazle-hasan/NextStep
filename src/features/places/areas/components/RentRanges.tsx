import { formatMonthlyBudget } from "@/lib/utils/money";

import { areaStrings as s } from "../strings";
import type { RentRange } from "../types";

// Typical monthly rent per listing type.
export function RentRanges({ ranges }: { ranges: RentRange[] }) {
  if (ranges.length === 0) return null;

  return (
    <section aria-labelledby="area-rent" className="space-y-2">
      <h2 id="area-rent" className="text-lg font-semibold">
        {s.guide.rent}
      </h2>
      <dl className="divide-y rounded-xl border">
        {ranges.map((range) => (
          <div key={range.type} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-3">
            <dt className="font-medium">{s.listingTypes[range.type]}</dt>
            <dd className="text-sm text-muted-foreground">{formatMonthlyBudget(range.min, range.max)}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">{s.guide.rentNote}</p>
    </section>
  );
}
