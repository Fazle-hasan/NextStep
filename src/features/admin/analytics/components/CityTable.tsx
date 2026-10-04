import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { AnalyticsResult } from "../schemas";
import { analyticsStrings as s } from "../strings";

export function CityTable({ rows }: { rows: AnalyticsResult["by_city"] }) {
  return (
    <section aria-labelledby="by-city" className="space-y-3">
      <h2 id="by-city" className="text-lg font-semibold">
        {s.byCityHeading}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{s.byCityEmpty}</p>
      ) : (
        // The table scrolls sideways on narrow screens instead of squeezing the columns.
        <div className="overflow-x-auto rounded-xl border">
          <Table className="min-w-[36rem]">
            <TableHeader>
              <TableRow>
                <TableHead>{s.columns.city}</TableHead>
                <TableHead className="text-right">{s.columns.signups}</TableHead>
                <TableHead className="text-right">{s.columns.jobs}</TableHead>
                <TableHead className="text-right">{s.columns.applications}</TableHead>
                <TableHead className="text-right">{s.columns.relocation}</TableHead>
                <TableHead className="text-right">{s.columns.listings}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.city_id}>
                  <TableCell className="font-medium">{row.city}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.signups}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.jobs_posted}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.applications}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.relocation_requests}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.active_listings}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
