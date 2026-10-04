"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import { Noto_Naskh_Arabic } from "next/font/google";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { HADITHS, type Hadith } from "../data";
import { hadithStrings as s } from "../strings";

// Loaded only where the Arabic text is shown.
const arabicFont = Noto_Naskh_Arabic({ subsets: ["arabic"], weight: ["500"], display: "swap" });

// Hadith of the day (D-047). The server picks today's saying so the first paint is stable; "Show another"
// picks a different one at random in the browser.
export function HadithCard({ initial, className }: { initial: Hadith; className?: string }) {
  const [hadith, setHadith] = useState<Hadith>(initial);
  const isToday = hadith.id === initial.id;

  function showAnother() {
    const others = HADITHS.filter((h) => h.id !== hadith.id);
    setHadith(others[Math.floor(Math.random() * others.length)] ?? initial);
  }

  return (
    <figure
      aria-labelledby="hadith-heading"
      className={cn("relative space-y-4 rounded-2xl border bg-card p-5 shadow-sm md:p-6", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="hadith-heading" className="text-sm font-semibold tracking-wide text-primary uppercase">
          {isToday ? s.heading : s.otherHeading}
        </h2>
        <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-primary">{hadith.topic}</span>
      </div>

      <div aria-live="polite" className="space-y-3">
        <blockquote className="space-y-3">
          <p lang="ar" dir="rtl" className={cn(arabicFont.className, "text-2xl leading-loose text-foreground md:text-[1.7rem]")}>
            {hadith.arabic}
          </p>
          <p className="text-base text-pretty text-foreground md:text-lg">“{hadith.english}”</p>
        </blockquote>
        <figcaption className="space-y-1 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">— {hadith.saidBy}</p>
          <p>
            {hadith.source}
            {" · "}
            <a
              href={hadith.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              {s.readSource}
              <ExternalLink className="size-3.5" aria-hidden="true" />
              <span className="sr-only">{s.newTab}</span>
            </a>
          </p>
          <p className="text-xs">{s.translationNote}</p>
        </figcaption>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="h-10" onClick={showAnother}>
          <RefreshCw aria-hidden="true" />
          {s.another}
        </Button>
        {!isToday && (
          <Button type="button" variant="ghost" size="sm" className="h-10" onClick={() => setHadith(initial)}>
            {s.backToToday}
          </Button>
        )}
      </div>
    </figure>
  );
}
