import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import type { AuditFilters } from "../schemas";
import { actionLabel, auditStrings as s } from "../strings";

type Props = {
  filters: AuditFilters;
  actions: string[];
  admins: { id: string; name: string | null }[];
};

const selectClass = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm";

export function AuditFiltersForm({ filters, actions, admins }: Props) {
  return (
    <form method="get" className="space-y-3 rounded-xl border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="audit-action">{s.action}</Label>
          <select id="audit-action" name="action" defaultValue={filters.action ?? ""} className={selectClass}>
            <option value="">{s.allActions}</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {actionLabel(action)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-actor">{s.actor}</Label>
          <select id="audit-actor" name="actor" defaultValue={filters.actor ?? ""} className={selectClass}>
            <option value="">{s.allActors}</option>
            {admins.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.name ?? s.unknownActor}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {(filters.action || filters.actor) && (
          <Button asChild variant="outline" className="h-11">
            <Link href="/admin/audit">{s.clear}</Link>
          </Button>
        )}
        <Button type="submit" className="h-11">
          {s.apply}
        </Button>
      </div>
    </form>
  );
}
