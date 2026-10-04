"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { withdrawContactRequest } from "../actions";
import { flatsStrings } from "../strings";
import type { MyContactRequest } from "../types";

import { ConfirmActionButton } from "./ConfirmActionButton";
import { ContactRequestForm } from "./ContactRequestForm";

const s = flatsStrings.contact;

type Props = {
  listingId: string;
  myRequest: MyContactRequest | null;
  // False when the listing is paused, rented or expired: no new requests.
  open: boolean;
};

// What a visitor sees about contacting the lister: the form, or the state of their request.
export function ContactPanel({ listingId, myRequest, open }: Props) {
  const live = myRequest?.status === "pending" || myRequest?.status === "accepted";
  if (!live && !open) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          <h2>{s.title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {myRequest && (
          <p role="status" className="text-sm text-muted-foreground">
            {s[myRequest.status]}
          </p>
        )}
        {live && myRequest ? (
          <div className="flex flex-wrap gap-2">
            {myRequest.status === "accepted" && myRequest.conversationId && (
              <Button asChild className="h-11">
                <Link href={`/messages/${myRequest.conversationId}`}>{s.openChat}</Link>
              </Button>
            )}
            <ConfirmActionButton
              label={s.withdraw}
              question={s.withdrawQuestion}
              body={s.withdrawBody}
              confirmLabel={s.withdraw}
              cancelLabel={s.cancel}
              pendingLabel={s.withdrawing}
              successMessage={s.withdrawnToast}
              onConfirm={() => withdrawContactRequest({ requestId: myRequest.id, listingId })}
            />
          </div>
        ) : (
          <ContactRequestForm listingId={listingId} />
        )}
      </CardContent>
    </Card>
  );
}
