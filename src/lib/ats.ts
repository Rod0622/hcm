/* Keyword scoring for the ATS resume scanner.
   Deterministic and transparent: score = matched weight / total weight × 100.
   Missing a required keyword caps the score below the screen line (59). */

export type OpeningKeyword = {
  term: string;
  weight?: number;
  required?: boolean;
  aliases?: string[];
};

export type MatchResult = {
  score: number;
  matched: string[];
  missing: string[];
  missingRequired: string[];
};

export const SCREEN_THRESHOLD = 60;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Word-boundary match that tolerates terms with symbols ("c++", "next.js"). */
function containsTerm(haystack: string, term: string) {
  const pattern = new RegExp(`(?<![a-z0-9])${escapeRegExp(term.toLowerCase())}(?![a-z0-9])`);
  return pattern.test(haystack);
}

export function scoreResume(text: string, keywords: OpeningKeyword[]): MatchResult {
  const haystack = text.toLowerCase().replace(/\s+/g, " ");
  let totalWeight = 0;
  let matchedWeight = 0;
  const matched: string[] = [];
  const missing: string[] = [];
  const missingRequired: string[] = [];

  for (const kw of keywords) {
    const weight = kw.weight ?? (kw.required ? 2 : 1);
    totalWeight += weight;
    const terms = [kw.term, ...(kw.aliases ?? [])];
    if (terms.some((t) => containsTerm(haystack, t))) {
      matchedWeight += weight;
      matched.push(kw.term);
    } else {
      missing.push(kw.term);
      if (kw.required) missingRequired.push(kw.term);
    }
  }

  let score = totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 0;
  if (missingRequired.length > 0) score = Math.min(score, SCREEN_THRESHOLD - 1);

  return { score: Math.round(score * 10) / 10, matched, missing, missingRequired };
}
