import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminStrings } from "@/features/admin/strings";
import { SuspendButton } from "@/features/admin/users/components/SuspendButton";
import { searchUsers } from "@/features/admin/users/queries";
import { userSearchSchema } from "@/features/admin/users/schemas";
import { usersStrings as s } from "@/features/admin/users/strings";
import { getViewer } from "@/features/auth/queries";
import { ROLE_LABELS } from "@/lib/sections";
import { formatDate } from "@/lib/utils/dates";

export const metadata: Metadata = { title: s.title };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const search = userSearchSchema.parse(await searchParams);
  const [users, viewer] = await Promise.all([searchUsers(search), getViewer()]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← {adminStrings.title}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
        <p className="text-muted-foreground">{s.description}</p>
      </div>

      <form method="get" className="space-y-3 rounded-xl border p-4">
        <div className="space-y-2">
          <Label htmlFor="user-q">{s.searchLabel}</Label>
          <Input id="user-q" name="q" defaultValue={search.q} placeholder={s.searchPlaceholder} maxLength={80} className="h-11" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="suspended" value="1" defaultChecked={search.suspended} className="size-4" />
            {s.suspendedOnly}
          </label>
          <Button type="submit" className="h-11">
            {s.search}
          </Button>
        </div>
      </form>

      {users === null ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">{s.hint}</p>
      ) : users.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">{s.empty}</p>
      ) : (
        <ul className="space-y-3">
          {users.map((user) => {
            const name = user.name ?? adminStrings.unnamed;
            const isAdmin = user.roles.includes("admin");
            return (
              <li key={user.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        <span className="break-words">{name}</span>
                        {user.suspendedAt && <StatusBadge tone="danger" label={s.suspended} />}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user.cityName ?? s.noCity} · {s.joined(formatDate(user.joinedAt))}
                      </p>
                      <p className="flex flex-wrap gap-1">
                        {user.roles.length === 0 ? (
                          <span className="text-sm text-muted-foreground">{s.noRoles}</span>
                        ) : (
                          user.roles.map((role) => (
                            <Badge key={role} variant="secondary">
                              {ROLE_LABELS[role]}
                            </Badge>
                          ))
                        )}
                      </p>
                    </div>
                    {/* Admins and your own account cannot be suspended (the database refuses too). */}
                    {!isAdmin && user.id !== viewer?.id && (
                      <SuspendButton userId={user.id} name={name} suspended={Boolean(user.suspendedAt)} />
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
