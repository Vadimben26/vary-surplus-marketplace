import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { BuyerMatchProfile } from "@/lib/buyerMatching";

/**
 * Loads the current buyer's matching profile (subset of buyer_preferences
 * needed by the matching algorithm). Returns `null` for guests / sellers /
 * users without a completed questionnaire — callers should treat that as
 * "no personalization, show default order".
 */
export const useBuyerMatching = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-matching-profile", user?.id],
    queryFn: async (): Promise<BuyerMatchProfile | null> => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("buyer_preferences")
        .select("categories, delivery_countries, shipping_country_for_filter, annual_revenue, budget")
        .eq("user_id", user.id)
        .maybeSingle();
      return (data as BuyerMatchProfile) ?? null;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  return { profile: data ?? null, loading: isLoading };
};
