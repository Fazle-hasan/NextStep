import { redirect } from "next/navigation";

import { AppShell } from "@/components/shared/AppShell";
import { shellStrings } from "@/components/shared/strings";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getViewer } from "@/features/auth/queries";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  if (!viewer.profile.onboarding_completed_at) redirect("/onboarding");

  return (
    <AppShell viewer={viewer}>
      {viewer.profile.suspended_at ? (
        <Alert variant="destructive" className="mx-auto max-w-xl">
          <AlertTitle>{shellStrings.suspended.title}</AlertTitle>
          <AlertDescription>{shellStrings.suspended.body}</AlertDescription>
        </Alert>
      ) : (
        children
      )}
    </AppShell>
  );
}
