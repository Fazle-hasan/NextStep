// Parses run/hadith_of_the_day.md into structured sayings (D-047).
// Kept free of path aliases and imports so `scripts/sync-hadith.ts` can run it with plain Node.

export type Hadith = {
  id: number;
  topic: string;
  arabic: string;
  english: string;
  saidBy: string;
  source: string;
  link: string;
};

const HEADING = /^## (\d+) · (.+)$/m;
const ARABIC = /^> (.+)$/m;
const ENGLISH = /^\*\*English:\*\* (.+)$/m;
const SAID_BY = /^- \*\*Said by:\*\* (.+)$/m;
const SOURCE = /^- \*\*Source:\*\* (.+)$/m;
const LINK = /^- \*\*Link:\*\* (\S+)$/m;

function field(block: string, pattern: RegExp, name: string, id: string): string {
  const value = block.match(pattern)?.[1]?.trim();
  if (!value) throw new Error(`Hadith ${id}: missing ${name}`);
  return value;
}

// Each saying starts with "## <id> · <Topic>" (see the file's header). Throws on any malformed entry,
// duplicate id or non-https link, so a bad edit fails the sync and the tests instead of reaching the site.
export function parseHadithMarkdown(markdown: string): Hadith[] {
  const blocks = markdown.replace(/\r\n/g, "\n").split(/\n(?=## \d+ · )/).slice(1);
  const seen = new Set<number>();

  return blocks.map((block) => {
    const heading = block.match(HEADING);
    if (!heading?.[1] || !heading[2]) throw new Error(`Malformed hadith heading: ${block.slice(0, 40)}`);
    const id = Number(heading[1]);
    if (seen.has(id)) throw new Error(`Duplicate hadith id ${id}`);
    seen.add(id);

    const link = field(block, LINK, "link", heading[1]);
    if (!/^https:\/\/[^\s]+$/.test(link)) throw new Error(`Hadith ${id}: link must be https`);

    return {
      id,
      topic: heading[2].trim(),
      arabic: field(block, ARABIC, "Arabic text", heading[1]),
      english: field(block, ENGLISH, "English", heading[1]),
      saidBy: field(block, SAID_BY, "Said by", heading[1]),
      source: field(block, SOURCE, "Source", heading[1]),
      link,
    };
  });
}

// The saying for a calendar day in India (IST), so everyone sees the same one and it changes at midnight IST.
export function hadithIndexForDate(date: Date, count: number): number {
  const istDay = Math.floor((date.getTime() + 5.5 * 60 * 60 * 1000) / 86_400_000);
  return ((istDay % count) + count) % count;
}
