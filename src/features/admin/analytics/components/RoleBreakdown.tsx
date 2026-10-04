import { ROLE_LABELS, type AppRole } from "@/lib/sections";

import { analyticsStrings as s } from "../strings";

export function RoleBreakdown({ byRole }: { byRole: Record<string, number> }) {
  const rows = Object.entries(byRole)
    .filter((entry): entry is [AppRole, number] => entry[0] in ROLE_LABELS)
    .sort((a, b) => b[1] - a[1]);

  return (
    <section aria-labelledby="by-role" className="space-y-3">
      <h2 id="by-role" className="text-lg font-semibold">
        {s.byRoleHeading}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{s.byRoleEmpty}</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {rows.map(([role, n]) => (
            <li key={role} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{ROLE_LABELS[role]}</span>
              <span className="font-medium tabular-nums">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
