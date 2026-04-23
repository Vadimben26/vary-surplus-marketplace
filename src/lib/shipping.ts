/**
 * Transport pricing engine
 * Mirrors the formulas of Transport_matrix.xlsx (Compute_Transport sheet).
 *
 * Formula:
 *   shipping_cost = nb_pallets × cost_per_pallet(category) × pallet_coefficient(nb_pallets)
 *
 * Note: A flat minimum lot price of 500 € is enforced at the database level
 * via a CHECK constraint on `lots.price`. The marketplace no longer filters
 * lots by shipping coverage — sellers reach all 24 supported EU countries.
 */

export interface ShippingRoute {
  origin_country: string;
  destination_country: string;
  distance_km: number;
  category: "Court" | "Moyen" | "Long" | "Complexe";
}

export interface ShippingPricing {
  category: "Court" | "Moyen" | "Long" | "Complexe";
  cost_per_pallet: number;
}

export interface PalletCoefficient {
  max_pallets: number;
  coefficient: number;
  display_order: number;
}

export interface ShippingMatrix {
  routes: ShippingRoute[];
  pricing: ShippingPricing[];
  coefficients: PalletCoefficient[];
}

/** Get the pallet coefficient for a given pallet count. */
export const getPalletCoefficient = (
  pallets: number,
  coefficients: PalletCoefficient[],
): number => {
  const sorted = [...coefficients].sort((a, b) => a.display_order - b.display_order);
  for (const c of sorted) {
    if (pallets <= c.max_pallets) return c.coefficient;
  }
  return sorted[sorted.length - 1]?.coefficient ?? 1;
};

/** Get the per-pallet cost for a route category. */
export const getCostPerPallet = (
  category: ShippingRoute["category"],
  pricing: ShippingPricing[],
): number => pricing.find((p) => p.category === category)?.cost_per_pallet ?? 0;

/** Compute real shipping cost between two countries. Returns null if no route exists. */
export const computeShippingCost = (
  origin: string,
  destination: string,
  pallets: number,
  matrix: ShippingMatrix,
): { cost: number; category: string; route: ShippingRoute } | null => {
  if (!origin || !destination || origin === destination) {
    // Same country: assume Court category with coefficient
    const cost = pallets * getCostPerPallet("Court", matrix.pricing) *
      getPalletCoefficient(pallets, matrix.coefficients);
    return { cost, category: "Court", route: { origin_country: origin, destination_country: destination, distance_km: 0, category: "Court" } };
  }
  const route = matrix.routes.find(
    (r) => r.origin_country === origin && r.destination_country === destination,
  );
  if (!route) return null;
  const costPerPallet = getCostPerPallet(route.category, matrix.pricing);
  const coef = getPalletCoefficient(pallets, matrix.coefficients);
  return { cost: pallets * costPerPallet * coef, category: route.category, route };
};

/** Format a number as EUR with FR locale. */
export const fmtEur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;

/**
 * Group cart lots by seller and compute one shipping cost per seller group.
 * Each group is shipped from the seller's location to the buyer country, using
 * the SUM of pallets across all the seller's lots in the cart.
 */
export interface SellerShippingGroup {
  sellerId: string;
  sellerLocation: string;
  totalPallets: number;
  shippingCost: number;
  category: string | null;
  lotIds: string[];
}

export const computeMultiLotShipping = (
  lots: Array<{ id: string; seller_id: string; location?: string | null; pallets?: number | null }>,
  destinationCountry: string,
  matrix: ShippingMatrix,
): SellerShippingGroup[] => {
  const bySeller = new Map<string, SellerShippingGroup>();
  for (const lot of lots) {
    const key = lot.seller_id;
    const existing = bySeller.get(key);
    const pallets = Math.max(1, lot.pallets || 1);
    if (existing) {
      existing.totalPallets += pallets;
      existing.lotIds.push(lot.id);
    } else {
      bySeller.set(key, {
        sellerId: key,
        sellerLocation: lot.location || "",
        totalPallets: pallets,
        shippingCost: 0,
        category: null,
        lotIds: [lot.id],
      });
    }
  }
  // Compute one shipping cost per group from seller location → destination.
  for (const group of bySeller.values()) {
    const result = computeShippingCost(
      group.sellerLocation,
      destinationCountry,
      group.totalPallets,
      matrix,
    );
    group.shippingCost = result?.cost ?? 0;
    group.category = result?.category ?? null;
  }
  return Array.from(bySeller.values());
};
