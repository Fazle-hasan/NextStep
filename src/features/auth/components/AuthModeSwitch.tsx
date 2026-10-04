import Link from "next/link";

import { cn } from "@/lib/utils";

import { authStrings } from "../strings";

type Props = { mode: "login" | "signup"; next?: string };

// The two buttons at the top of the log-in and sign-up pages.
export function AuthModeSwitch({ mode, next }: Props) {
  const query = next ? `?next=${encodeURIComponent(next)}` : "";
  const options = [
    { key: "login", href: `/sign-in${query}`, label: authStrings.logInButton },
    { key: "signup", href: `/sign-up${query}`, label: authStrings.signUpButton },
  ] as const;

  return (
    <nav aria-label={authStrings.modeSwitch} className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
      {options.map((option) => {
        const active = option.key === mode;
        return (
          <Link
            key={option.key}
            href={option.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center justify-center rounded-lg text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
