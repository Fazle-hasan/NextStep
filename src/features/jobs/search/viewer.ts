import "server-only";

import { getViewer, type Viewer } from "@/features/auth/queries";

// Mirrors the (public) layout: onboarded, non-suspended members see public pages inside the app shell.
export async function getPublicPageViewer(): Promise<{ viewer: Viewer | null; inShell: boolean }> {
  const viewer = await getViewer();
  const inShell = Boolean(viewer?.profile.onboarding_completed_at && !viewer.profile.suspended_at);
  return { viewer, inShell };
}
