import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { NavItemLink } from "@/components/shared/NavItemLink";
import { SectionIcon } from "@/components/shared/SectionIcon";
import { Card, CardContent } from "@/components/ui/card";
import { getViewer } from "@/features/auth/queries";
import { SECTIONS, sectionsForRoles } from "@/lib/sections";

export const dynamicParams = false;

export function generateStaticParams() {
  return SECTIONS.map((s) => ({ section: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/[section]">): Promise<Metadata> {
  const { section } = await params;
  return { title: SECTIONS.find((s) => s.id === section)?.name ?? "Not found" };
}

// Section hub (D-021): the entries of one section that the viewer's roles unlock.
export default async function SectionPage({ params }: PageProps<"/[section]">) {
  const { section: id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const section = sectionsForRoles(viewer.roles).find((s) => s.id === id);
  if (!section) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">{section.tagline}</p>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <SectionIcon id={section.id} className="size-6 text-primary" />
          {section.name}
        </h1>
        <p className="text-muted-foreground">{section.description}</p>
      </header>
      <Card>
        <CardContent>
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.href}>
                <NavItemLink item={item} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
