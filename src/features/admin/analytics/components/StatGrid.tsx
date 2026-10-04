import { Card, CardContent } from "@/components/ui/card";

import { STAT_KEYS, type AnalyticsResult } from "../schemas";
import { analyticsStrings as s } from "../strings";

const numberFormat = new Intl.NumberFormat("en-IN");

export function StatGrid({ data }: { data: AnalyticsResult }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {STAT_KEYS.map((key) => (
        <li key={key}>
          <Card className="h-full">
            <CardContent className="space-y-1">
              <p className="text-2xl font-semibold tabular-nums">{numberFormat.format(data[key])}</p>
              <p className="text-sm text-muted-foreground">{s.stats[key]}</p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
