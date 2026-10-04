import type { SectionId } from "@/lib/sections";

// Section accents (D-041): Earn = teal, Learn = indigo, Grow = terracotta. Used for icons, nav indicators
// and small highlights only; page backgrounds and status colours stay the same in every section.
export type SectionAccent = {
  text: string;
  soft: string;
  // Left bar on active nav items.
  bar: string;
  border: string;
  // Card accent edges (literal classes so Tailwind generates them).
  borderTop: string;
  borderLeft: string;
  // Solid accent fill, e.g. the active tab indicator.
  fill: string;
};

export const SECTION_ACCENTS: Record<SectionId, SectionAccent> = {
  "community-portal": { text: "text-earn", soft: "bg-earn-soft", bar: "before:bg-earn", border: "border-earn", borderTop: "border-t-earn", borderLeft: "border-l-earn", fill: "bg-earn" },
  "career-development": { text: "text-learn", soft: "bg-learn-soft", bar: "before:bg-learn", border: "border-learn", borderTop: "border-t-learn", borderLeft: "border-l-learn", fill: "bg-learn" },
  "location-gathering": { text: "text-grow", soft: "bg-grow-soft", bar: "before:bg-grow", border: "border-grow", borderTop: "border-t-grow", borderLeft: "border-l-grow", fill: "bg-grow" },
};
