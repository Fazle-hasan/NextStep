import { ArrowRight, CalendarClock, FileText, MessageCircle, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";

import type { Viewer } from "@/features/auth/queries";
import { getUpcomingSessionCount } from "@/features/mentorship/booking/queries";
import type { PendingVerification } from "@/features/profiles/queries";
import { getSeekerProfileData, profileGaps } from "@/features/profiles/seeker/queries";
import { getUnreadConversationCount } from "@/features/settle-in/chat/queries";

import { StatusBadge } from "../StatusBadge";
import { shellStrings } from "../strings";

const s = shellStrings.home_;

type Step = {
  key: string;
  icon: LucideIcon;
  text: string;
  href: string;
  action: string;
  badge?: React.ReactNode;
};

// Each check is independent: a failed query just drops its step instead of breaking the dashboard.
async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

type Props = { viewer: Viewer; verifications: PendingVerification[] };

// "Your next steps": only items backed by the viewer's real data.
export async function NextSteps({ viewer, verifications }: Props) {
  const isSeeker = viewer.roles.includes("job_seeker");
  const [unread, upcoming, seeker] = await Promise.all([
    safe(getUnreadConversationCount(), 0),
    safe(getUpcomingSessionCount(viewer.id), 0),
    isSeeker ? safe(getSeekerProfileData(viewer.id), null) : Promise.resolve(null),
  ]);

  const steps: Step[] = [];

  if (viewer.roles.length === 0) {
    steps.push({ key: "roles", icon: UserRound, text: s.steps.noRoles, href: "/onboarding", action: s.steps.noRolesAction });
  }
  if (unread > 0) {
    steps.push({ key: "unread", icon: MessageCircle, text: s.steps.unread(unread), href: "/messages", action: s.steps.unreadAction });
  }
  if (upcoming > 0) {
    steps.push({ key: "sessions", icon: CalendarClock, text: s.steps.upcoming(upcoming), href: "/sessions", action: s.steps.upcomingAction });
  }
  for (const v of verifications) {
    if (v.status === "approved") continue;
    const kind = s.verificationKinds[v.kind] ?? v.kind;
    steps.push({
      key: `verification-${v.id}`,
      icon: ShieldCheck,
      text: v.status === "pending" ? s.steps.verificationPending(kind) : s.steps.verificationRejected(kind),
      href: "#verification-heading",
      action: s.verificationHeading,
      badge: <StatusBadge status={v.status} label={s.statusBadge[v.status] ?? v.status} />,
    });
  }
  if (seeker) {
    const gaps = profileGaps(seeker);
    if (gaps.includes("cv")) {
      steps.push({ key: "cv", icon: FileText, text: s.steps.uploadCv, href: "/profile", action: s.steps.uploadCvAction });
    } else if (gaps.length > 0) {
      steps.push({ key: "profile", icon: UserRound, text: s.steps.completeProfile, href: "/profile", action: s.steps.completeProfileAction });
    }
  }

  return (
    <section aria-labelledby="next-steps-heading" className="space-y-3">
      <h2 id="next-steps-heading" className="text-lg font-semibold">
        {s.nextStepsHeading}
      </h2>
      {steps.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card px-4 py-5 text-sm text-muted-foreground">{s.nextStepsEmpty}</p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {steps.map(({ key, icon: Icon, text, href, action, badge }) => (
            <li key={key} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-primary">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <p className="min-w-0 flex-1 text-sm font-medium">{text}</p>
              {badge}
              <Link
                href={href}
                className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                {action}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
