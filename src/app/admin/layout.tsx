import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/shared/AppShell";
import { getViewer } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";

// Admin area: hidden (404) for everyone who is not an admin. Data access is also enforced by RLS.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/admin");

  const supabase = await createClient();
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || !isAdmin) notFound();

  return <AppShell viewer={viewer}>{children}</AppShell>;
}
