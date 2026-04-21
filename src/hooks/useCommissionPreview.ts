import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  computeCommission,
  computeStripeFee,
  startOfMonthISO,
  type CommissionResult,
} from "@/lib/commission";

interface UseCommissionArgs {
  /** Buyer profile id (profiles.id, NOT auth user id) */
  buyerProfileId: string | null | undefined;
  /** Seller profile id from the lot */
  sellerProfileId: string | null | undefined;
  /** Lot list price (HT) */
  lotPrice: number;
  /** Optional shipping cost (added to buyer total) */
  shippingCost?: number;
}

export interface CommissionPreview extends CommissionResult {
  buyerTotal: number;
  sellerPayout: number;
  varyGross: number;
  stripeFee: number;
  varyNet: number;
  shippingCost: number;
}

/**
 * Client-side commission preview. The server (create-checkout-session)
 * recomputes the same numbers using the same lib for security — never trust
 * the client when actually charging.
 */
export const useCommissionPreview = ({
  buyerProfileId,
  sellerProfileId,
  lotPrice,
  shippingCost = 0,
}: UseCommissionArgs) => {
  return useQuery<CommissionPreview | null>({
    enabled: !!buyerProfileId && !!sellerProfileId && lotPrice > 0,
    queryKey: [
      "commission-preview",
      buyerProfileId,
      sellerProfileId,
      lotPrice,
      shippingCost,
    ],
    queryFn: async () => {
      const monthStart = startOfMonthISO();

      // Run the 3 counts in parallel — they only need {count: 'exact', head: true}
      // so they're cheap.
      const [
        { count: buyerMonth },
        { count: sellerMonth },
        { count: sellerLifetime },
        { count: buyerLifetime },
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("buyer_id", buyerProfileId!)
          .in("status", ["paid", "preparing", "shipped", "delivered", "confirmed"])
          .gte("created_at", monthStart),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("seller_id", sellerProfileId!)
          .in("status", ["paid", "preparing", "shipped", "delivered", "confirmed"])
          .gte("created_at", monthStart),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("seller_id", sellerProfileId!)
          .in("status", ["paid", "preparing", "shipped", "delivered", "confirmed"]),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("buyer_id", buyerProfileId!)
          .in("status", ["paid", "preparing", "shipped", "delivered", "confirmed"]),
      ]);

      const result = computeCommission({
        lotPrice,
        buyerOrderCountThisMonth: buyerMonth ?? 0,
        sellerSaleCountThisMonth: sellerMonth ?? 0,
        sellerLifetimeSaleCount: sellerLifetime ?? 0,
        isBuyerFirstEverPurchase: (buyerLifetime ?? 0) === 0,
      });

      const buyerTotal =
        Math.round((lotPrice + result.buyerCommission + shippingCost) * 100) / 100;
      const sellerPayout =
        Math.round((lotPrice - result.sellerCommission) * 100) / 100;
      const varyGross =
        Math.round((result.buyerCommission + result.sellerCommission) * 100) / 100;
      const stripeFee = computeStripeFee(buyerTotal);
      const varyNet = Math.round((varyGross - stripeFee) * 100) / 100;

      return {
        ...result,
        buyerTotal,
        sellerPayout,
        varyGross,
        stripeFee,
        varyNet,
        shippingCost,
      };
    },
  });
};
