import Link from "next/link";

import { Button } from "@/components/ui/button";
import { chatStrings as s } from "@/features/settle-in/chat/strings";

export default function ConversationNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{s.notFoundTitle}</h1>
      <p className="text-muted-foreground">{s.notFoundBody}</p>
      <Button asChild size="lg" className="h-11">
        <Link href="/messages">{s.back}</Link>
      </Button>
    </div>
  );
}
