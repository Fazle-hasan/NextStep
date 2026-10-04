// Money is stored as integers in the smallest unit (paise) with a currency code (CLAUDE.md §6).
// Job and expected salaries are annual amounts.

const PAISE_PER_RUPEE = 100;
const RUPEES_PER_LAKH = 100_000;

export function lakhToPaise(lakh: number): number {
  return Math.round(lakh * RUPEES_PER_LAKH * PAISE_PER_RUPEE);
}

export function paiseToLakh(paise: number): number {
  return paise / (RUPEES_PER_LAKH * PAISE_PER_RUPEE);
}

function lakhText(paise: number): string {
  const lakh = paiseToLakh(paise);
  return Number.isInteger(lakh) ? String(lakh) : lakh.toFixed(1).replace(/\.0$/, "");
}

// "₹8–12 lakh a year", "From ₹8 lakh a year", "Up to ₹12 lakh a year" or null when nothing is set.
export function formatAnnualSalary(min: number | null | undefined, max: number | null | undefined): string | null {
  if (min != null && max != null) {
    return min === max ? `₹${lakhText(min)} lakh a year` : `₹${lakhText(min)}–${lakhText(max)} lakh a year`;
  }
  if (min != null) return `From ₹${lakhText(min)} lakh a year`;
  if (max != null) return `Up to ₹${lakhText(max)} lakh a year`;
  return null;
}
