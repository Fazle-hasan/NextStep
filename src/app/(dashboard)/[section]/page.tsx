import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SectionIcon } from "@/components/shared/SectionIcon";
import { SECTION_ACCENTS } from "@/components/shared/sectionStyles";
import { shellStrings } from "@/components/shared/strings";
import { Badge } from "@/components/ui/badge";
import { getViewer } from "@/features/auth/queries";
import { SECTIONS, sectionsForRoles } from "@/lib/sections";
import { cn } from "@/lib/utils";

export const dynamicParams = false;


export function generateStaticParams() {
  return SECTIONS.map((s) => ({ section: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/[section]">): Promise<Metadata> {
  const { section } = await params;
  return { title: SECTIONS.find((s) => s.id === section)?.name ?? "Not found" };
}

// Section hub (D-021): the entries of one section that the viewer's roles unlock, in the section's accent (D-041).
export default async function SectionPage({ params }: PageProps<"/[section]">) {
  const { section: id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const section = sectionsForRoles(viewer.roles).find((s) => s.id === id);
  if (!section) notFound();
  const accent = SECTION_ACCENTS[section.id];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className={cn("flex gap-4 rounded-2xl p-5 md:p-6", accent.soft)}>
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl bg-card shadow-xs", accent.text)}>
          <SectionIcon id={section.id} className="size-6" />
        </span>
        <div className="space-y-1">
          <p className={cn("text-sm font-semibold uppercase tracking-wide", accent.text)}>{section.tagline}</p>
          <h1 className="text-2xl font-bold tracking-tight">{section.name}</h1>
          <p className="text-muted-foreground">{section.description}</p>
        </div>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {section.items.map((item) => {
          const roleOnly = Boolean(item.roles);
          if (!item.available) {
            return (
              <li key={item.href}>
                <div
                  aria-disabled="true"
                  className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-dashed bg-card/60 px-4 text-muted-foreground"
                >
                  <span className="font-medium">{item.label}</span>
                  <Badge variant="neutral">{shellStrings.soon}</Badge>
                </div>
              </li>
            );
          }
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "group flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-l-4 bg-card px-4 hover:bg-muted/60",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  SECTION_ACCENTS[section.id].borderLeft,
                )}
              >
                <span className="flex flex-col">
                  <span className="font-semibold">{item.label}</span>
                  {roleOnly && <span className="text-xs text-muted-foreground">{shellStrings.sectionPage.roleOnly}</span>}
                </span>
                <ChevronRight className={cn("size-5 transition-transform group-hover:translate-x-0.5", accent.text)} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
