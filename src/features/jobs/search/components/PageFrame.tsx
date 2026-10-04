import { cn } from "@/lib/utils";

type Props = {
  // True when the page is already inside the signed-in app shell (which provides <main> and padding).
  inShell: boolean;
  className?: string;
  children: React.ReactNode;
};

// Public pages render inside the app shell for signed-in users and on their own for visitors.
export function PageFrame({ inShell, className, children }: Props) {
  if (inShell) return <div className={cn("mx-auto w-full max-w-5xl", className)}>{children}</div>;
  return <main className={cn("mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-12 md:px-8", className)}>{children}</main>;
}
