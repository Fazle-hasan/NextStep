import Link from "next/link";

import { BrandMark } from "../BrandMark";
import { shellStrings } from "../strings";

const s = shellStrings.landing;

export function LandingFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-lg font-semibold">
            <BrandMark />
            {shellStrings.brand}
          </p>
          <p className="text-sm text-muted-foreground">{shellStrings.tagline}</p>
        </div>
        <nav aria-label={s.footerNav}>
          <ul className="grid grid-cols-2 gap-x-8 gap-y-1 sm:flex sm:flex-wrap sm:gap-x-6">
            {s.footerLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="border-t px-4 py-4 text-center text-xs text-muted-foreground">{s.footerNote}</p>
    </footer>
  );
}
