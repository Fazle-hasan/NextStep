import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { NavItem } from "@/lib/sections";
import { cn } from "@/lib/utils";

import { shellStrings } from "./strings";

type Props = {
  item: NavItem;
  active?: boolean;
  // Section colour for the active bar, e.g. "before:bg-learn" (D-041). Defaults to the brand colour.
  accentBar?: string;
  className?: string;
};

// A nav entry: a link when the feature is live, muted text with a "Soon" badge otherwise.
export function NavItemLink({ item, active = false, accentBar = "before:bg-primary", className }: Props) {
  const base = "flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 text-sm";

  if (!item.available) {
    return (
      <span aria-disabled="true" className={cn(base, "text-muted-foreground", className)}>
        {item.label}
        <Badge variant="outline" className="text-[0.65rem]">
          {shellStrings.soon}
        </Badge>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        base,
        "relative",
        active
          ? cn("bg-muted font-semibold text-foreground before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full", accentBar)
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {item.label}
    </Link>
  );
}
