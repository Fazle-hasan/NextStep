// Regenerates src/features/hadith/hadiths.json from run/hadith_of_the_day.md (D-047).
// Run after editing the Markdown:  pnpm hadith:sync
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { parseHadithMarkdown } from "../src/features/hadith/parse.ts";

const root = join(import.meta.dirname, "..");
const markdown = readFileSync(join(root, "run", "hadith_of_the_day.md"), "utf8");
const hadiths = parseHadithMarkdown(markdown);
writeFileSync(join(root, "src", "features", "hadith", "hadiths.json"), `${JSON.stringify(hadiths, null, 2)}\n`);
console.log(`Wrote ${hadiths.length} sayings to src/features/hadith/hadiths.json`);
