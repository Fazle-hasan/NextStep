import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils/dates";

import type { AuditEntry } from "../queries";
import { actionLabel, auditStrings as s } from "../strings";

function hasDetails(details: AuditEntry["details"]): boolean {
  if (details === null) return false;
  if (typeof details === "object") return Object.keys(details).length > 0;
  return true;
}

// One audit row. Details are shown as pretty-printed JSON text (never rendered as HTML).
export function AuditEntryItem({ entry }: { entry: AuditEntry }) {
  const actor = entry.actorId ? (entry.actorName ?? s.unknownActor) : s.system;

  return (
    <li className="space-y-2 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="secondary">{actionLabel(entry.action)}</Badge>
        <time dateTime={entry.createdAt} className="text-xs text-muted-foreground">
          {formatDateTime(entry.createdAt)}
        </time>
      </div>
      <p className="text-sm">
        <span className="font-medium">{actor}</span>
        {entry.targetTable && (
          <span className="text-muted-foreground">
            {" "}
            · {s.target}: {entry.targetTable}
            {entry.targetId && <span className="font-mono"> {entry.targetId.slice(0, 8)}</span>}
          </span>
        )}
      </p>
      {hasDetails(entry.details) ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-primary">{s.details}</summary>
          <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs break-words whitespace-pre-wrap">
            {JSON.stringify(entry.details, null, 2)}
          </pre>
        </details>
      ) : (
        <p className="text-xs text-muted-foreground">{s.noDetails}</p>
      )}
    </li>
  );
}
