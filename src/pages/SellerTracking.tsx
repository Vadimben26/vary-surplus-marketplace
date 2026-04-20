import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Truck, Package, CheckCircle2, Clock, AlertTriangle, MessageCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const statusSteps = ["paid", "preparing", "shipped", "delivered", "confirmed"] as const;

const SellerTracking = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"active" | "disputes">("active");
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleSaveTracking = async (orderId: string) => {
    const tracking = (trackingInputs[orderId] || "").trim();
    if (!tracking) {
      toast.error("Numéro de suivi requis");
      return;
    }
    setSavingId(orderId);
    try {
      const { error } = await (supabase.from("orders") as any)
        .update({
          tracking_number: tracking,
          shipped_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      if (error) throw error;
      await supabase.functions.invoke("send-shipment-notification", {
        body: { orderId },
      });
      toast.success("Expédition enregistrée — acheteur notifié");
      window.location.reload();
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSavingId(null);
    }
  };

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["seller-tracking", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*, lots(title, brand, images), profiles!orders_buyer_id_fkey(id, full_name, company_name)")
        .eq("seller_id", profile.id)
        .in("status", ["paid", "preparing", "shipped", "delivered", "confirmed"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const { data: disputes = [], isLoading: disputesLoading } = useQuery({
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return <Clock className="h-4 w-4 text-amber-500" />;
      case "preparing": return <Package className="h-4 w-4 text-blue-500" />;
      case "shipped": return <Truck className="h-4 w-4 text-primary" />;
      case "delivered": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "confirmed": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "disputed": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "refunded": return <Clock className="h-4 w-4 text-muted-foreground" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      paid: t("sellerTracking.paid"),
      preparing: t("sellerTracking.preparing"),
      shipped: t("sellerTracking.shipped"),
      delivered: t("sellerTracking.delivered"),
      confirmed: t("sellerTracking.confirmed"),
      disputed: t("sellerDisputes.disputed"),
      refunded: t("sellerDisputes.refunded"),
    };
    return labels[status] || status;
  };

  const getStepIndex = (status: string) => statusSteps.indexOf(status as any);

  const currentList = activeTab === "active" ? orders : disputes;
  const loading = activeTab === "active" ? isLoading : disputesLoading;

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-6 pb-24 max-w-[1400px] mx-auto">
        <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-4">
          {t("sellerTracking.title")}
        </h1>

        {/* Internal tabs */}
        <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === "active" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {t("sellerTracking.tabActive")}
          </button>
          <button
            onClick={() => setActiveTab("disputes")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors relative ${activeTab === "disputes" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {t("sellerTracking.tabDisputes")}
            {disputes.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {disputes.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">{t("common.loading")}</div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-16">
            {activeTab === "active" ? (
              <>
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("sellerTracking.empty")}</p>
              </>
            ) : (
              <>
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">{t("sellerDisputes.empty")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("sellerDisputes.emptyDesc")}</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {currentList.map((order: any, i: number) => {
              const lot = order.lots;
              const buyer = order.profiles;
              const currentStep = getStepIndex(order.status);
              const isDisputed = order.status === "disputed";

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-card rounded-2xl border p-4 ${isDisputed ? "border-amber-300" : "border-border"}`}
                >
                  <div className="flex items-start gap-3 mb-4">
                    {lot?.images?.[0] && (
                      <img src={lot.images[0]} alt={lot.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold text-foreground text-sm line-clamp-1">{lot?.title}</h3>
                      <p className="text-xs text-muted-foreground">{buyer?.company_name || buyer?.full_name || "Acheteur"}</p>
                      <p className="text-xs font-semibold text-primary mt-0.5">{Number(order.amount).toLocaleString("fr-FR")} €</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs font-medium">
                      {getStatusIcon(order.status)}
                      {getStatusLabel(order.status)}
                    </div>
                  </div>

                  {/* Progress bar for active orders */}
                  {activeTab === "active" && (
                    <>
                      <div className="flex items-center gap-1">
                        {statusSteps.map((step, idx) => (
                          <div key={step} className="flex-1 flex items-center gap-1">
                            <div className={`h-1.5 flex-1 rounded-full transition-colors ${idx <= currentStep ? "bg-primary" : "bg-muted"}`} />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-1.5">
                        {statusSteps.map((step) => (
                          <span key={step} className="text-[8px] text-muted-foreground">{getStatusLabel(step)}</span>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Contact buyer for disputes */}
                  {activeTab === "disputes" && (
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => navigate(`/messages?with=${buyer?.id}&lot=${order.lot_id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                      >
                        <MessageCircle className="h-3 w-3" />
                        {t("sellerDisputes.contactBuyer")}
                      </button>
                    </div>
                  )}

                  {order.tracking_number ? (
                    <p className="text-xs text-muted-foreground mt-3">
                      {t("sellerTracking.trackingNumber")}: <span className="font-mono font-semibold text-foreground">{order.tracking_number}</span>
                    </p>
                  ) : (
                    activeTab === "active" && (order.status === "paid" || order.status === "preparing") && (
                      <div className="flex gap-2 mt-3">
                        <input
                          type="text"
                          placeholder="N° de suivi (ex: 1Z999...)"
                          value={trackingInputs[order.id] || ""}
                          onChange={(e) => setTrackingInputs({ ...trackingInputs, [order.id]: e.target.value })}
                          className="flex-1 px-3 py-1.5 text-xs border border-border rounded-lg bg-background"
                        />
                        <button
                          onClick={() => handleSaveTracking(order.id)}
                          disabled={savingId === order.id}
                          className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {savingId === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Truck className="h-3 w-3" />}
                          Expédier
                        </button>
                      </div>
                    )
                  )}
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

export default SellerTracking;
