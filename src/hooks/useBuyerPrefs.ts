import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Checks whether the current user has completed the buyer questionnaire
 * (i.e. a row exists in `buyer_preferences` for their user_id) AND exposes
 * the buyer access level + KYB status (level 1 = default, level 2 = verified pro).
 */
export const useBuyerPrefs = () => {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-prefs-check", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const [prefsRes, profileRes] = await Promise.all([
        supabase
          .from("buyer_preferences")
          .select("id, kyb_status, kyb_trust_score, kyb_rejection_reason")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("buyer_access_level")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      return {
        prefs: prefsRes.data,
        profile: profileRes.data as { buyer_access_level: number } | null,
      };
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const hasBuyerPrefs = !!data?.prefs?.id;
  const accessLevel = (data?.profile?.buyer_access_level ?? 1) as 1 | 2;
  const kybStatus = (data?.prefs?.kyb_status ?? "none") as
    | "none"
    | "pending"
    | "verified"
    | "rejected";
  const loading = authLoading || (!!user && isLoading);

  return {
    hasBuyerPrefs,
    accessLevel,
    isVerifiedPro: accessLevel >= 2,
    kybStatus,
    kybTrustScore: data?.prefs?.kyb_trust_score ?? null,
    kybRejectionReason: data?.prefs?.kyb_rejection_reason ?? null,
    loading,
    requiresQuestionnaire: !!user && !loading && !hasBuyerPrefs,
  };
};
