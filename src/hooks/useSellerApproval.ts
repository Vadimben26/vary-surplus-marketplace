import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SellerApprovalStatus = "pending" | "approved" | "rejected";

/**
 * Returns the current seller's manual-approval status.
 *
 * Buyers are auto-approved on questionnaire completion, but sellers must be
 * vetted by the Vary team before their lots can go live on the marketplace.
 *
 *  - `status`            : "pending" | "approved" | "rejected" (or null if no row yet)
 *  - `isApproved`        : boolean shortcut
 *  - `rejectionReason`   : optional message from the Vary team
 */
export const useSellerApproval = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["seller-approval", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("seller_preferences")
        .select("approval_status, approved_at, rejection_reason")
        .eq("user_id", user.id)
        .maybeSingle();
      return (data as any) ?? null;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const status = (data?.approval_status ?? null) as SellerApprovalStatus | null;

  return {
    status,
    isApproved: status === "approved",
    isPending: status === "pending" || status === null,
    isRejected: status === "rejected",
    approvedAt: data?.approved_at ?? null,
    rejectionReason: data?.rejection_reason ?? null,
    loading: isLoading,
  };
};
