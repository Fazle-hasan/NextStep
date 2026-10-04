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
      {signedIn ? (
        <Button asChild size="lg" className="h-10">
          <Link href="/home">{shellStrings.goToDashboard}</Link>
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <Button asChild size="lg" variant="ghost" className="h-10">
            <Link href="/sign-in">{shellStrings.signIn}</Link>
          </Button>
          <Button asChild size="lg" className="h-10">
            <Link href="/sign-up">{shellStrings.signUp}</Link>
          </Button>
        </div>
      )}
    </header>
  );
}
