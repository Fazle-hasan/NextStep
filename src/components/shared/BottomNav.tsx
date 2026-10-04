"use client";

import { Home, MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SECTIONS, type SectionId } from "@/lib/sections";
import { cn } from "@/lib/utils";

import { SECTION_ACCENTS } from "./sectionStyles";
import { SectionIcon } from "./SectionIcon";
import { shellStrings } from "./strings";

type Tab = { href: string; label: string; fullName: string; icon: React.ReactNode; section?: SectionId };

// Mobile-only tab bar: Home · Earn · Learn · Grow · Inbox (D-041).
// The active tab has a bar above it, a tinted icon pill and bold text, so it never relies on colour alone.
export function BottomNav({ inboxBadge }: { inboxBadge?: React.ReactNode }) {
  const pathname = usePathname();
  const tabs: Tab[] = [
    { href: "/home", label: shellStrings.bottomNav.home, fullName: shellStrings.home, icon: <Home className="size-5" aria-hidden="true" /> },
    ...SECTIONS.map((s) => ({
      href: `/${s.id}`,
      label: shellStrings.bottomNav[s.id],
      fullName: s.name,
      icon: <SectionIcon id={s.id} className="size-5" />,
      section: s.id,
    })),
    {
      href: "/messages",
      label: shellStrings.bottomNav.inbox,
      fullName: shellStrings.inbox,
      icon: <MessageCircle className="size-5" aria-hidden="true" />,
    },
  ];

  return (
    <nav
      aria-label={shellStrings.mainNav}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const accent = tab.section ? SECTION_ACCENTS[tab.section] : null;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-label={tab.fullName}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[0.7rem] leading-tight",
                  "focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ring",
                  active ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className={cn("absolute inset-x-4 top-0 h-0.5 rounded-full", accent ? accent.fill : "bg-primary")}
                  />
                )}
                <span
                  className={cn(
                    "relative flex h-7 w-12 items-center justify-center rounded-full",
                    active && (accent ? cn(accent.soft, accent.text) : "bg-brand-soft text-primary"),
                  )}
                >
                  {tab.icon}
                  {tab.href === "/messages" && inboxBadge}
                </span>
                <span aria-hidden="true">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
