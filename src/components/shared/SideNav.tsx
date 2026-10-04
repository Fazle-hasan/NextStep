"use client";

import { Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { accountNavForRoles, sectionsForRoles, type AppRole } from "@/lib/sections";
import { cn } from "@/lib/utils";

import { NavItemLink } from "./NavItemLink";
import { SectionIcon } from "./SectionIcon";
import { shellStrings } from "./strings";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav({ roles }: { roles: AppRole[] }) {
  const pathname = usePathname();
  const sections = sectionsForRoles(roles);
  const account = accountNavForRoles(roles);

  return (
    <nav aria-label={shellStrings.mainNav} className="space-y-6 p-4">
      <Link
        href="/home"
        aria-current={pathname === "/home" ? "page" : undefined}
        className={cn(
          "flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium",
          pathname === "/home" ? "bg-primary/10 text-primary" : "hover:bg-muted",
        )}
      >
        <Home className="size-4" aria-hidden="true" />
        {shellStrings.home}
      </Link>

      {sections.map((section) => (
        <div key={section.id} className="space-y-1">
          <Link
            href={`/${section.id}`}
            aria-current={pathname === `/${section.id}` ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold",
              pathname === `/${section.id}` ? "bg-primary/10 text-primary" : "hover:bg-muted",
            )}
          >
            <SectionIcon id={section.id} className="size-4" />
            {section.name}
          </Link>
          <ul className="space-y-0.5 pl-6">
            {section.items.map((item) => (
              <li key={item.href}>
                <NavItemLink item={item} active={isActive(pathname, item.href)} />
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="space-y-1 border-t pt-4">
        <p className="px-3 text-xs font-medium uppercase text-muted-foreground">{shellStrings.accountNav}</p>
        <ul className="space-y-0.5">
          {account.map((item) => (
            <li key={item.href}>
              <NavItemLink item={item} active={isActive(pathname, item.href)} />
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
