import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the buyer's destination country used to compute shipping reach.
 * Falls back to shipping_country, then country.
 *
 * - For guests / buyers without preferences: returns null → no filtering applied
 *   (per product spec: only filter for users with a complete buyer profile).
 */
export const useBuyerShippingCountry = () => {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-shipping-country", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("buyer_preferences")
        .select("shipping_country_for_filter, shipping_country, country")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) return null;
      return (
        data.shipping_country_for_filter ||
        data.shipping_country ||
        data.country ||
        null
      );
    },
  });

  return {
    country: (data as string | null) ?? null,
    loading: authLoading || (!!user && isLoading),
  };
};
