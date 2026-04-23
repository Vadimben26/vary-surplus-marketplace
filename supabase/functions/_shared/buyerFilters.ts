export type RevenueMinKey = "none" | "50k" | "100k" | "250k" | "500k";
export type ResaleChannel = "physical_store" | "own_ecommerce" | "third_party_platforms" | "wholesaler";
export type CategoryKey = "clothing" | "sneakers" | "accessories";

export interface BuyerFilters {
  countries?: string[];
  min_revenue?: RevenueMinKey;
  channels?: ResaleChannel[];
  categories?: CategoryKey[];
}

export interface BuyerProfileForFilters {
  shipping_country_for_filter?: string | null;
  annual_revenue_range?: string | null;
  annual_revenue?: string | null;
  resale_channels?: string[] | null;
  categories?: string[] | null;
}

const REVENUE_MIN_THRESHOLDS: Record<RevenueMinKey, number> = {
  none: 0,
  "50k": 50_000,
  "100k": 100_000,
  "250k": 250_000,
  "500k": 500_000,
};

const BUYER_REVENUE_MIN_BY_KEY: Record<string, number> = {
  lt50k: 0,
  under50k: 0,
  "50k_100k": 50_000,
  "50k250k": 50_000,
  "100k_250k": 100_000,
  "250k_500k": 250_000,
  "250k1m": 250_000,
  gt500k: 500_000,
  over1m: 1_000_000,
};

const buyerRevenueMin = (rangeKey?: string | null): number => {
  if (!rangeKey || rangeKey === "none") return -1;
  return BUYER_REVENUE_MIN_BY_KEY[rangeKey] ?? -1;
};

export const hasAnyFilter = (filters: BuyerFilters | null | undefined): boolean => {
  if (!filters) return false;
  return (
    (filters.countries?.length ?? 0) > 0 ||
    (!!filters.min_revenue && filters.min_revenue !== "none") ||
    (filters.channels?.length ?? 0) > 0 ||
    (filters.categories?.length ?? 0) > 0
  );
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

  const minThreshold = REVENUE_MIN_THRESHOLDS[filters.min_revenue ?? "none"] ?? 0;
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
