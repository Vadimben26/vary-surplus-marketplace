/**
 * Transport pricing engine
 * Mirrors the formulas of Transport_matrix.xlsx (Compute_Transport sheet).
 *
 * Formula:
 *   shipping_cost = nb_pallets × cost_per_pallet(category) × pallet_coefficient(nb_pallets)
 *   minimum_basket = MAX(FLOOR_PRICE, MULTIPLE × shipping_cost)
 *
 * A buyer in country X can purchase a lot from country Y only if
 *   lot_price >= MULTIPLE × shipping_cost(Y → X, lot.pallets)
 */

export const FLOOR_PRICE = 300;
export const PRICE_TO_SHIPPING_MULTIPLE = 11;

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

/** Compute the minimum lot price required to ship from origin to destination. */
export const computeMinimumPrice = (
  origin: string,
  destination: string,
  pallets: number,
  matrix: ShippingMatrix,
): number | null => {
  const result = computeShippingCost(origin, destination, pallets, matrix);
  if (!result) return null;
  return Math.max(FLOOR_PRICE, PRICE_TO_SHIPPING_MULTIPLE * result.cost);
};

/** For a given origin + price + pallets, return the list of accessible/blocked countries. */
export interface CountryReach {
  country: string;
  accessible: boolean;
  shippingCost: number;
  minPrice: number;
  category: string;
}

export const computeCountryReach = (
  origin: string,
  lotPrice: number,
  pallets: number,
  matrix: ShippingMatrix,
): CountryReach[] => {
  // All distinct destination countries from the matrix
  const allCountries = Array.from(
    new Set(matrix.routes.map((r) => r.destination_country)),
  ).sort();

  return allCountries.map((country) => {
    const result = computeShippingCost(origin, country, pallets, matrix);
    if (!result) {
      return {
        country,
        accessible: false,
        shippingCost: 0,
        minPrice: 0,
        category: "—",
      };
    }
    const minPrice = Math.max(FLOOR_PRICE, PRICE_TO_SHIPPING_MULTIPLE * result.cost);
    return {
      country,
      accessible: lotPrice > 0 && lotPrice >= minPrice,
      shippingCost: Math.round(result.cost),
      minPrice: Math.round(minPrice),
      category: result.category,
    };
  });
};

/** Format a number as EUR with FR locale. */
export const fmtEur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
