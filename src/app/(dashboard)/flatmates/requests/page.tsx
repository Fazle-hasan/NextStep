import type { Metadata } from "next";
import Link from "next/link";

import { requireViewer } from "@/features/auth/queries";
import { RequestCard } from "@/features/settle-in/flatmates/components/RequestCard";
import { getConnectionRequests } from "@/features/settle-in/flatmates/queries";
import { flatmateStrings as s } from "@/features/settle-in/flatmates/strings";
import type { ConnectionRequest } from "@/features/settle-in/flatmates/types";

export const metadata: Metadata = { title: s.requests.pageTitle };

type SectionProps = {
  id: string;
  title: string;
  empty: string;
  requests: ConnectionRequest[];
  direction: "incoming" | "sent";
};

function RequestSection({ id, title, empty, requests, direction }: SectionProps) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      {requests.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-4">
          {requests.map((request) => (
            <li key={request.id}>
              <RequestCard request={request} direction={direction} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function FlatmateRequestsPage() {
  const viewer = await requireViewer("/flatmates/requests");
  const { incoming, sent } = await getConnectionRequests(viewer.id);
  const r = s.requests;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-1">
        <Link href="/flatmates" className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:underline">
          ← {s.back}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{r.pageTitle}</h1>
        <p className="text-muted-foreground">{r.intro}</p>
      </header>

      <RequestSection id="incoming-heading" title={r.incoming} empty={r.incomingEmpty} requests={incoming} direction="incoming" />
      <RequestSection id="sent-heading" title={r.sent} empty={r.sentEmpty} requests={sent} direction="sent" />
    </div>
  );
}
