import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { SetPasswordForm } from "@/features/auth/components/SetPasswordForm";
import { requireViewer } from "@/features/auth/queries";
import { passwordStrings as s } from "@/features/auth/strings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: s.pageTitle };

// Settings → Password: lets a member add email + password sign-in next to email codes.
export default async function PasswordSettingsPage() {
  await requireViewer("/settings/password");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const hasEmail = Boolean(data.user?.email);

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{s.pageTitle}</h1>
        <p className="text-muted-foreground">{s.intro}</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          {hasEmail ? <SetPasswordForm /> : <p className="text-sm text-muted-foreground">{s.needsEmail}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
