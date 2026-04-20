import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ShippingMatrix } from "@/lib/shipping";

/**
 * Fetch the full transport matrix once (cached aggressively — the data is static).
 */
export const useShippingMatrix = () => {
  return useQuery<ShippingMatrix>({
    queryKey: ["shipping-matrix"],
    staleTime: 1000 * 60 * 60, // 1h
    gcTime: 1000 * 60 * 60 * 24,
    queryFn: async () => {
      const [routesRes, pricingRes, coefRes] = await Promise.all([
        supabase.from("shipping_routes").select("origin_country, destination_country, distance_km, category"),
        supabase.from("shipping_pricing").select("category, cost_per_pallet"),
        supabase.from("shipping_pallet_coefficients").select("max_pallets, coefficient, display_order"),
      ]);
      if (routesRes.error) throw routesRes.error;
      if (pricingRes.error) throw pricingRes.error;
      if (coefRes.error) throw coefRes.error;
      return {
        routes: (routesRes.data || []) as any,
        pricing: (pricingRes.data || []) as any,
        coefficients: (coefRes.data || []) as any,
      };
    },
  });
};
