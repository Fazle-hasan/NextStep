import type { PendingVerification } from "@/features/profiles/queries";

import { StatusBadge } from "../StatusBadge";
import { shellStrings } from "../strings";

const s = shellStrings.home_;

// Every verification request the viewer has made, with its status.
export function VerificationList({ verifications }: { verifications: PendingVerification[] }) {
  if (verifications.length === 0) return null;
  return (
    <section aria-labelledby="verification-heading" className="scroll-mt-20 space-y-3">
      <h2 id="verification-heading" className="text-lg font-semibold">
        {s.verificationHeading}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {verifications.map((v) => (
          <li key={v.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{s.verificationKinds[v.kind] ?? v.kind}</h3>
              <StatusBadge status={v.status} label={s.statusBadge[v.status] ?? v.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{s.verificationStatus[v.status] ?? ""}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
