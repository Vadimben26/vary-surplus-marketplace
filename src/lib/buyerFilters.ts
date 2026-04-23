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
 *   - annual_revenue_range / annual_revenue       → Filter 2
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
  { key: "50k", label: "> 50 000 €", threshold: 50_000 },
  { key: "100k", label: "> 100 000 €", threshold: 100_000 },
  { key: "250k", label: "> 250 000 €", threshold: 250_000 },
  { key: "500k", label: "> 500 000 €", threshold: 500_000 },
];

export const BUYER_REVENUE_RANGES: { key: string; label: string; min: number }[] = [
  { key: "lt50k", label: "< 50 000 €", min: 0 },
  { key: "under50k", label: "< 50 000 €", min: 0 },
  { key: "50k_100k", label: "50 000 – 100 000 €", min: 50_000 },
  { key: "50k250k", label: "50 000 – 250 000 €", min: 50_000 },
  { key: "100k_250k", label: "100 000 – 250 000 €", min: 100_000 },
  { key: "250k_500k", label: "250 000 – 500 000 €", min: 250_000 },
  { key: "250k1m", label: "250 000 – 1 000 000 €", min: 250_000 },
  { key: "gt500k", label: "> 500 000 €", min: 500_000 },
  { key: "over1m", label: "> 1 000 000 €", min: 1_000_000 },
];

export type ResaleChannel = "physical_store" | "own_ecommerce" | "third_party_platforms" | "wholesaler";

export const RESALE_CHANNELS: { key: ResaleChannel; label: string }[] = [
  { key: "physical_store", label: "Boutique physique" },
  { key: "own_ecommerce", label: "E-commerce propre (site web personnel)" },
  { key: "third_party_platforms", label: "Vente sur plateformes tierces (Vinted, Whatnot, TikTok Shop, eBay, Amazon…)" },
  { key: "wholesaler", label: "Grossiste / distributeur" },
];

export const CATEGORY_KEYS = ["clothing", "sneakers", "accessories"] as const;
export type CategoryKey = typeof CATEGORY_KEYS[number];

export interface BuyerFilters {
  countries?: string[];
  min_revenue?: RevenueMinKey;
  channels?: ResaleChannel[];
  categories?: CategoryKey[];
}

export const EMPTY_BUYER_FILTERS: BuyerFilters = {
  countries: [],
  min_revenue: "none",
  channels: [],
  categories: [],
};

export interface BuyerProfileForFilters {
  shipping_country_for_filter?: string | null;
  annual_revenue_range?: string | null;
  annual_revenue?: string | null;
  resale_channels?: string[] | null;
  categories?: string[] | null;
}

const revenueThreshold = (key?: RevenueMinKey | null): number => {
  if (!key || key === "none") return 0;
  return REVENUE_MIN_OPTIONS.find((option) => option.key === key)?.threshold ?? 0;
};

const buyerRevenueMin = (rangeKey?: string | null): number => {
  if (!rangeKey || rangeKey === "none") return -1;
  return BUYER_REVENUE_RANGES.find((range) => range.key === rangeKey)?.min ?? -1;
};

export const isBuyerEligible = (
  filters: BuyerFilters | null | undefined,
  buyer: BuyerProfileForFilters | null | undefined,
  lotCategory?: string | null,
): boolean => {
  if (!filters) return true;

  if (filters.countries && filters.countries.length > 0) {
    const country = buyer?.shipping_country_for_filter;
    if (!country || !filters.countries.includes(country)) return false;
  }

  const minThreshold = revenueThreshold(filters.min_revenue);
  if (minThreshold > 0) {
    const buyerMin = buyerRevenueMin(buyer?.annual_revenue_range ?? buyer?.annual_revenue);
    if (buyerMin < 0 || buyerMin < minThreshold) return false;
  }

  if (filters.channels && filters.channels.length > 0) {
    const buyerChannels = buyer?.resale_channels ?? [];
    if (buyerChannels.length === 0) return false;
    if (!filters.channels.some((channel) => buyerChannels.includes(channel))) return false;
  }

  if (filters.categories && filters.categories.length > 0) {
    if (!lotCategory) return false;
    const normalizedLotCategory = lotCategory.toLowerCase();
    const sellerCategoryMatch = filters.categories.some((category) => normalizedLotCategory.includes(category));
    if (!sellerCategoryMatch) return false;

    const buyerCategories = (buyer?.categories ?? []).map((category) => category.toLowerCase());
    if (buyerCategories.length === 0) return false;

    const buyerCategoryMatch = filters.categories.some((category) =>
      buyerCategories.some((buyerCategory) => buyerCategory.includes(category) || category.includes(buyerCategory))
    );
    if (!buyerCategoryMatch) return false;
  }

  return true;
};

export const hasAnyFilter = (filters: BuyerFilters | null | undefined): boolean => {
  if (!filters) return false;
  return (
    (filters.countries?.length ?? 0) > 0 ||
    (filters.min_revenue && filters.min_revenue !== "none") ||
    (filters.channels?.length ?? 0) > 0 ||
    (filters.categories?.length ?? 0) > 0
  );
};
