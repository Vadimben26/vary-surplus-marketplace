// =============================================================================
// VARY — Commission engine
// -----------------------------------------------------------------------------
// Single source of truth for the progressive commission grid. Used both
// client-side (Checkout UI) and server-side (create-checkout-session Edge
// Function — see supabase/functions/create-checkout-session/index.ts).
//
// Pricing model B: shipping is always billed to the buyer at real cost,
// outside any commission.
//
// Buyer-facing total = lot price + buyer commission + shipping
// Seller payout      = lot price - seller commission
// Vary gross revenue = buyer commission + seller commission
// Vary net revenue   = gross - Stripe fees (1.5% + 0.25€ + 0.25%)
// =============================================================================

export interface CommissionInput {
  /** Lot list price in EUR (HT, what the seller sets) */
  lotPrice: number;
  /** Number of confirmed buyer purchases this calendar month, BEFORE this one */
  buyerOrderCountThisMonth: number;
  /** Number of confirmed seller sales this calendar month, BEFORE this one */
  sellerSaleCountThisMonth: number;
  /** Total lifetime confirmed sales for this seller, BEFORE this one */
  sellerLifetimeSaleCount: number;
  /** True if this is the buyer's very first ever purchase */
  isBuyerFirstEverPurchase: boolean;
}

export interface CommissionResult {
  /** Effective seller commission rate, e.g. 0.08 */
  sellerRate: number;
  /** Effective buyer commission rate, e.g. 0.08 */
  buyerRate: number;
  /** Seller commission amount in EUR (deducted from lot price) */
  sellerCommission: number;
  /** Buyer commission amount in EUR (added to buyer total) */
  buyerCommission: number;
  /** Human-readable label for the applied tier (FR) */
  tierLabel: string;
  /** Internal tier identifier */
  tier:
    | "standard"
    | "large_lot"
    | "buyer_3rd_month"
    | "seller_3rd_month"
    | "new_seller"
    | "new_buyer";
}

/** Stripe Connect fees: 1.5% + 0.25€ fixed + 0.25% Connect fee on the charge */
const STRIPE_PERCENT = 0.015 + 0.0025;
const STRIPE_FIXED = 0.25;

export function computeStripeFee(buyerPaidTotal: number): number {
  return Math.round((buyerPaidTotal * STRIPE_PERCENT + STRIPE_FIXED) * 100) / 100;
}

/**
 * Apply the Vary commission grid. Order matters: the most favourable rule
 * for the customer wins, but business rules in the brief are mutually
 * exclusive in practice. We keep the explicit priority order from the spec.
 */
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

  // 1. Large lot (> 6000 €) — applies to both sides simultaneously.
  if (lotPrice > 6000) {
    sellerRate = 0.07;
    buyerRate = 0.06;
    tier = "large_lot";
    tierLabel = "Lot premium (>6 000 €)";
  }

  // 2. New seller bonus (first 3 lifetime sales) — overrides seller rate only.
  if (sellerLifetimeSaleCount < 3) {
    sellerRate = 0.05;
    tier = "new_seller";
    tierLabel = "Nouveau vendeur";
  } else if (sellerSaleCountThisMonth >= 2) {
    // 3. Loyalty: 3rd+ sale this month — seller side discount.
    sellerRate = 0.06;
    tier = "seller_3rd_month";
    tierLabel = "Fidélité vendeur (3e vente du mois)";
  }

  // 4. New buyer bonus (very first purchase) — overrides buyer rate only.
  if (isBuyerFirstEverPurchase) {
    buyerRate = 0.05;
    tier = "new_buyer";
    tierLabel = "Bienvenue acheteur";
  } else if (buyerOrderCountThisMonth >= 2) {
    // 5. Loyalty: 3rd+ purchase this month — buyer side discount.
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
