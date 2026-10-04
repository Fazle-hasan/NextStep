import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { NavItem } from "@/lib/sections";
import { cn } from "@/lib/utils";

import { shellStrings } from "./strings";

type Props = { item: NavItem; active?: boolean; className?: string };

// A nav entry: a link when the feature is live, muted text with a "Soon" badge otherwise.
export function NavItemLink({ item, active = false, className }: Props) {
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
      className={cn(base, active ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted", className)}
    >
      {item.label}
    </Link>
  );
}
