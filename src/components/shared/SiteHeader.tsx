import Link from "next/link";

import { Button } from "@/components/ui/button";

import { BrandMark } from "./BrandMark";
import { shellStrings } from "./strings";

// Public header for signed-out pages.
export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-8">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
        <BrandMark />
        {shellStrings.brand}
      </Link>
      <Button asChild size="lg" variant={signedIn ? "default" : "outline"} className="h-10">
        <Link href={signedIn ? "/home" : "/sign-in"}>{signedIn ? shellStrings.goToDashboard : shellStrings.signIn}</Link>
      </Button>
    </header>
  );
}
