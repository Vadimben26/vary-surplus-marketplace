import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Heart, Star, MapPin, Package, MessageCircle, ShoppingCart, User, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import LotCard from "@/components/LotCard";
import varyLogo from "@/assets/vary-logo.png";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const MOCK_REVIEWS = [
  { author: "Sophie M.", rating: 5, date: "2026-03-12", comment: "Qualité excellente, emballage soigné. Je recommande ce vendeur sans hésitation." },
  { author: "Marco R.", rating: 4, date: "2026-03-08", comment: "Bon lot dans l'ensemble, quelques pièces légèrement différentes de la description mais rapport qualité-prix correct." },
  { author: "Elena K.", rating: 5, date: "2026-02-28", comment: "Livraison rapide et conforme. Les tailles correspondent bien, mes clients sont ravis." },
  { author: "Thomas D.", rating: 4, date: "2026-02-20", comment: "Deuxième commande chez ce vendeur. Toujours fiable, bonne communication." },
  { author: "Amira B.", rating: 3, date: "2026-02-15", comment: "Correct mais un peu long à recevoir. Qualité des produits satisfaisante." },
  { author: "Lucas P.", rating: 5, date: "2026-01-30", comment: "Parfait pour mon magasin. Les clients adorent, je repasse commande bientôt !" },
];

const StarRating = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) => {
  const s = size === "md" ? "h-4 w-4" : "h-3 w-3";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`${s} ${star <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
};

const LotDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isInCart, addToCart } = useCart();
  const { profile } = useAuth();
  const [showAllItems, setShowAllItems] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const { data: lot, isLoading } = useQuery({
    queryKey: ["lot-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("lots")
        .select("*, lot_items(*), profiles!lots_seller_id_fkey(full_name, company_name, company_description)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: similarLots = [] } = useQuery({
    queryKey: ["similar-lots", lot?.category, lot?.brand, id],
    queryFn: async () => {
      if (!lot) return [];
      const { data, error } = await supabase
        .from("lots")
        .select("*")
        .eq("status", "active")
        .neq("id", id!)
        .limit(4);
      if (error) throw error;
      return data || [];
    },
    enabled: !!lot,
  });

  const reviews = useMemo(() => {
    if (!id) return [];
    const seed = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
    const count = 3 + (seed % 4);
    const shuffled = [...MOCK_REVIEWS].sort((a, b) => (a.author.charCodeAt(0) + seed) - (b.author.charCodeAt(0) + seed));
    return shuffled.slice(0, count);
  }, [id]);

  const images = lot?.images?.length ? lot.images : [];
  const items = lot?.lot_items || [];
  const seller = lot?.profiles as any;

  const prevImage = useCallback(() => setActiveImage((i) => (i === 0 ? images.length - 1 : i - 1)), [images.length]);
  const nextImage = useCallback(() => setActiveImage((i) => (i === images.length - 1 ? 0 : i + 1)), [images.length]);

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
  const displayedItems = showAllItems ? items : items.slice(0, 4);
  const lotRating = lot.rating || 0;

  const handleAddToCart = () => {
    addToCart(lot.id);
    toast.success(t("lotDetail.addedToCart"));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
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
            {seller && (
              <div className="flex items-start gap-2.5 p-3 bg-muted rounded-xl">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{seller.company_name || seller.full_name || "Vendeur"}</p>
                  {seller.company_description && (
                    <p className="text-[10px] text-muted-foreground leading-snug mt-1">{seller.company_description}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* CENTER: Details + Items */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="md:col-span-5 space-y-3">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">{lot.brand}</span>
              <h1 className="font-heading text-lg font-bold text-foreground mt-1 leading-tight">{lot.title}</h1>
              {lotRating > 0 && (
                <div className="flex items-center gap-2 mt-1.5">
                  <StarRating rating={lotRating} size="md" />
                  <span className="text-sm font-semibold text-foreground">{lotRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({reviews.length} {t("lotDetail.reviews")})</span>
                </div>
              )}
            </div>

            {lot.description && (
              <p className="text-muted-foreground text-xs leading-relaxed">{lot.description}</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted rounded-lg p-2 text-center">
                <Package className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
                <p className="font-heading font-bold text-foreground text-xs">{lot.units}</p>
                <p className="text-[10px] text-muted-foreground">{t("common.units")}</p>
              </div>
              {lot.location && (
                <div className="bg-muted rounded-lg p-2 text-center">
                  <MapPin className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
                  <p className="font-heading font-bold text-foreground text-[10px]">{lot.location}</p>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border border-border rounded-xl p-3">
                <h3 className="font-heading font-semibold text-foreground text-xs mb-2">{t("lotDetail.lotContent")}</h3>
                {displayedItems.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-xs font-medium text-foreground">{item.name}</p>
                      {item.size && <p className="text-[10px] text-muted-foreground">{item.size}</p>}
                    </div>
                    <span className="text-xs font-heading font-bold text-primary whitespace-nowrap ml-2">{item.quantity} pcs</span>
                  </div>
                ))}
                {items.length > 4 && (
                  <button onClick={() => setShowAllItems(!showAllItems)} className="flex items-center gap-1 mt-1.5 text-xs text-primary font-medium hover:underline">
                    {showAllItems ? t("lotDetail.showLess") : t("lotDetail.moreItems", { count: items.length - 4 })}
                    <ChevronDown className={`h-3 w-3 transition-transform ${showAllItems ? "rotate-180" : ""}`} />
                  </button>
                )}
              </div>
            )}
          </motion.div>

          {/* RIGHT: Sticky price + cart */}
          <div className="md:col-span-3">
            <div className="md:sticky md:top-[72px] space-y-3">
              <div className="bg-card rounded-xl border border-border p-4 shadow-card">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="font-heading font-bold text-foreground text-sm">{t("lotDetail.price")}</span>
                    <span className="font-heading font-bold text-primary text-lg">{total.toLocaleString("fr-FR")} €</span>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={inCart}
                  className={`w-full mt-3 py-2.5 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm ${inCart ? "bg-muted text-muted-foreground cursor-default" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {inCart ? t("lotDetail.inCart") : t("lotDetail.addToCart")}
                </button>

                <button
                  onClick={() => {
                    if (!profile) {
                      navigate("/connexion");
                      return;
                    }
                    navigate(`/messages?with=${lot.seller_id}&lot=${lot.id}`);
                  }}
                  className="w-full mt-2 py-2 border border-border rounded-xl hover:bg-muted transition-colors flex items-center justify-center gap-2 text-xs text-foreground"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {t("lotDetail.contactSeller")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews section */}
        {reviews.length > 0 && (
          <div className="mt-8">
            <h3 className="font-heading font-semibold text-foreground text-sm mb-4">{t("lotDetail.buyerReviews")} ({reviews.length})</h3>
            <div className="space-y-3">
              {reviews.map((review, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-card rounded-xl border border-border p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{review.author.charAt(0)}</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">{review.author}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{new Date(review.date).toLocaleDateString("fr-FR")}</span>
                  </div>
                  <StarRating rating={review.rating} />
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{review.comment}</p>
                </motion.div>
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
                  rating={l.rating || 0}
                  location={l.location || ""}
                  category={l.category || ""}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-14 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <p className="font-heading font-bold text-foreground text-sm">{total.toLocaleString("fr-FR")} €</p>
            <p className="text-[10px] text-muted-foreground">{t("lotDetail.totalTTC")}</p>
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

      <BottomNav />
    </div>
  );
};

export default LotDetail;