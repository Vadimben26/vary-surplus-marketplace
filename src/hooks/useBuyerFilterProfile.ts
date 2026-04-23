import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { BuyerProfileForFilters } from "@/lib/buyerFilters";

export const useBuyerFilterProfile = () => {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-filter-profile", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<BuyerProfileForFilters | null> => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("buyer_preferences")
        .select("shipping_country_for_filter, annual_revenue, annual_revenue_range, resale_channels, categories")
        .eq("user_id", user.id)
        .maybeSingle();

      return (data as BuyerProfileForFilters) ?? null;
    },
  });

  return {
    profile: data ?? null,
    loading: authLoading || (!!user && isLoading),
  };
};
