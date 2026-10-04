import hadiths from "./hadiths.json";
import { hadithIndexForDate, type Hadith } from "./parse";

// Generated from run/hadith_of_the_day.md by `pnpm hadith:sync` (D-047). Do not edit the JSON by hand.
export const HADITHS: readonly Hadith[] = hadiths;

export function hadithOfTheDay(now: Date = new Date()): Hadith {
  return HADITHS[hadithIndexForDate(now, HADITHS.length)]!;
}

export type { Hadith };
