"use client";

import { Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SECTIONS } from "@/lib/sections";
import { cn } from "@/lib/utils";

import { SectionIcon } from "./SectionIcon";
import { shellStrings } from "./strings";

// Mobile-only tab bar: Home plus the three sections.
export function BottomNav() {
  const pathname = usePathname();
  const tabs = [
    { href: "/home", label: shellStrings.bottomNav.home, fullName: shellStrings.home, icon: <Home className="size-5" aria-hidden="true" /> },
    ...SECTIONS.map((s) => ({
      href: `/${s.id}`,
      label: shellStrings.bottomNav[s.id],
      fullName: s.name,
      icon: <SectionIcon id={s.id} className="size-5" />,
    })),
  ];

  return (
    <nav
      aria-label={shellStrings.mainNav}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-label={tab.fullName}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs",
                  active ? "font-medium text-primary" : "text-muted-foreground",
                )}
              >
                {tab.icon}
                <span aria-hidden="true">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
