import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import hadiths from "./hadiths.json";
import { hadithIndexForDate, parseHadithMarkdown } from "./parse";

const markdown = readFileSync(join(process.cwd(), "run", "hadith_of_the_day.md"), "utf8");

describe("hadith of the day data", () => {
  it("matches run/hadith_of_the_day.md (run `pnpm hadith:sync` after editing it)", () => {
    expect(parseHadithMarkdown(markdown)).toEqual(hadiths);
  });

  it("has 50 complete sayings with unique ids", () => {
    expect(hadiths).toHaveLength(50);
    expect(new Set(hadiths.map((h) => h.id)).size).toBe(50);
    for (const h of hadiths) {
      expect(h.arabic.length).toBeGreaterThan(0);
      expect(h.english.length).toBeLessThanOrEqual(200);
      expect(h.link.startsWith("https://")).toBe(true);
    }
  });
});

describe("parseHadithMarkdown", () => {
  const entry = (id: number, link = "https://al-islam.org/x") =>
    `## ${id} · Patience\n\n> نص\n\n**English:** Be patient.\n\n- **Said by:** Imam Ali (a.s.)\n- **Source:** Ghurar al-Hikam\n- **Link:** ${link}\n`;

  it("reads every field and ignores the file header", () => {
    expect(parseHadithMarkdown(`# Title\n\nIntro\n\n${entry(7)}`)).toEqual([
      {
        id: 7,
        topic: "Patience",
        arabic: "نص",
        english: "Be patient.",
        saidBy: "Imam Ali (a.s.)",
        source: "Ghurar al-Hikam",
        link: "https://al-islam.org/x",
      },
    ]);
  });

  it("rejects incomplete entries, duplicate ids and non-https links", () => {
    expect(() => parseHadithMarkdown("# T\n\n## 1 · Patience\n\n> نص\n")).toThrow(/missing/);
    expect(() => parseHadithMarkdown(`# T\n\n${entry(1)}\n${entry(1)}`)).toThrow(/Duplicate/);
    expect(() => parseHadithMarkdown(`# T\n\n${entry(1, "http://al-islam.org/x")}`)).toThrow(/https/);
  });
});

describe("hadithIndexForDate", () => {
  it("is the same all day in India and changes at midnight IST", () => {
    const morning = hadithIndexForDate(new Date("2026-10-04T00:30:00+05:30"), 50);
    const night = hadithIndexForDate(new Date("2026-10-04T23:59:00+05:30"), 50);
    const nextDay = hadithIndexForDate(new Date("2026-10-05T00:01:00+05:30"), 50);
    expect(night).toBe(morning);
    expect(nextDay).toBe((morning + 1) % 50);
  });
});
