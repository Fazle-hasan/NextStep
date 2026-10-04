import { Briefcase, GraduationCap, MapPin, type LucideProps } from "lucide-react";

import type { SectionId } from "@/lib/sections";

const ICONS = {
  "community-portal": Briefcase,
  "career-development": GraduationCap,
  "location-gathering": MapPin,
} as const;

export function SectionIcon({ id, ...props }: { id: SectionId } & LucideProps) {
  const Icon = ICONS[id];
  return <Icon aria-hidden="true" {...props} />;
}
