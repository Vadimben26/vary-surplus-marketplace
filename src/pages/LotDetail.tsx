import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Heart, MapPin, Package, MessageCircle, ShoppingCart, User, ChevronLeft, ChevronRight, TrendingDown, Image, Download, Star, Layers, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/contexts/FavoritesContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBuyerPrefs } from "@/hooks/useBuyerPrefs";
import LotCard from "@/components/LotCard";
import BuyerPrefsGate from "@/components/BuyerPrefsGate";
import GuestGate from "@/components/GuestGate";
import varyLogo from "@/assets/vary-logo.png";
import BottomNav from "@/components/BottomNav";
import LegalFooter from "@/components/LegalFooter";
import TrustBar from "@/components/TrustBar";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const LotDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isInCart, addToCart } = useCart();
  const { profile, user } = useAuth();
  const { hasBuyerPrefs, isVerifiedPro, loading: prefsLoading } = useBuyerPrefs();
  const [activeImage, setActiveImage] = useState(0);
  const [selectedProductImage, setSelectedProductImage] = useState<string | null>(null);
  const [showGate, setShowGate] = useState(false);
  const [gateMode, setGateMode] = useState<"questionnaire" | "verifyPro">("questionnaire");
  const [showGuestGate, setShowGuestGate] = useState(false);

  const { data: lot, isLoading } = useQuery({
    queryKey: ["lot-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("lots")
        .select("*, lot_items(*), profiles!lots_seller_id_fkey(user_id, full_name, company_name, company_description)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  usePageMeta({
    title: lot ? `${lot.brand} — ${lot.title}` : "Lot",
    description: lot
      ? `${lot.units} pièces · ${lot.price} € · Expédié depuis ${lot.location}`
      : undefined,
    image: lot?.images?.[0] ?? undefined,
  });


  // must complete the questionnaire before contacting / adding to cart.
  const sellerUserId = (lot?.profiles as any)?.user_id ?? null;
  const { data: sellerPrefs } = useQuery({
    queryKey: ["lot-seller-filters", sellerUserId],
    queryFn: async () => {
      if (!sellerUserId) return null;
      const { data } = await supabase
        .from("seller_preferences")
        .select("buyer_filters")
        .eq("user_id", sellerUserId)
        .maybeSingle();
      return data;
    },
    enabled: !!sellerUserId,
    staleTime: 60_000,
  });
  // A lot is "restricted" when its seller has set at least one buyer filter.
  // Eligibility is enforced server-side via the buyer_preferences match,
  // but for the UX gate we only need to know whether the seller has any rule.
  const sellerBuyerFilters = (sellerPrefs?.buyer_filters as any) ?? null;
  const isFilteredLot =
    !!sellerBuyerFilters &&
    (
      (sellerBuyerFilters.countries?.length ?? 0) > 0 ||
      (sellerBuyerFilters.min_revenue && sellerBuyerFilters.min_revenue !== "none") ||
      (sellerBuyerFilters.channels?.length ?? 0) > 0 ||
      (sellerBuyerFilters.categories?.length ?? 0) > 0
    );
  // For filtered lots: buyer must (a) have completed questionnaire AND (b) be a verified pro (Level 2).
  const requiresPrefs = isFilteredLot && !!user && !prefsLoading && !hasBuyerPrefs;
  const requiresVerifiedPro = isFilteredLot && !!user && !prefsLoading && hasBuyerPrefs && !isVerifiedPro;

  // Reachability is no longer gated by shipping cost — flat 500 € minimum
  // applies to every published lot, and sellers reach all 24 EU countries.

  const { data: similarLots = [] } = useQuery({
    queryKey: ["similar-lots", lot?.category, lot?.brand, id],
    queryFn: async () => {
      if (!lot) return [];
      const { data, error } = await supabase
        .from("lots")
        .select("*, lot_items(quantity, retail_price)")
        .eq("status", "active")
        .neq("id", id!)
        .limit(4);
      if (error) throw error;
      return (data || []).map((l: any) => {
        const rv = (l.lot_items || []).reduce((s: number, i: any) => s + (i.retail_price || 0) * (i.quantity || 0), 0);
        return { ...l, discount: rv > 0 ? Math.round((1 - l.price / rv) * 100) : 0 };
      });
    },
    enabled: !!lot,
  });

  const images = lot?.images?.length ? lot.images : [];
  const items: any[] = lot?.lot_items || [];
  const seller = lot?.profiles as any;

  const retailValue = useMemo(() => items.reduce((sum, item) => sum + (item.retail_price || 0) * (item.quantity || 0), 0), [items]);
  const discount = retailValue > 0 ? Math.round((1 - (lot?.price || 0) / retailValue) * 100) : 0;

  const productImages = useMemo(() => items.filter((item) => item.image_url).map((item) => ({ url: item.image_url, name: item.name })), [items]);

  const prevImage = useCallback(() => setActiveImage((i) => (i === 0 ? images.length - 1 : i - 1)), [images.length]);
  const nextImage = useCallback(() => setActiveImage((i) => (i === images.length - 1 ? 0 : i + 1)), [images.length]);

  const handleDownloadExcel = useCallback(() => {
    if (!items.length || !lot) return;
    const rows = items.map((item: any) => ({
      [t("lotDetail.colBrand", "Marque")]: item.brand || lot.brand || "",
      [t("lotDetail.colName", "Article")]: item.name,
      [t("lotDetail.colCategory", "Catégorie")]: item.category || "",
      [t("lotDetail.colGender", "Genre")]: item.gender || "",
      [t("lotDetail.colSize", "Taille")]: item.size || "",
      [t("lotDetail.colRef", "Réf.")]: item.reference || "",
      [t("lotDetail.colQty", "Qté")]: item.quantity,
      [t("lotDetail.colRetail", "Prix retail")]: item.retail_price ? Number(item.retail_price) : "",
      [t("lotDetail.colPhoto", "Photo")]: item.image_url || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventaire");
    const colWidths = Object.keys(rows[0]).map((k) => ({ wch: Math.max(k.length, 12) }));
    ws["!cols"] = colWidths;
    XLSX.writeFile(wb, `${lot.brand}_${lot.title.replace(/\s+/g, "_")}_inventaire.xlsx`);
  }, [items, lot, t]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">{t("lotDetail.notFound")}</h1>
          <button onClick={() => navigate("/marketplace")} className="text-primary hover:underline">{t("lotDetail.backToLots")}</button>
        </div>
      </div>
    );
  }

  const liked = isFavorite(lot.id);
  const inCart = isInCart(lot.id);
  const total = Math.round(lot.price * 1.19);

  const handleAddToCart = () => {
    if (!user) {
      setShowGuestGate(true);
      return;
    }
    if (requiresPrefs) {
      setGateMode("questionnaire");
      setShowGate(true);
      return;
    }
    if (requiresVerifiedPro) {
      setGateMode("verifyPro");
      setShowGate(true);
      return;
    }
    addToCart(lot.id);
    toast.success(t("lotDetail.addedToCart"));
  };

  const handleContactSeller = () => {
    if (!user) {
      setShowGuestGate(true);
      return;
    }
    if (requiresPrefs) {
      setGateMode("questionnaire");
      setShowGate(true);
      return;
    }
    if (requiresVerifiedPro) {
      setGateMode("verifyPro");
      setShowGate(true);
      return;
    }
    navigate(`/messages?lot=${lot.id}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TrustBar />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-8 h-14">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Link to="/marketplace">
            <img src={varyLogo} alt="Vary" className="h-7 w-auto" />
          </Link>
          <button onClick={() => toggleFavorite(lot.id)} className="p-2 rounded-full hover:bg-muted transition-colors">
            <Heart className={`h-5 w-5 ${liked ? "fill-destructive text-destructive" : "text-foreground"}`} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* LEFT: Image + Seller */}
          <div className="md:col-span-4 space-y-3">
            {images.length > 0 ? (
              <>
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-muted group">
                  <motion.img key={activeImage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} src={images[activeImage]} alt={`${lot.title} - photo ${activeImage + 1}`} className="w-full h-full object-cover" />
                  {discount > 0 && (
                    <span className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-green-600 text-white">
                      <TrendingDown className="h-3 w-3" />
                      -{discount}%
                    </span>
                  )}
                  {images.length > 1 && (
                    <>
                      <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card">
                        <ChevronLeft className="h-4 w-4 text-foreground" />
                      </button>
                      <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card">
                        <ChevronRight className="h-4 w-4 text-foreground" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {images.map((_: string, i: number) => (
                          <button key={i} onClick={() => setActiveImage(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImage ? "bg-primary w-3" : "bg-card/60"}`} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-1.5 mt-2">
                    {images.map((img: string, i: number) => (
                      <button key={i} onClick={() => setActiveImage(i)} className={`flex-1 aspect-square rounded-lg overflow-hidden border-2 transition-all ${i === activeImage ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}>
                        <img src={img} alt={`${t("lotDetail.thumbnail")} ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-[4/5] rounded-2xl bg-muted flex items-center justify-center">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* CENTER: Details + Excel download */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="md:col-span-5 space-y-3">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">{lot.brand}</span>
              <h1 className="font-heading text-lg font-bold text-foreground mt-1 leading-tight">{lot.title}</h1>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted rounded-lg p-2 text-center">
                <Package className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
                <p className="font-heading font-bold text-foreground text-xs">{lot.units}</p>
                <p className="text-[10px] text-muted-foreground">{t("common.units")}</p>
              </div>
              <div className="bg-muted rounded-lg p-2 text-center">
                <Layers className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
                <p className="font-heading font-bold text-foreground text-xs">{(lot as any).pallets || 1}</p>
                <p className="text-[10px] text-muted-foreground">{t("lotDetail.pallets", "palettes")}</p>
              </div>
              {lot.location && (
                <div className="bg-muted rounded-lg p-2 text-center">
                  <MapPin className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
                  <p className="font-heading font-bold text-foreground text-[10px]">{lot.location}</p>
                </div>
              )}
              {(lot as any).expires_at && (
                <div className="bg-muted rounded-lg p-2 text-center">
                  <Calendar className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
                  <p className="font-heading font-bold text-foreground text-[10px]">
                    {new Date((lot as any).expires_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{t("lotDetail.expiresAt", "Expire le")}</p>
                </div>
              )}
            </div>

            {/* Retail value */}
            {retailValue > 0 && (
              <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg">
                <span className="text-xs text-muted-foreground">{t("lotDetail.retailValue", "Valeur retail")}</span>
                <span className="text-xs font-semibold text-foreground">{retailValue.toLocaleString("fr-FR")} €</span>
              </div>
            )}

            {/* Excel download */}
            {items.length > 0 && (
              <button
                onClick={handleDownloadExcel}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-muted/80 rounded-xl border border-border transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-600/10 flex items-center justify-center">
                    <Download className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-foreground">{t("lotDetail.downloadInventory", "Télécharger l'inventaire")}</p>
                    <p className="text-[10px] text-muted-foreground">{items.length} {t("lotDetail.references", "références")} • Excel (.xlsx)</p>
                  </div>
                </div>
                <Download className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            )}

            {/* Description */}
            {lot.description && (
              <p className="text-muted-foreground text-xs leading-relaxed">{lot.description}</p>
            )}

            {/* Seller + note & avis */}
            {seller && (
              <div className="flex items-start gap-2.5 p-3 bg-muted rounded-xl">
                <button
                  onClick={() => navigate(`/vendeur/${lot.seller_id}`)}
                  className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 hover:bg-primary/20 transition-colors"
                  aria-label="Voir le profil du vendeur"
                >
                  <User className="h-4 w-4 text-primary" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/vendeur/${lot.seller_id}`)}
                      className="text-xs font-bold text-foreground truncate hover:text-primary hover:underline text-left"
                    >
                      {seller.company_name || seller.full_name || "Vendeur"}
                    </button>
                    {lot.rating && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-500">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        {lot.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {seller.company_description && (
                    <p className="text-[10px] text-muted-foreground leading-snug mt-1">{seller.company_description}</p>
                  )}
                  <button
                    onClick={() => navigate(`/vendeur/${lot.seller_id}`)}
                    className="flex items-center gap-1 mt-1.5 text-[10px] text-primary hover:underline"
                  >
                    <Star className="h-3 w-3" />
                    {t("lotDetail.viewSellerReviews", "Voir les avis")}
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          {/* RIGHT: Sticky price + cart */}
          <div className="md:col-span-3">
            <div className="md:sticky md:top-[72px] space-y-3">
              <div className="bg-card rounded-xl border border-border p-4 shadow-card">
                <div className="space-y-1.5">
                  {retailValue > 0 && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] text-muted-foreground">{t("lotDetail.retailValue", "Valeur retail")}</span>
                      <span className="text-xs text-muted-foreground line-through">{retailValue.toLocaleString("fr-FR")} €</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline">
                    <span className="font-heading font-bold text-foreground text-sm">{t("lotDetail.price")}</span>
                    <div className="flex items-center gap-2">
                      {discount > 0 && (
                        <span className="text-xs font-bold text-green-600">-{discount}%</span>
                      )}
                      <span className="font-heading font-bold text-primary text-lg">{total.toLocaleString("fr-FR")} €</span>
                    </div>
                  </div>
                  {lot.units > 0 && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] text-muted-foreground">{t("lotDetail.pricePerUnit", "Prix / pièce")}</span>
                      <span className="text-xs font-semibold text-foreground">{(total / lot.units).toFixed(2)} €</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={inCart}
                  className={`w-full mt-3 py-2.5 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm ${
                    inCart
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {inCart ? t("lotDetail.inCart") : t("lotDetail.addToCart")}
                </button>

                <button
                  onClick={handleContactSeller}
                  className="w-full mt-2 py-2 border border-border rounded-xl hover:bg-muted transition-colors flex items-center justify-center gap-2 text-xs text-foreground"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {t("lotDetail.contactSeller")}
                </button>

                {isFilteredLot && (
                  <p className="text-[10px] text-muted-foreground italic text-center mt-2">
                    {requiresVerifiedPro
                      ? t("lotDetail.filteredHintVerified", "Lot privé : réservé aux acheteurs vérifiés. Vérifiez votre activité dans votre profil pour y accéder.")
                      : t("lotDetail.filteredHint", "Lot privé : profil acheteur requis pour commander ou contacter le vendeur.")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Products gallery — before similar lots */}
        {productImages.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Image className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-heading font-semibold text-foreground text-sm">{t("lotDetail.products", "Produits")}</h3>
              <span className="text-xs text-muted-foreground">({productImages.length})</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {productImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedProductImage(img.url)}
                  className="aspect-square rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
                >
                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Similar lots */}
        {similarLots.length > 0 && (
          <div className="mt-8">
            <h3 className="font-heading font-semibold text-foreground text-sm mb-3">{t("lotDetail.similarLots")}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {similarLots.map((l: any) => (
                <LotCard
                  key={l.id}
                  id={l.id}
                  image={l.images?.[0] || ""}
                  title={l.title}
                  brand={l.brand}
                  price={`${Math.round(l.price * 1.19).toLocaleString("fr-FR")} €`}
                  units={l.units}
                  location={l.location || ""}
                  category={l.category || ""}
                  discount={l.discount > 0 ? l.discount : undefined}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Product image lightbox */}
      {selectedProductImage && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedProductImage(null)}>
          <img src={selectedProductImage} alt="" className="max-w-full max-h-[90vh] rounded-xl object-contain" />
        </div>
      )}

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-14 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <p className="font-heading font-bold text-foreground text-sm">{total.toLocaleString("fr-FR")} €</p>
            {discount > 0 && <p className="text-[10px] font-bold text-green-600">-{discount}% vs retail</p>}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={inCart}
            className={`flex-1 max-w-[200px] py-2.5 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm ${inCart ? "bg-muted text-muted-foreground cursor-default" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
          >
            <ShoppingCart className="h-4 w-4" />
            {inCart ? t("lotDetail.inCart") : t("lotDetail.add")}
          </button>
        </div>
      </div>

      <LegalFooter />
      <BottomNav />

      <BuyerPrefsGate
        open={showGate}
        onClose={() => setShowGate(false)}
        mode={gateMode}
        returnTo={typeof window !== "undefined" ? window.location.pathname : undefined}
      />

      {showGuestGate && <GuestGate onClose={() => setShowGuestGate(false)} />}
    </div>
  );
};

export default LotDetail;
