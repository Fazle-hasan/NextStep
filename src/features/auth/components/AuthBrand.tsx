import Link from "next/link";

import { BrandMark } from "@/components/shared/BrandMark";

// Logo above the log-in, sign-up and password pages.
export function AuthBrand() {
  return (
    <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
      <BrandMark />
      NextStep
    </Link>
  );
}
