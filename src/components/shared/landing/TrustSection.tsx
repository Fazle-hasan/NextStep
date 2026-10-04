import { EyeOff, Flag, KeyRound, ShieldCheck } from "lucide-react";

import { shellStrings } from "../strings";

const s = shellStrings.landing;
const ICONS = [ShieldCheck, EyeOff, KeyRound, Flag] as const;

// Only promises the product enforces (verification, private contact details, address after consent, report/block).
export function TrustSection() {
  return (
    <section aria-labelledby="trust-heading" className="rounded-2xl bg-brand-soft px-5 py-8 md:px-8">
      <h2 id="trust-heading" className="text-xl font-semibold md:text-2xl">
        {s.trustHeading}
      </h2>
      <ul className="mt-5 grid gap-5 sm:grid-cols-2">
        {s.trustPoints.map((point, index) => {
          const Icon = ICONS[index] ?? ShieldCheck;
          return (
            <li key={point.title} className="flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-primary shadow-xs">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-semibold">{point.title}</h3>
                <p className="text-sm text-muted-foreground">{point.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
