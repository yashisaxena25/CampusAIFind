// AI MATCHING ENGINE — MVP implementation
//
// This module produces the same *shape* of output the full AI pipeline will:
// a 0-100 overall score, a per-signal breakdown, and human-readable reasons.
// Today the "text similarity" signal is computed with token-overlap
// (Jaccard similarity) instead of LLM embeddings, and there is no image
// signal yet, since no vision model / vector DB is wired up in this phase.
// Swap `textSimilarity()` for a real embeddings-cosine-similarity call and
// add an `imageScore` the same way — every other part of the pipeline
// (weights, thresholds, status labels) stays the same.

export type MatchableLost = {
  id: string;
  title: string;
  description: string;
  category: string;
  color?: string | null;
  brand?: string | null;
  identifying_features?: string | null;
  lost_location: string;
  lost_date: string;
};

export type MatchableFound = {
  id: string;
  title: string;
  description: string;
  category: string;
  color?: string | null;
  brand?: string | null;
  identifying_features?: string | null;
  found_location: string;
  found_date: string;
};

const STOPWORDS = new Set([
  "the","a","an","is","are","was","were","near","at","in","on","of","to","with",
  "and","it","this","that","i","my","found","lost","item","has","had","have",
  "small","some","one","near","by","for","from","been","there","been",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  Array.from(a).forEach((w) => {
    if (b.has(w)) intersection++;
  });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function normalize(s?: string | null) {
  return (s || "").trim().toLowerCase();
}

function locationOverlap(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  return jaccard(ta, tb);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db_ = new Date(b).getTime();
  if (isNaN(da) || isNaN(db_)) return 999;
  return Math.abs(db_ - da) / (1000 * 60 * 60 * 24);
}

export type MatchWeights = {
  text: number;
  category: number;
  color: number;
  brand: number;
  location: number;
  time: number;
};

// Configurable from the backend (per spec section 3). Sums to 1.0.
// Image weight (25%) is reserved but unused until vision AI is wired up —
// its share is currently folded into text (which is why text is higher
// here than the 30% in the target production split).
export const DEFAULT_WEIGHTS: MatchWeights = {
  text: 0.45,
  category: 0.20,
  color: 0.10,
  brand: 0.10,
  location: 0.10,
  time: 0.05,
};

export type MatchResult = {
  textScore: number;
  categoryScore: number;
  colorScore: number;
  brandScore: number;
  locationScore: number;
  timeScore: number;
  overallScore: number;
  reasons: string[];
  status: "possible_match" | "strong_match";
};

export function scoreMatch(
  lost: MatchableLost,
  found: MatchableFound,
  weights: MatchWeights = DEFAULT_WEIGHTS
): MatchResult {
  const reasons: string[] = [];

  const lostText = tokenize(
    `${lost.title} ${lost.description} ${lost.identifying_features || ""}`
  );
  const foundText = tokenize(
    `${found.title} ${found.description} ${found.identifying_features || ""}`
  );
  const textScore = jaccard(lostText, foundText);
  if (textScore > 0.15) reasons.push("Descriptions share several specific words and phrases");

  const categoryScore = normalize(lost.category) === normalize(found.category) ? 1 : 0;
  if (categoryScore) reasons.push(`Same category: ${lost.category}`);

  const colorScore =
    lost.color && found.color && normalize(lost.color) === normalize(found.color) ? 1 : 0;
  if (colorScore) reasons.push(`Same color: ${lost.color}`);

  const brandScore =
    lost.brand && found.brand && normalize(lost.brand) === normalize(found.brand) ? 1 : 0;
  if (brandScore) reasons.push(`Same brand: ${lost.brand}`);

  const locationScore = locationOverlap(lost.lost_location, found.found_location);
  if (locationScore > 0.2) reasons.push("Similar location reported");

  const daysApart = daysBetween(lost.lost_date, found.found_date);
  const timeScore = Math.max(0, 1 - daysApart / 14); // decays to 0 over 14 days
  if (daysApart <= 3) reasons.push(`Found within ${Math.round(daysApart)} day(s) of being lost`);

  const overallScore =
    textScore * weights.text +
    categoryScore * weights.category +
    colorScore * weights.color +
    brandScore * weights.brand +
    locationScore * weights.location +
    timeScore * weights.time;

  const pct = Math.round(overallScore * 100);

  if (reasons.length === 0) reasons.push("Some overlapping details detected");

  return {
    textScore,
    categoryScore,
    colorScore,
    brandScore,
    locationScore,
    timeScore,
    overallScore: pct,
    reasons,
    status: pct >= 65 ? "strong_match" : "possible_match",
  };
}

// Minimum score to bother surfacing/storing a match at all.
export const MATCH_SURFACE_THRESHOLD = 30;
