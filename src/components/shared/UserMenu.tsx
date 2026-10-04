"use client";

import { Bell, LogOut, Plus, Settings, Shield } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/features/auth/actions";
import { ROLE_LABELS, type AppRole } from "@/lib/sections";

import { shellStrings } from "./strings";
import { ThemeMenuItems } from "./ThemeMenuItems";

type Props = { name: string; roles: AppRole[] };

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function UserMenu({ name, roles }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="size-11 rounded-full" aria-label={shellStrings.openMenu}>
          <Avatar>
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-2">
          <p className="truncate font-medium">{name}</p>
          {roles.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {ROLE_LABELS[role]}
                </Badge>
              ))}
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding">
            <Plus aria-hidden="true" />
            {shellStrings.addRole}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/notifications">
            <Bell aria-hidden="true" />
            {shellStrings.notifications}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings aria-hidden="true" />
            {shellStrings.settings}
          </Link>
        </DropdownMenuItem>
        {roles.includes("admin") && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield aria-hidden="true" />
              {shellStrings.adminLink}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <ThemeMenuItems />
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild variant="destructive">
            <button type="submit" className="w-full">
              <LogOut aria-hidden="true" />
              {shellStrings.signOut}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
