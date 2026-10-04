import type { Metadata } from "next";
import Link from "next/link";

import { requireViewer } from "@/features/auth/queries";
import { RequestForm } from "@/features/settle-in/relocation/components/RequestForm";
import { emptyRequestForm } from "@/features/settle-in/relocation/defaults";
import { getCities, getNeighbourhoods } from "@/features/settle-in/relocation/queries";
import { relocationStrings } from "@/features/settle-in/relocation/strings";

export const metadata: Metadata = { title: "Ask for help settling in" };

const s = relocationStrings.form;

export default async function NewRelocationRequestPage() {
  await requireViewer("/settle-in/new");
  const [cities, neighbourhoods] = await Promise.all([getCities(), getNeighbourhoods()]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <Link href="/settle-in" className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:underline">
        ← {s.back}
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{s.newTitle}</h1>
        <p className="text-muted-foreground">{s.newIntro}</p>
      </div>
      <RequestForm defaults={emptyRequestForm()} cities={cities} neighbourhoods={neighbourhoods} />
    </div>
  );
}
