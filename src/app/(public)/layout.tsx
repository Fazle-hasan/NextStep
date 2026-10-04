import { AppShell } from "@/components/shared/AppShell";
import { SiteHeader } from "@/components/shared/SiteHeader";
import { getViewer } from "@/features/auth/queries";

// Public pages. Signed-in, onboarded members keep their app navigation; everyone else gets the site header.
export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();

  if (viewer?.profile.onboarding_completed_at && !viewer.profile.suspended_at) {
    return <AppShell viewer={viewer}>{children}</AppShell>;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader signedIn={viewer !== null} />
      {children}
    </div>
  );
}
