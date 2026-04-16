import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingCart, CreditCard, Shield, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import BuyerPrefsGate from "@/components/BuyerPrefsGate";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBuyerPrefs } from "@/hooks/useBuyerPrefs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const Checkout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const { user } = useAuth();
  const { hasBuyerPrefs, loading: prefsLoading } = useBuyerPrefs();
  const [loading, setLoading] = useState(false);
  const [showGate, setShowGate] = useState(false);

  const { data: cartLots = [] } = useQuery({
    queryKey: ["checkout-lots", cartItems],
    queryFn: async () => {
      if (cartItems.length === 0) return [];
      const { data } = await supabase
        .from("lots")
        .select("*")
        .in("id", cartItems)
        .eq("status", "active");
      return data || [];
    },
  });

  const subtotal = cartLots.reduce((sum, lot) => sum + Number(lot.price), 0);
  const commission = Math.round(subtotal * 0.05 * 100) / 100;
  const total = subtotal;

  const handlePay = async (lotId: string, price: number) => {
    if (!user) {
      toast.error(t("checkout.loginRequired"));
      navigate("/connexion");
      return;
    }

    // Phase 5: trigger buyer questionnaire on first payment
    if (!prefsLoading && !hasBuyerPrefs) {
      setShowGate(true);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          lot_id: lotId,
          success_url: `${window.location.origin}/commandes?success=true`,
          cancel_url: `${window.location.origin}/checkout`,
        },
      });

      if (error) throw error;

      if (data?.error?.includes("Stripe not configured")) {
        toast.error(t("checkout.stripeNotReady"));
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error(t("checkout.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-8 pb-24 max-w-4xl mx-auto">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-6">
          {t("checkout.title")}
        </h1>

        {cartLots.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground mb-6">{t("cart.empty")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              {cartLots.map((lot) => (
                <motion.div
                  key={lot.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-2xl border border-border p-5"
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                      {lot.images?.[0] && (
                        <img src={lot.images[0]} alt={lot.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-primary uppercase">{lot.brand}</p>
                      <h3 className="font-heading font-semibold text-foreground text-sm">{lot.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{lot.units} {t("common.units")}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-heading font-bold text-foreground">
                        {Number(lot.price).toLocaleString("fr-FR")} €
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePay(lot.id, Number(lot.price))}
                    disabled={loading}
                    className="w-full mt-4 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    {t("checkout.payNow")} — {Number(lot.price).toLocaleString("fr-FR")} €
                  </button>
                </motion.div>
              ))}
            </div>

            <div className="bg-card rounded-2xl border border-border p-6 h-fit sticky top-20">
              <h3 className="font-heading font-semibold text-foreground mb-4">{t("cart.summary")}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                  <span className="text-foreground font-medium">{subtotal.toLocaleString("fr-FR")} €</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-heading font-bold text-foreground">{t("cart.total")}</span>
                  <span className="font-heading font-bold text-primary text-lg">{total.toLocaleString("fr-FR")} €</span>
                </div>
              </div>

              <div className="mt-6 flex items-start gap-2 p-3 bg-primary/5 rounded-xl">
                <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">{t("checkout.escrowInfo")}</p>
              </div>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Checkout;
