import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingCart, CreditCard, Shield, Loader2, Truck, Sparkles, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import BuyerPrefsGate from "@/components/BuyerPrefsGate";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBuyerPrefs } from "@/hooks/useBuyerPrefs";
import { useBuyerShippingCountry } from "@/hooks/useBuyerShippingCountry";
import { useShippingMatrix } from "@/hooks/useShippingMatrix";
import { useCommissionPreview } from "@/hooks/useCommissionPreview";
import { computeShippingCost } from "@/lib/shipping";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const Checkout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cartItems } = useCart();
  const { user, profile } = useAuth();
  const { hasBuyerPrefs, loading: prefsLoading } = useBuyerPrefs();
  const { country: buyerCountry } = useBuyerShippingCountry();
  const { data: shippingMatrix } = useShippingMatrix();
  const [loadingLotId, setLoadingLotId] = useState<string | null>(null);
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

  // Single-lot checkout: we pay one lot at a time. Keep the first lot as
  // "selected" for the right-hand summary panel.
  const selectedLot = cartLots[0];

  const shippingCost = (() => {
    if (!selectedLot || !shippingMatrix || !buyerCountry) return 0;
    const r = computeShippingCost(
      selectedLot.location || "",
      buyerCountry,
      selectedLot.pallets || 1,
      shippingMatrix
    );
    return r?.cost ?? 0;
  })();

  const { data: preview, isLoading: previewLoading } = useCommissionPreview({
    buyerProfileId: profile?.id,
    sellerProfileId: selectedLot?.seller_id,
    lotPrice: Number(selectedLot?.price ?? 0),
    shippingCost,
  });

  const handlePay = async (lotId: string) => {
    if (!user) {
      toast.error(t("checkout.loginRequired"));
      navigate("/connexion");
      return;
    }

    if (!prefsLoading && !hasBuyerPrefs) {
      setShowGate(true);
      return;
    }

    // Block payment if buyer has no shipping country on profile.
    if (!buyerCountry) {
      toast.error(
        t(
          "checkout.shippingAddressRequired",
          "Adresse de livraison manquante. Complétez votre profil acheteur avant de payer."
        )
      );
      navigate("/profil");
      return;
    }

    setLoadingLotId(lotId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { lotId, shippingCost },
      });

      if (error) {
        const msg = (error as any)?.context?.error || (error as any)?.message;
        toast.error(msg || "Erreur lors de la création du paiement");
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error("Erreur lors de la création du paiement");
    } finally {
      setLoadingLotId(null);
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
                      <p className="text-xs text-muted-foreground mt-1">
                        {lot.units} {t("common.units")} · {lot.pallets} palette{lot.pallets > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-heading font-bold text-foreground">
                        {Number(lot.price).toLocaleString("fr-FR")} €
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="bg-card rounded-2xl border border-border p-6 h-fit md:sticky md:top-20 space-y-4">
              {cartLots.length > 1 && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm text-foreground">
                  <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    {t("checkout.multiLotNotice", { count: cartLots.length })}
                  </span>
                </div>
              )}
              <h3 className="font-heading font-semibold text-foreground">
                {t("cart.summary")}
              </h3>

              {previewLoading || !preview ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calcul du total…
                </div>
              ) : (
                <>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prix du lot</span>
                      <span className="text-foreground font-medium">
                        {fmt(Number(selectedLot.price))} €
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        Service Vary
                        <span className="text-[10px] text-muted-foreground/70">
                          ({(preview.buyerRate * 100).toFixed(1)}%)
                        </span>
                      </span>
                      <span className="text-foreground font-medium">
                        {fmt(preview.buyerCommission)} €
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5" />
                        Transport
                        {!buyerCountry && (
                          <span className="text-[10px] text-muted-foreground/70">
                            (à confirmer)
                          </span>
                        )}
                      </span>
                      <span className="text-foreground font-medium">
                        {shippingCost > 0 ? `${fmt(shippingCost)} €` : "—"}
                      </span>
                    </div>
                    <div className="border-t border-border pt-3 flex justify-between items-baseline">
                      <span className="font-heading font-bold text-foreground">
                        {t("cart.total")}
                      </span>
                      <span className="font-heading font-bold text-primary text-lg">
                        {fmt(preview.buyerTotal)} €
                      </span>
                    </div>
                  </div>

                  {preview.tier !== "standard" && (
                    <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-xl">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-foreground">
                        <span className="font-semibold">{preview.tierLabel}</span>
                        <span className="text-muted-foreground"> appliqué</span>
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => handlePay(selectedLot.id)}
                    disabled={!!loadingLotId}
                    className="w-full mt-2 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loadingLotId === selectedLot.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    {cartLots.length > 1
                      ? t("checkout.payLot", { total: cartLots.length })
                      : t("checkout.payNow")} — {fmt(preview.buyerTotal)} €
                  </button>

                  <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-xl">
                    <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      {t("checkout.escrowInfo")}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
      <BottomNav />
      <BuyerPrefsGate
        open={showGate}
        onClose={() => setShowGate(false)}
        title={t("buyerGate.checkoutTitle", "Finalisez votre profil acheteur")}
        description={t(
          "buyerGate.checkoutDescription",
          "Avant votre premier paiement, nous avons besoin de quelques informations sur votre activité. Cela ne prend que 2 minutes."
        )}
        returnTo="/checkout"
      />
    </div>
  );
};

export default Checkout;
