import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingCart, CreditCard, Shield, Loader2, Truck, Sparkles, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import LegalFooter from "@/components/LegalFooter";
import BuyerPrefsGate from "@/components/BuyerPrefsGate";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBuyerPrefs } from "@/hooks/useBuyerPrefs";
import { useBuyerShippingCountry } from "@/hooks/useBuyerShippingCountry";
import { useShippingMatrix } from "@/hooks/useShippingMatrix";
import { useCommissionPreview } from "@/hooks/useCommissionPreview";
import { computeMultiLotShipping } from "@/lib/shipping";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface SellerGroup {
  sellerId: string;
  sellerName: string;
  sellerUserId: string | null;
  sellerLocation: string;
  visibilityMode: string | null;
  lots: any[];
  totalPallets: number;
  shippingCost: number;
  lotsPriceSum: number;
}

const Checkout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cartItems, removeFromCart } = useCart();
  const { user, profile } = useAuth();
  const { hasBuyerPrefs, isVerifiedPro, loading: prefsLoading } = useBuyerPrefs();
  const { country: buyerCountry } = useBuyerShippingCountry();
  const { data: shippingMatrix } = useShippingMatrix();
  const [loadingSellerId, setLoadingSellerId] = useState<string | null>(null);
  const [showGate, setShowGate] = useState(false);
  const [gateMode, setGateMode] = useState<"questionnaire" | "verifyPro">("questionnaire");

  const { data: cartLots = [] } = useQuery({
    queryKey: ["checkout-lots", cartItems],
    queryFn: async () => {
      if (cartItems.length === 0) return [];
      const { data } = await supabase
        .from("lots")
        .select("*, profiles!lots_seller_id_fkey(id, user_id, full_name, company_name)")
        .in("id", cartItems)
        .eq("status", "active");
      return data || [];
    },
  });

  // Fetch seller visibility for each unique seller in the cart
  const sellerUserIds = Array.from(
    new Set(cartLots.map((l: any) => (l.profiles as any)?.user_id).filter(Boolean))
  );
  const { data: sellerPrefsMap = {} } = useQuery({
    queryKey: ["checkout-seller-visibility-multi", sellerUserIds],
    queryFn: async () => {
      if (sellerUserIds.length === 0) return {};
      const { data } = await supabase
        .from("seller_preferences")
        .select("user_id, visibility_mode")
        .in("user_id", sellerUserIds);
      const map: Record<string, string | null> = {};
      (data || []).forEach((row: any) => {
        map[row.user_id] = row.visibility_mode;
      });
      return map;
    },
    enabled: sellerUserIds.length > 0,
    staleTime: 60_000,
  });

  // Group lots by seller and compute one shipping cost per seller group.
  const sellerGroups: SellerGroup[] = (() => {
    if (!cartLots.length || !shippingMatrix || !buyerCountry) {
      // Still build groups for display, but with shippingCost = 0.
      const map = new Map<string, SellerGroup>();
      for (const lot of cartLots as any[]) {
        const sid = lot.seller_id;
        const existing = map.get(sid);
        const sellerName =
          (lot.profiles as any)?.company_name ||
          (lot.profiles as any)?.full_name ||
          "Vendeur";
        const sellerUserId = (lot.profiles as any)?.user_id ?? null;
        const visibilityMode = sellerUserId ? (sellerPrefsMap as any)[sellerUserId] ?? null : null;
        if (existing) {
          existing.lots.push(lot);
          existing.totalPallets += lot.pallets || 1;
          existing.lotsPriceSum += Number(lot.price);
        } else {
          map.set(sid, {
            sellerId: sid,
            sellerName,
            sellerUserId,
            sellerLocation: lot.location || "",
            visibilityMode,
            lots: [lot],
            totalPallets: lot.pallets || 1,
            shippingCost: 0,
            lotsPriceSum: Number(lot.price),
          });
        }
      }
      return Array.from(map.values());
    }
    // With matrix + buyer country, compute real shipping per group.
    const shippingGroups = computeMultiLotShipping(
      cartLots.map((l: any) => ({
        id: l.id,
        seller_id: l.seller_id,
        location: l.location,
        pallets: l.pallets,
      })),
      buyerCountry,
      shippingMatrix
    );
    const shippingBySeller = new Map<string, number>();
    for (const g of shippingGroups) shippingBySeller.set(g.sellerId, g.shippingCost);

    const map = new Map<string, SellerGroup>();
    for (const lot of cartLots as any[]) {
      const sid = lot.seller_id;
      const existing = map.get(sid);
      const sellerName =
        (lot.profiles as any)?.company_name ||
        (lot.profiles as any)?.full_name ||
        "Vendeur";
      const sellerUserId = (lot.profiles as any)?.user_id ?? null;
      const visibilityMode = sellerUserId ? (sellerPrefsMap as any)[sellerUserId] ?? null : null;
      if (existing) {
        existing.lots.push(lot);
        existing.totalPallets += lot.pallets || 1;
        existing.lotsPriceSum += Number(lot.price);
      } else {
        map.set(sid, {
          sellerId: sid,
          sellerName,
          sellerUserId,
          sellerLocation: lot.location || "",
          visibilityMode,
          lots: [lot],
          totalPallets: lot.pallets || 1,
          shippingCost: shippingBySeller.get(sid) ?? 0,
          lotsPriceSum: Number(lot.price),
        });
      }
    }
    return Array.from(map.values());
  })();

  const handlePayGroup = async (group: SellerGroup) => {
    if (!user) {
      toast.error(t("checkout.loginRequired"));
      navigate("/connexion");
      return;
    }

    if (!prefsLoading && !hasBuyerPrefs) {
      setGateMode("questionnaire");
      setShowGate(true);
      return;
    }

    // Filtered lots require Level 2 verified pro.
    if (!prefsLoading && group.visibilityMode === "filtered" && !isVerifiedPro) {
      setGateMode("verifyPro");
      setShowGate(true);
      return;
    }

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

    setLoadingSellerId(group.sellerId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          // Backward-compatible: send single lotId when only one lot, else lotIds.
          ...(group.lots.length === 1
            ? { lotId: group.lots[0].id }
            : { lotIds: group.lots.map((l) => l.id) }),
          shippingCost: group.shippingCost,
        },
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
      setLoadingSellerId(null);
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // For commission preview we only support single-group display since the rate
  // depends on the buyer/seller pair. We compute it for each group separately.
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-8 pb-24 max-w-5xl mx-auto">
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
          <div className="space-y-6">
            {sellerGroups.length > 1 && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm text-foreground">
                <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>
                  {t(
                    "checkout.multiSellerNotice",
                    "Votre panier contient des lots de plusieurs vendeurs. Le paiement se fait vendeur par vendeur, avec un transport calculé une seule fois par vendeur."
                  )}
                </span>
              </div>
            )}

            {sellerGroups.map((group) => (
              <SellerGroupCard
                key={group.sellerId}
                group={group}
                buyerProfileId={profile?.id}
                buyerCountry={buyerCountry}
                onRemove={removeFromCart}
                onPay={() => handlePayGroup(group)}
                loading={loadingSellerId === group.sellerId}
                fmt={fmt}
              />
            ))}
          </div>
        )}
      </main>
      <LegalFooter />
      <BottomNav />
      <BuyerPrefsGate
        open={showGate}
        onClose={() => setShowGate(false)}
        mode={gateMode}
        title={
          gateMode === "verifyPro"
            ? t("buyerGate.checkoutVerifyTitle", "Lot réservé aux acheteurs vérifiés")
            : t("buyerGate.checkoutTitle", "Finalisez votre profil acheteur")
        }
        description={
          gateMode === "verifyPro"
            ? t(
                "buyerGate.checkoutVerifyDescription",
                "Ce vendeur réserve ses lots aux acheteurs professionnels vérifiés. Vérifiez votre activité depuis votre profil pour finaliser le paiement — c'est gratuit et instantané."
              )
            : t(
                "buyerGate.checkoutDescription",
                "Avant votre premier paiement, nous avons besoin de quelques informations sur votre activité. Cela ne prend que 2 minutes."
              )
        }
        returnTo="/checkout"
      />
    </div>
  );
};

interface SellerGroupCardProps {
  group: SellerGroup;
  buyerProfileId: string | undefined;
  buyerCountry: string | null | undefined;
  onRemove: (lotId: string) => void;
  onPay: () => void;
  loading: boolean;
  fmt: (n: number) => string;
}

const SellerGroupCard = ({
  group,
  buyerProfileId,
  buyerCountry,
  onRemove,
  onPay,
  loading,
  fmt,
}: SellerGroupCardProps) => {
  const { t } = useTranslation();
  const { data: preview, isLoading: previewLoading } = useCommissionPreview({
    buyerProfileId,
    sellerProfileId: group.sellerId,
    lotPrice: group.lotsPriceSum,
    shippingCost: group.shippingCost,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border overflow-hidden"
    >
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("checkout.sellerLabel", "Vendeur")}
            </p>
            <p className="font-heading font-semibold text-foreground text-sm truncate">
              {group.sellerName}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            {group.lots.length} {group.lots.length > 1 ? t("cart.lots", "lots") : t("cart.lot", "lot")} · {group.totalPallets} {group.totalPallets > 1 ? "palettes" : "palette"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
        <div className="md:col-span-2 p-4 space-y-3 border-b md:border-b-0 md:border-r border-border">
          {group.lots.map((lot: any) => (
            <div key={lot.id} className="flex gap-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                {lot.images?.[0] && (
                  <img src={lot.images[0]} alt={lot.title} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-primary uppercase">{lot.brand}</p>
                <h3 className="font-heading font-semibold text-foreground text-sm line-clamp-1">
                  {lot.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lot.units} {t("common.units")} · {lot.pallets} palette{lot.pallets > 1 ? "s" : ""}
                </p>
              </div>
              <div className="text-right">
                <span className="font-heading font-bold text-foreground text-sm">
                  {Number(lot.price).toLocaleString("fr-FR")} €
                </span>
                <button
                  onClick={() => onRemove(lot.id)}
                  className="block mt-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 space-y-3 bg-card">
          {previewLoading || !preview ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calcul…
            </div>
          ) : (
            <>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {group.lots.length > 1 ? "Sous-total lots" : "Prix du lot"}
                  </span>
                  <span className="text-foreground font-medium">
                    {fmt(group.lotsPriceSum)} €
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
                      <span className="text-[10px] text-muted-foreground/70">(à confirmer)</span>
                    )}
                  </span>
                  <span className="text-foreground font-medium">
                    {group.shippingCost > 0 ? `${fmt(group.shippingCost)} €` : "—"}
                  </span>
                </div>
                <div className="border-t border-border pt-2.5 flex justify-between items-baseline">
                  <span className="font-heading font-bold text-foreground">
                    {t("cart.total")}
                  </span>
                  <span className="font-heading font-bold text-primary text-lg">
                    {fmt(preview.buyerTotal)} €
                  </span>
                </div>
              </div>

              {preview.tier !== "standard" && (
                <div className="flex items-start gap-2 p-2.5 bg-primary/5 rounded-xl">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground">
                    <span className="font-semibold">{preview.tierLabel}</span>
                    <span className="text-muted-foreground"> appliqué</span>
                  </p>
                </div>
              )}

              <button
                onClick={onPay}
                disabled={loading}
                className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                {t("checkout.paySeller", "Payer ce vendeur")} — {fmt(preview.buyerTotal)} €
              </button>

              <div className="flex items-start gap-2 p-2.5 bg-muted/40 rounded-xl">
                <Shield className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  {t("checkout.escrowInfo")}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Checkout;
