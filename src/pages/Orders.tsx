import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Truck, CheckCircle2, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  pending_payment: { icon: Clock, color: "text-yellow-600 bg-yellow-50", label: "orders.statusPending" },
  paid: { icon: CheckCircle2, color: "text-blue-600 bg-blue-50", label: "orders.statusPaid" },
  preparing: { icon: Package, color: "text-orange-600 bg-orange-50", label: "orders.statusPreparing" },
  shipped: { icon: Truck, color: "text-indigo-600 bg-indigo-50", label: "orders.statusShipped" },
  delivered: { icon: Package, color: "text-green-600 bg-green-50", label: "orders.statusDelivered" },
  confirmed: { icon: CheckCircle2, color: "text-green-700 bg-green-100", label: "orders.statusConfirmed" },
  disputed: { icon: AlertTriangle, color: "text-red-600 bg-red-50", label: "orders.statusDisputed" },
  refunded: { icon: AlertTriangle, color: "text-gray-600 bg-gray-50", label: "orders.statusRefunded" },
  cancelled: { icon: AlertTriangle, color: "text-gray-500 bg-gray-50", label: "orders.statusCancelled" },
};

const Orders = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const { data: orders = [], refetch } = useQuery({
    queryKey: ["orders", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from("orders")
        .select("*, lots(title, brand, images, units)")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const handleConfirmReceipt = async (orderId: string) => {
    setConfirmingId(orderId);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-receipt", {
        body: { order_id: orderId },
      });
      if (error) throw error;
      toast.success(t("orders.receiptConfirmed"));
      refetch();
    } catch {
      toast.error(t("orders.confirmError"));
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-8 pb-24 max-w-4xl mx-auto">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-6">
          {t("orders.title")}
        </h1>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground mb-6">{t("orders.empty")}</p>
            <Link to="/marketplace" className="inline-block px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors">
              {t("common.browseLots")}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => {
              const config = statusConfig[order.status] || statusConfig.pending_payment;
              const StatusIcon = config.icon;
              const lot = order.lots;
              const isBuyer = order.buyer_id === profile?.id;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-2xl border border-border p-5"
                >
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                      {lot?.images?.[0] && (
                        <img src={lot.images[0]} alt={lot.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {t(config.label)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-heading font-semibold text-foreground text-sm">
                        {lot?.brand} — {lot?.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">{lot?.units} {t("common.units")}</p>
                      {order.tracking_number && (
                        <p className="text-xs text-primary mt-1">
                          {t("orders.tracking")}: {order.tracking_number}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-heading font-bold text-foreground">
                        {Number(order.amount).toLocaleString("fr-FR")} €
                      </span>
                    </div>
                  </div>

                  {isBuyer && order.status === "delivered" && (
                    <button
                      onClick={() => handleConfirmReceipt(order.id)}
                      disabled={confirmingId === order.id}
                      className="w-full mt-4 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {confirmingId === order.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {t("orders.confirmReceipt")}
                    </button>
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

export default Orders;
