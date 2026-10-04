import { cn } from "@/lib/utils";

// Decorative hero art: three rising steps in the section colours (Learn, Earn, Grow) under a crescent arch.
// Pure SVG with design tokens, so it follows light and dark mode. Hidden from assistive technology.
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 240" aria-hidden="true" className={cn("h-auto w-full", className)}>
      <circle cx="232" cy="64" r="34" className="fill-warning-soft" />
      <circle cx="246" cy="56" r="30" className="fill-brand-soft" />
      <path d="M40 200 Q160 40 280 200" className="fill-none stroke-primary/25" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />
      <rect x="44" y="150" width="64" height="58" rx="12" className="fill-learn-soft stroke-learn" strokeWidth="2" />
      <rect x="124" y="114" width="64" height="94" rx="12" className="fill-earn-soft stroke-earn" strokeWidth="2" />
      <rect x="204" y="78" width="64" height="130" rx="12" className="fill-grow-soft stroke-grow" strokeWidth="2" />
      {/* Learn: an open book */}
      <path d="M60 172 q8 -5 16 0 v14 q-8 -5 -16 0 z M76 172 q8 -5 16 0 v14 q-8 -5 -16 0 z" className="fill-none stroke-learn" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Earn: a briefcase */}
      <rect x="143" y="138" width="26" height="18" rx="3" className="fill-none stroke-earn" strokeWidth="2.5" />
      <path d="M150 138 v-4 h12 v4" className="fill-none stroke-earn" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Grow: a map pin */}
      <path d="M236 116 c-8 -9 -11 -14 -11 -19 a11 11 0 0 1 22 0 c0 5 -3 10 -11 19 z" className="fill-none stroke-grow" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="236" cy="97" r="4" className="fill-grow" />
      <rect x="28" y="208" width="264" height="4" rx="2" className="fill-border" />
    </svg>
  );
}
