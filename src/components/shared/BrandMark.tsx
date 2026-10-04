import { cn } from "@/lib/utils";

// NextStep mark: three rising steps (Learn, Earn, Grow). Decorative; the brand name is always next to it.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className={cn("size-7 shrink-0", className)}>
      <rect width="28" height="28" rx="8" className="fill-primary" />
      <rect x="6" y="16" width="4.5" height="6" rx="1.2" className="fill-primary-foreground" opacity="0.7" />
      <rect x="11.75" y="11.5" width="4.5" height="10.5" rx="1.2" className="fill-primary-foreground" opacity="0.85" />
      <rect x="17.5" y="6" width="4.5" height="16" rx="1.2" className="fill-primary-foreground" />
    </svg>
  );
}
