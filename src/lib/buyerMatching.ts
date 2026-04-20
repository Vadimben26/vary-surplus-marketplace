/**
 * Buyer ↔ Lot matching algorithm.
 *
 * Computes a relevance score (0–100) for each lot against a buyer's
 * questionnaire (Step 2 of the buyer registration). Used to sort the
 * marketplace so the most relevant lots surface first.
 *
 * Scoring breakdown (weights tuned for B2B surplus matching):
 *   • Category match           → 40 pts  (must-have signal)
 *   • Delivery country match   → 25 pts  (logistics fit)
 *   • Budget fit (price ≤ max) → 20 pts  (financial fit)
 *   • Annual revenue tier fit  → 10 pts  (sizing fit)
 *   • Recency boost            →  5 pts  (fresh > 7d)
 *
 * A lot with no overlap still gets a baseline of 0; perfectly matched lots
 * approach 100. The matching is a soft sort, not a filter — out-of-match
 * lots remain visible at the bottom.
 */

export interface BuyerMatchProfile {
  categories?: string[] | null;
  delivery_countries?: string[] | null;
  shipping_country_for_filter?: string | null;
  annual_revenue?: string | null;
  // Free-form budget string from the questionnaire (kept for compatibility),
  // we parse it to a numeric ceiling when possible.
  budget?: string | null;
}

export interface ScoredLot {
  id: string;
  category?: string | null;
  location?: string | null;
  price: number;
  created_at?: string | null;
  [key: string]: any;
}

const CATEGORY_ALIASES: Record<string, string[]> = {
  clothing: ["clothing", "vêtements", "vetements", "ropa", "apparel"],
  sneakers: ["sneakers", "shoes", "chaussures", "zapatillas"],
  accessories: ["accessories", "accessoires", "accesorios"],
};

const REVENUE_BUDGET_CEILING: Record<string, number> = {
  none: 5_000,
  under50k: 15_000,
  "50k250k": 50_000,
  "250k1m": 150_000,
  over1m: Infinity,
};

const parseBudgetCeiling = (raw?: string | null): number => {
  if (!raw) return Infinity;
  // Accepts "10000", "10 000 €", "10k", "5-10k", etc. — take the upper bound.
  const cleaned = raw.toLowerCase().replace(/\s|€|eur/g, "");
  const k = cleaned.includes("k") ? 1_000 : 1;
  const nums = cleaned.match(/\d+(?:\.\d+)?/g);
  if (!nums?.length) return Infinity;
  const last = parseFloat(nums[nums.length - 1]);
  return last * k;
};

const matchesCategory = (lotCategory: string | null | undefined, buyerCats: string[]): boolean => {
  if (!lotCategory || buyerCats.length === 0) return false;
  const lc = lotCategory.toLowerCase();
  return buyerCats.some((bc) => {
    const aliases = CATEGORY_ALIASES[bc.toLowerCase()] ?? [bc.toLowerCase()];
    return aliases.some((a) => lc.includes(a));
  });
};

export const scoreLotForBuyer = (lot: ScoredLot, buyer: BuyerMatchProfile | null): number => {
  if (!buyer) return 0;
  let score = 0;

  // 1. Category fit (40 pts)
  const cats = buyer.categories ?? [];
  if (cats.length > 0 && matchesCategory(lot.category, cats)) {
    score += 40;
  }

  // 2. Delivery country fit (25 pts)
  const deliveryCountries = buyer.delivery_countries ?? [];
  const buyerCountry = buyer.shipping_country_for_filter;
  if (lot.location) {
    if (deliveryCountries.includes(lot.location)) score += 15;
    if (buyerCountry && lot.location === buyerCountry) score += 10;
  }

  // 3. Budget fit (20 pts) — graceful degradation
  const ceiling = Math.min(
    parseBudgetCeiling(buyer.budget),
    REVENUE_BUDGET_CEILING[buyer.annual_revenue ?? "none"] ?? Infinity
  );
  if (ceiling !== Infinity && lot.price > 0) {
    if (lot.price <= ceiling) score += 20;
    else if (lot.price <= ceiling * 1.5) score += 10; // soft tolerance
  } else {
    // No budget signal → neutral, give partial credit
    score += 10;
  }

  // 4. Revenue tier fit (10 pts) — proxy: bigger buyers prefer bigger lots
  const tier = buyer.annual_revenue ?? "none";
  if (tier === "over1m" && lot.price >= 20_000) score += 10;
  else if (tier === "250k1m" && lot.price >= 5_000 && lot.price <= 50_000) score += 10;
  else if (tier === "50k250k" && lot.price >= 1_000 && lot.price <= 15_000) score += 10;
  else if (tier === "under50k" && lot.price <= 5_000) score += 10;
  else score += 5;

  // 5. Recency boost (5 pts)
  if (lot.created_at) {
    const ageDays = (Date.now() - new Date(lot.created_at).getTime()) / 86_400_000;
    if (ageDays <= 7) score += 5;
    else if (ageDays <= 30) score += 2;
  }

  return Math.min(100, Math.round(score));
};

export const sortLotsByMatch = <T extends ScoredLot>(
  lots: T[],
  buyer: BuyerMatchProfile | null
): (T & { matchScore: number })[] => {
  if (!buyer) return lots.map((l) => ({ ...l, matchScore: 0 }));
  return lots
    .map((l) => ({ ...l, matchScore: scoreLotForBuyer(l, buyer) }))
    .sort((a, b) => b.matchScore - a.matchScore);
};
