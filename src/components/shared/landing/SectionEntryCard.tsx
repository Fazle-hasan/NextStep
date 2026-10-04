import { ArrowRight } from "lucide-react";
import Link from "next/link";

import type { Section } from "@/lib/sections";
import { cn } from "@/lib/utils";

import { SectionIcon } from "../SectionIcon";
import { SECTION_ACCENTS } from "../sectionStyles";

type Props = {
  section: Section;
  benefit: string;
  action: string;
  href: string;
};


// A section (Earn / Learn / Grow) with one benefit and one action, in the section's accent colour.
export function SectionEntryCard({ section, benefit, action, href }: Props) {
  const accent = SECTION_ACCENTS[section.id];
  return (
    <article className={cn("flex h-full flex-col rounded-2xl border border-t-4 bg-card p-5", SECTION_ACCENTS[section.id].borderTop)}>
      <div className="flex items-center gap-3">
        <span className={cn("flex size-11 items-center justify-center rounded-xl", accent.soft, accent.text)}>
          <SectionIcon id={section.id} className="size-5" />
        </span>
        <div>
          <p className={cn("text-sm font-semibold", accent.text)}>{section.tagline}</p>
          <h3 className="text-lg font-semibold">{section.name}</h3>
        </div>
      </div>
      <p className="mt-3 flex-1 text-sm text-muted-foreground">{benefit}</p>
      <Link
        href={href}
        className={cn(
          "mt-4 inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg text-sm font-semibold underline-offset-4 hover:underline",
          accent.text,
        )}
      >
        {action}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </article>
  );
}
