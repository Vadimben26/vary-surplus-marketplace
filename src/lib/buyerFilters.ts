/**
 * Seller-side buyer filters — single source of truth.
 *
 * A seller can constrain who sees / can buy their lots through 4 optional
 * filters stored as JSONB in `seller_preferences.buyer_filters`. All four
 * are combinable with AND logic; multi-select options inside a single
 * filter combine with OR. Empty / unset filter ⇒ allow everyone.
 *
 * The buyer side stores their own values on `buyer_preferences`:
 *   - shipping_country_for_filter (string)        → Filter 1
 *   - annual_revenue_range (string)               → Filter 2
 *   - resale_channels (text[])                    → Filter 3
 *   - categories (text[])                         → Filter 4
 *
 * If a buyer is missing a value for a filter the seller has set, the
 * buyer is considered NOT eligible for that filter (per spec).
 */

export const EU_COUNTRIES_24 = [
  "Allemagne", "Autriche", "Belgique", "Bulgarie", "Croatie", "Danemark",
  "Espagne", "Estonie", "Finlande", "France", "Grèce", "Hongrie",
  "Italie", "Lettonie", "Lituanie", "Luxembourg", "Pays-Bas", "Pologne",
  "Portugal", "République tchèque", "Roumanie", "Slovaquie", "Slovénie", "Suède",
] as const;

export type RevenueMinKey = "none" | "50k" | "100k" | "250k" | "500k";

export const REVENUE_MIN_OPTIONS: { key: RevenueMinKey; label: string; threshold: number }[] = [
  { key: "none", label: "Aucun minimum", threshold: 0 },
  { key: "50k",  label: "> 50 000 €",   threshold: 50_000 },
  { key: "100k", label: "> 100 000 €",  threshold: 100_000 },
  { key: "250k", label: "> 250 000 €",  threshold: 250_000 },
  { key: "500k", label: "> 500 000 €",  threshold: 500_000 },
];

/** Buyer-side annual revenue ranges (mid-point used for >= comparison). */
export const BUYER_REVENUE_RANGES: { key: string; label: string; min: number }[] = [
  { key: "lt50k",     label: "< 50 000 €",          min: 0 },
  { key: "50k_100k",  label: "50 000 – 100 000 €",  min: 50_000 },
  { key: "100k_250k", label: "100 000 – 250 000 €", min: 100_000 },
  { key: "250k_500k", label: "250 000 – 500 000 €", min: 250_000 },
  { key: "gt500k",    label: "> 500 000 €",         min: 500_000 },
];

export type ResaleChannel = "physical_store" | "own_ecommerce" | "third_party_platforms" | "wholesaler";

export const RESALE_CHANNELS: { key: ResaleChannel; label: string }[] = [
  { key: "physical_store",         label: "Boutique physique" },
  { key: "own_ecommerce",          label: "E-commerce propre (site web personnel)" },
  { key: "third_party_platforms",  label: "Vente sur plateformes tierces (Vinted, Whatnot, TikTok Shop, eBay, Amazon…)" },
  { key: "wholesaler",             label: "Grossiste / distributeur" },
];

export const CATEGORY_KEYS = ["clothing", "sneakers", "accessories"] as const;
export type CategoryKey = typeof CATEGORY_KEYS[number];

/** Shape of seller_preferences.buyer_filters JSONB. */
export interface BuyerFilters {
  countries?: string[];          // Filter 1 — empty ⇒ all 24 allowed
  min_revenue?: RevenueMinKey;   // Filter 2 — undefined or "none" ⇒ no minimum
  channels?: ResaleChannel[];    // Filter 3 — empty ⇒ all channels allowed
  categories?: CategoryKey[];    // Filter 4 — empty ⇒ all categories allowed
}

export const EMPTY_BUYER_FILTERS: BuyerFilters = {
  countries: [],
  min_revenue: "none",
  channels: [],
  categories: [],
};

/** Buyer values pulled from buyer_preferences for evaluation. */
export interface BuyerProfileForFilters {
  shipping_country_for_filter?: string | null;
  annual_revenue_range?: string | null;
  resale_channels?: string[] | null;
  categories?: string[] | null;
}

const revenueThreshold = (key?: RevenueMinKey | null): number => {
  if (!key || key === "none") return 0;
  return REVENUE_MIN_OPTIONS.find((o) => o.key === key)?.threshold ?? 0;
};

const buyerRevenueMin = (rangeKey?: string | null): number => {
  if (!rangeKey) return -1; // no value declared
  return BUYER_REVENUE_RANGES.find((r) => r.key === rangeKey)?.min ?? -1;
};

/**
 * Returns true if the buyer is eligible for a lot belonging to a seller
 * with these `buyer_filters`. Lot category is required when the seller
 * sets Filter 4 — pass it from the lot row.
 */
export const isBuyerEligible = (
  filters: BuyerFilters | null | undefined,
  buyer: BuyerProfileForFilters | null | undefined,
  lotCategory?: string | null,
): boolean => {
  if (!filters) return true;
  const f = filters;

  // Filter 1 — countries
  if (f.countries && f.countries.length > 0) {
    const country = buyer?.shipping_country_for_filter;
    if (!country || !f.countries.includes(country)) return false;
  }

  // Filter 2 — minimum annual revenue
  const minThr = revenueThreshold(f.min_revenue);
  if (minThr > 0) {
    const buyerMin = buyerRevenueMin(buyer?.annual_revenue_range);
    if (buyerMin < 0 || buyerMin < minThr) return false;
  }

  // Filter 3 — resale channel
  if (f.channels && f.channels.length > 0) {
    const buyerChannels = buyer?.resale_channels ?? [];
    if (buyerChannels.length === 0) return false;
    const overlap = f.channels.some((c) => buyerChannels.includes(c));
    if (!overlap) return false;
  }

  // Filter 4 — purchase categories: lot's category must overlap with the
  // seller's allowed list AND with the buyer's interests.
  if (f.categories && f.categories.length > 0) {
    if (!lotCategory) return false;
    const lc = lotCategory.toLowerCase();
    const matchSeller = f.categories.some((c) => lc.includes(c));
    if (!matchSeller) return false;
    const buyerCats = (buyer?.categories ?? []).map((c) => c.toLowerCase());
    if (buyerCats.length === 0) return false;
    const buyerOverlap = f.categories.some((c) => buyerCats.some((bc) => bc.includes(c) || c.includes(bc)));
    if (!buyerOverlap) return false;
  }

  return true;
};

/** True when the seller has at least one constraint set. */
export const hasAnyFilter = (filters: BuyerFilters | null | undefined): boolean => {
  if (!filters) return false;
  return (
    (filters.countries?.length ?? 0) > 0 ||
    (filters.min_revenue && filters.min_revenue !== "none") ||
    (filters.channels?.length ?? 0) > 0 ||
    (filters.categories?.length ?? 0) > 0
  );
};
