import { ChevronRight } from "lucide-react";
import Link from "next/link";

import type { Section } from "@/lib/sections";
import { cn } from "@/lib/utils";

import { SectionIcon } from "../SectionIcon";
import { SECTION_ACCENTS } from "../sectionStyles";
import { shellStrings } from "../strings";

const MAX_LINKS = 4;


// Home dashboard shortcut to a section: its accent, its name and the first few live entries.
export function SectionShortcutCard({ section }: { section: Section }) {
  const accent = SECTION_ACCENTS[section.id];
  const links = section.items.filter((item) => item.available).slice(0, MAX_LINKS);

  return (
    <article className={cn("flex h-full flex-col rounded-2xl border border-t-4 bg-card", SECTION_ACCENTS[section.id].borderTop)}>
      <Link
        href={`/${section.id}`}
        className="flex items-center gap-3 rounded-t-2xl p-4 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
      >
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", accent.soft, accent.text)}>
          <SectionIcon id={section.id} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-xs font-semibold uppercase tracking-wide", accent.text)}>{section.tagline}</span>
          <span className="block font-semibold">{section.name}</span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">{shellStrings.home_.openSection}</span>
      </Link>
      {links.length > 0 && (
        <ul className="border-t px-2 py-2">
          {links.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex min-h-11 items-center rounded-lg px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
