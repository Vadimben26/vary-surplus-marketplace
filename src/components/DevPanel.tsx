import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Code2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface DevPanelProps {
  profileId: string;
}

const DevPanel = ({ profileId }: DevPanelProps) => {
  // Hard guard: never render in production builds, even if imported by mistake.
  if (!import.meta.env.DEV) return null;

  const [buyerVip, setBuyerVip] = useState(false);
  const [sellerVip, setSellerVip] = useState(false);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const fetchStatus = async () => {
    const { data } = await supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", profileId);
    
    const active = (data || []).filter((s) => s.status === "active");
    setBuyerVip(active.some((s) => s.plan === "buyer_vip"));
    setSellerVip(active.some((s) => s.plan === "seller_vip"));
    setLoading(false);
  };

  useEffect(() => { fetchStatus(); }, [profileId]);

  const toggle = async (plan: string, current: boolean) => {
    if (current) {
      await supabase.from("subscriptions").delete().eq("user_id", profileId).eq("plan", plan);
    } else {
      await supabase.from("subscriptions").insert({ user_id: profileId, plan, status: "active" });
    }
    await fetchStatus();
    // Invalidate all VIP-related queries so other pages pick up the change
    queryClient.invalidateQueries({ queryKey: ["seller-vip-status"] });
    queryClient.invalidateQueries({ queryKey: ["buyer-vip-status"] });
    queryClient.invalidateQueries({ queryKey: ["buyer-interests"] });
    toast.success(`${plan} ${current ? "désactivé" : "activé"}`);
  };

  if (loading) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <Code2 className="h-4 w-4" />
        <span className="text-sm font-semibold">Mode développeur</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">VIP Acheteur</span>
        <Switch checked={buyerVip} onCheckedChange={() => toggle("buyer_vip", buyerVip)} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">VIP Vendeur</span>
        <Switch checked={sellerVip} onCheckedChange={() => toggle("seller_vip", sellerVip)} />
      </div>
    </div>
  );
};

export default DevPanel;
