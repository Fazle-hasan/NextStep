import Link from "next/link";

import { Button } from "@/components/ui/button";

import { areaStrings as s } from "../strings";
import type { AreaTip } from "../types";
import { TipForm } from "./TipForm";
import { TipItem } from "./TipItem";

type Props = {
  neighbourhoodId: string;
  tips: AreaTip[];
  signedIn: boolean;
  canPost: boolean;
  // Where to come back to after signing in.
  returnPath: string;
};

// Community tips for a neighbourhood: list, upvotes, and the post form for verified buddies.
export function TipsSection({ neighbourhoodId, tips, signedIn, canPost, returnPath }: Props) {
  return (
    <section aria-labelledby="area-tips" className="space-y-3">
      <div className="space-y-1">
        <h2 id="area-tips" className="text-lg font-semibold">
          {s.tips.title}
        </h2>
        <p className="text-sm text-muted-foreground">{s.tips.intro}</p>
      </div>

      {canPost && <TipForm neighbourhoodId={neighbourhoodId} />}

      {tips.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">{s.tips.empty}</p>
      ) : (
        <ul className="space-y-3">
          {tips.map((tip) => (
            <TipItem key={tip.id} tip={tip} signedIn={signedIn} />
          ))}
        </ul>
      )}

      {!signedIn && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{s.tips.signInPrompt}</span>
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href={`/sign-in?next=${encodeURIComponent(returnPath)}`}>{s.tips.signIn}</Link>
          </Button>
        </div>
      )}
      {signedIn && !canPost && (
        <p className="text-sm text-muted-foreground">
          {s.tips.buddyOnly}{" "}
          <Link href="/buddy" className="font-medium text-foreground underline underline-offset-4">
            {s.tips.becomeBuddy}
          </Link>
        </p>
      )}
    </section>
  );
}
