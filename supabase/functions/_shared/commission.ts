// =============================================================================
// VARY — Commission engine (Deno mirror for Edge Functions)
// -----------------------------------------------------------------------------
// Keep in sync with src/lib/commission.ts. Two copies on purpose: the client
// uses the @/lib alias, Deno Edge Functions cannot import from src/.
// =============================================================================

export interface CommissionInput {
  lotPrice: number;
  buyerOrderCountThisMonth: number;
  sellerSaleCountThisMonth: number;
  sellerLifetimeSaleCount: number;
  isBuyerFirstEverPurchase: boolean;
}

export interface CommissionResult {
  sellerRate: number;
  buyerRate: number;
  sellerCommission: number;
  buyerCommission: number;
  tierLabel: string;
  tier:
    | "standard"
    | "large_lot"
    | "buyer_3rd_month"
    | "seller_3rd_month"
    | "new_seller"
    | "new_buyer";
}

const STRIPE_PERCENT = 0.015 + 0.0025;
const STRIPE_FIXED = 0.25;

export function computeStripeFee(buyerPaidTotal: number): number {
  return Math.round((buyerPaidTotal * STRIPE_PERCENT + STRIPE_FIXED) * 100) / 100;
}

export function computeCommission(input: CommissionInput): CommissionResult {
  const {
    lotPrice,
    buyerOrderCountThisMonth,
    sellerSaleCountThisMonth,
    sellerLifetimeSaleCount,
    isBuyerFirstEverPurchase,
  } = input;

  let sellerRate = 0.08;
  let buyerRate = 0.08;
  let tier: CommissionResult["tier"] = "standard";
  let tierLabel = "Standard";

  if (lotPrice > 6000) {
    sellerRate = 0.07;
    buyerRate = 0.06;
    tier = "large_lot";
    tierLabel = "Lot premium (>6 000 €)";
  }

  if (sellerLifetimeSaleCount < 3) {
    sellerRate = 0.05;
    tier = "new_seller";
    tierLabel = "Nouveau vendeur";
  } else if (sellerSaleCountThisMonth >= 2) {
    sellerRate = 0.06;
    tier = "seller_3rd_month";
    tierLabel = "Fidélité vendeur (3e vente du mois)";
  }

  if (isBuyerFirstEverPurchase) {
    buyerRate = 0.05;
    tier = "new_buyer";
    tierLabel = "Bienvenue acheteur";
  } else if (buyerOrderCountThisMonth >= 2) {
    buyerRate = 0.06;
    if (tier === "standard") {
      tier = "buyer_3rd_month";
      tierLabel = "Fidélité acheteur (3e achat du mois)";
    }
  }

  const sellerCommission = Math.round(lotPrice * sellerRate * 100) / 100;
  const buyerCommission = Math.round(lotPrice * buyerRate * 100) / 100;

  return { sellerRate, buyerRate, sellerCommission, buyerCommission, tier, tierLabel };
}

export function startOfMonthISO(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
