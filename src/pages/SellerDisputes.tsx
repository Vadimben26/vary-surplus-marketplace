import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { AlertTriangle, MessageCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const SellerDisputes = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ["seller-disputes", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*, lots(title, brand, images), profiles!orders_buyer_id_fkey(id, full_name, company_name)")
        .eq("seller_id", profile.id)
        .in("status", ["disputed", "refunded"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-6 pb-24 max-w-[1400px] mx-auto">
        <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-6">
          {t("sellerDisputes.title")}
        </h1>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">{t("common.loading")}</div>
        ) : disputes.length === 0 ? (
          <div className="text-center py-16">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">{t("sellerDisputes.empty")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("sellerDisputes.emptyDesc")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map((order: any, i: number) => {
              const lot = order.lots;
              const buyer = order.profiles;
              const isDisputed = order.status === "disputed";

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-card rounded-2xl border p-4 ${isDisputed ? "border-amber-300" : "border-border"}`}
                >
                  <div className="flex items-start gap-3">
                    {lot?.images?.[0] && (
                      <img src={lot.images[0]} alt={lot.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold text-foreground text-sm line-clamp-1">{lot?.title}</h3>
                      <p className="text-xs text-muted-foreground">{buyer?.company_name || buyer?.full_name || "Acheteur"}</p>
                      <p className="text-xs font-semibold text-primary mt-0.5">{Number(order.amount).toLocaleString("fr-FR")} €</p>
                    </div>
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isDisputed ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                      {isDisputed ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {isDisputed ? t("sellerDisputes.disputed") : t("sellerDisputes.refunded")}
                    </span>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => navigate(`/messages?with=${buyer?.id}&lot=${order.lot_id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                    >
                      <MessageCircle className="h-3 w-3" />
                      {t("sellerDisputes.contactBuyer")}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default SellerDisputes;
