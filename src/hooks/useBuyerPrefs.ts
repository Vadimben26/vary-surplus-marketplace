import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Checks whether the current user has completed the buyer questionnaire
 * (i.e. a row exists in `buyer_preferences` for their user_id).
 *
 * - `hasBuyerPrefs`: true when the row exists
 * - `loading`: true while the check is in flight (or while auth is loading)
 * - `requiresQuestionnaire`: true when the user is logged in but has not
 *   completed the questionnaire yet — convenient for gates.
 */
export const useBuyerPrefs = () => {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-prefs-check", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("buyer_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const hasBuyerPrefs = !!data?.id;
  const loading = authLoading || (!!user && isLoading);

  return {
    hasBuyerPrefs,
    loading,
    requiresQuestionnaire: !!user && !loading && !hasBuyerPrefs,
  };
};
