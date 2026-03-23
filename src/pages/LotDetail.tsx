import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Heart, Star, MapPin, Package, MessageCircle, ShoppingCart, User, ChevronDown, ChevronLeft, ChevronRight, TrendingDown, Image } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [activeImage, setActiveImage] = useState(0);
  const [selectedProductImage, setSelectedProductImage] = useState<string | null>(null);

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

  const reviews = useMemo(() => {
    if (!id) return [];
    const seed = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
    const count = 3 + (seed % 4);
    const shuffled = [...MOCK_REVIEWS].sort((a, b) => (a.author.charCodeAt(0) + seed) - (b.author.charCodeAt(0) + seed));
    return shuffled.slice(0, count);
  }, [id]);

  const images = lot?.images?.length ? lot.images : [];
  const items: any[] = lot?.lot_items || [];
  const seller = lot?.profiles as any;

  // Compute retail value & discount
  const retailValue = useMemo(() => items.reduce((sum, item) => sum + (item.retail_price || 0) * (item.quantity || 0), 0), [items]);
  const discount = retailValue > 0 ? Math.round((1 - (lot?.price || 0) / retailValue) * 100) : 0;

  // Product images from lot_items
  const productImages = useMemo(() => items.filter((item) => item.image_url).map((item) => ({ url: item.image_url, name: item.name })), [items]);

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
  const lotRating = lot.rating || 0;
  const avgReviewRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;

  const handleAddToCart = () => {
    addToCart(lot.id);
    toast.success(t("lotDetail.addedToCart"));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
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

          {/* CENTER: Details + Inventory table + Products */}
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

            {/* Inventory Table (replaces "Contenu du lot") */}
            {items.length > 0 && (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="bg-muted px-3 py-2 flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-foreground text-xs">{t("lotDetail.inventory", "Inventaire")}</h3>
                  <span className="text-[10px] text-muted-foreground">{items.length} {t("lotDetail.references", "références")}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">{t("lotDetail.colBrand", "Marque")}</th>
                        <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">{t("lotDetail.colName", "Article")}</th>
                        <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">{t("lotDetail.colSize", "Taille")}</th>
                        <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">{t("lotDetail.colCategory", "Catégorie")}</th>
                        <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">{t("lotDetail.colGender", "Genre")}</th>
                        <th className="text-right px-3 py-1.5 font-semibold text-muted-foreground">{t("lotDetail.colQty", "Qté")}</th>
                        <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">{t("lotDetail.colRef", "Réf.")}</th>
                        <th className="text-right px-3 py-1.5 font-semibold text-muted-foreground">{t("lotDetail.colRetail", "Prix retail")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item: any, i: number) => (
                        <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-1.5 text-foreground font-medium">{item.brand || lot.brand || "—"}</td>
                          <td className="px-3 py-1.5 text-foreground">{item.name}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{item.size || "—"}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{item.category || "—"}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{item.gender || "—"}</td>
                          <td className="px-3 py-1.5 text-right font-heading font-bold text-primary">{item.quantity}</td>
                          <td className="px-3 py-1.5 text-muted-foreground font-mono text-[10px]">{item.reference || "—"}</td>
                          <td className="px-3 py-1.5 text-right text-foreground">{item.retail_price ? `${Number(item.retail_price).toLocaleString("fr-FR")} €` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                    {retailValue > 0 && (
                      <tfoot>
                        <tr className="bg-muted/50 border-t border-border">
                          <td colSpan={5} className="px-3 py-1.5 font-semibold text-foreground text-xs">{t("lotDetail.totalRetail", "Valeur retail totale")}</td>
                          <td className="px-3 py-1.5 text-right font-heading font-bold text-foreground">{items.reduce((s: number, i: any) => s + (i.quantity || 0), 0)}</td>
                          <td></td>
                          <td className="px-3 py-1.5 text-right font-heading font-bold text-foreground">{retailValue.toLocaleString("fr-FR")} €</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* Products gallery (replaces buyer reviews position) */}
            {productImages.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Image className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-heading font-semibold text-foreground text-xs">{t("lotDetail.products", "Produits")}</h3>
                  <span className="text-[10px] text-muted-foreground">({productImages.length})</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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

            {/* Compact reviews as collapsible at bottom */}
            {reviews.length > 0 && (
              <ReviewsCompact reviews={reviews} avgRating={avgReviewRating} />
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
                  className={`w-full mt-3 py-2.5 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm ${inCart ? "bg-muted text-muted-foreground cursor-default" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {inCart ? t("lotDetail.inCart") : t("lotDetail.addToCart")}
                </button>

                <button
                  onClick={() => {
                    if (!profile) { navigate("/connexion"); return; }
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

      <BottomNav />
    </div>
  );
};

/* Compact reviews component — collapsible */
const ReviewsCompact = ({ reviews, avgRating }: { reviews: any[]; avgRating: number }) => {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-muted hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <StarRating rating={avgRating} size="sm" />
          <span className="text-xs font-semibold text-foreground">{avgRating.toFixed(1)}</span>
          <span className="text-[10px] text-muted-foreground">• {reviews.length} {t("lotDetail.reviews")}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="divide-y divide-border/50">
          {reviews.map((review, i) => (
            <div key={i} className="px-3 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground">{review.author}</span>
                  <StarRating rating={review.rating} />
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(review.date).toLocaleDateString("fr-FR")}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LotDetail;
