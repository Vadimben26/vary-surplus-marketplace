import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Heart, Star, MapPin, Package, Truck, Shield, MessageCircle, ShoppingCart, User, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useCallback } from "react";
import { getLotById } from "@/data/mockLots";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";
import varyLogo from "@/assets/vary-logo.png";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const LotDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isInCart, addToCart } = useCart();
  const lot = getLotById(id || "");
  const [showAllItems, setShowAllItems] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const images = lot?.images || (lot ? [lot.image] : []);

  const prevImage = useCallback(() => setActiveImage((i) => (i === 0 ? images.length - 1 : i - 1)), [images.length]);
  const nextImage = useCallback(() => setActiveImage((i) => (i === images.length - 1 ? 0 : i + 1)), [images.length]);

  if (!lot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Lot introuvable</h1>
          <button onClick={() => navigate("/marketplace")} className="text-primary hover:underline">Retour aux lots</button>
        </div>
      </div>
    );
  }

  const liked = isFavorite(lot.id);
  const inCart = isInCart(lot.id);
  const deliveryFee = 350;
  const priceNum = parseFloat(lot.price.replace(/[^\d]/g, ""));
  const commissionAmount = Math.round(priceNum * 0.05);
  const total = priceNum + deliveryFee + commissionAmount;
  const displayedItems = showAllItems ? lot.items : lot.items.slice(0, 4);

  const handleAddToCart = () => {
    addToCart(lot.id);
    toast.success("Lot ajouté au panier");
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
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-muted group">
              <motion.img
                key={activeImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                src={images[activeImage]}
                alt={`${lot.title} - photo ${activeImage + 1}`}
                className="w-full h-full object-cover"
              />
              {images.length > 1 && (
                <>
                  <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card">
                    <ChevronLeft className="h-4 w-4 text-foreground" />
                  </button>
                  <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card">
                    <ChevronRight className="h-4 w-4 text-foreground" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button key={i} onClick={() => setActiveImage(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImage ? "bg-primary w-3" : "bg-card/60"}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-1.5 mt-2">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)} className={`flex-1 aspect-square rounded-lg overflow-hidden border-2 transition-all ${i === activeImage ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}>
                    <img src={img} alt={`Miniature ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {/* Seller compact */}
            <div className="flex items-start gap-2.5 p-3 bg-muted rounded-xl">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-foreground truncate">{lot.seller.name}</p>
                  <Star className="h-3 w-3 fill-primary text-primary flex-shrink-0" />
                  <span className="text-[10px] font-medium text-foreground">{lot.seller.rating.toFixed(1)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{lot.seller.sales} ventes</p>
                <p className="text-[10px] text-muted-foreground leading-snug mt-1">{lot.seller.description}</p>
              </div>
            </div>
          </div>

          {/* CENTER: Details + Items */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="md:col-span-5 space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">{lot.brand}</span>
                {lot.isNew && <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary text-primary-foreground">Nouveau</span>}
              </div>
              <h1 className="font-heading text-lg font-bold text-foreground mt-1 leading-tight">{lot.title}</h1>
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                <span className="text-xs font-medium text-foreground">{lot.rating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground ml-1">· {lot.reviews.length} avis</span>
              </div>
            </div>

            <p className="text-muted-foreground text-xs leading-relaxed">{lot.description}</p>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted rounded-lg p-2 text-center">
                <Package className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
                <p className="font-heading font-bold text-foreground text-xs">{lot.units}</p>
                <p className="text-[10px] text-muted-foreground">unités</p>
              </div>
              <div className="bg-muted rounded-lg p-2 text-center">
                <MapPin className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
                <p className="font-heading font-bold text-foreground text-[10px]">{lot.location.split(",")[0]}</p>
                <p className="text-[10px] text-muted-foreground">{lot.location.split(",")[1]?.trim()}</p>
              </div>
              {lot.sizes && (
                <div className="bg-muted rounded-lg p-2 text-center">
                  <span className="text-[10px] text-muted-foreground">Tailles</span>
                  <p className="font-heading font-bold text-foreground text-xs">{lot.sizes}</p>
                </div>
              )}
            </div>

            {/* Item breakdown */}
            <div className="border border-border rounded-xl p-3">
              <h3 className="font-heading font-semibold text-foreground text-xs mb-2">Contenu du lot</h3>
              {displayedItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-xs font-medium text-foreground">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.size}</p>
                  </div>
                  <span className="text-xs font-heading font-bold text-primary whitespace-nowrap ml-2">{item.quantity} pcs</span>
                </div>
              ))}
              {lot.items.length > 4 && (
                <button onClick={() => setShowAllItems(!showAllItems)} className="flex items-center gap-1 mt-1.5 text-xs text-primary font-medium hover:underline">
                  {showAllItems ? "Voir moins" : `+${lot.items.length - 4} articles`}
                  <ChevronDown className={`h-3 w-3 transition-transform ${showAllItems ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>
          </motion.div>

          {/* RIGHT: Sticky price + cart */}
          <div className="md:col-span-3">
            <div className="md:sticky md:top-[72px] space-y-3">
              <div className="bg-card rounded-xl border border-border p-4 shadow-card">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Prix du lot</span>
                    <span className="text-foreground font-semibold text-sm">{lot.price}</span>
                  </div>
                  {lot.pricePerUnit && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Prix unitaire</span>
                      <span className="text-foreground font-medium text-xs">{lot.pricePerUnit}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs flex items-center gap-1"><Truck className="h-3 w-3" /> Livraison</span>
                    <span className="text-foreground font-medium text-xs">{deliveryFee} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs flex items-center gap-1"><Shield className="h-3 w-3" /> Commission (5%)</span>
                    <span className="text-foreground font-medium text-xs">{commissionAmount.toLocaleString("fr-FR")} €</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between items-baseline">
                    <span className="font-heading font-bold text-foreground text-sm">Total</span>
                    <span className="font-heading font-bold text-primary text-lg">{total.toLocaleString("fr-FR")} €</span>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={inCart}
                  className={`w-full mt-3 py-2.5 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm ${inCart ? "bg-muted text-muted-foreground cursor-default" : "bg-primary text-primary-foreground hover:bg-primary-dark"}`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {inCart ? "Dans le panier" : "Ajouter au panier"}
                </button>

                <button className="w-full mt-2 py-2 border border-border rounded-xl hover:bg-muted transition-colors flex items-center justify-center gap-2 text-xs text-foreground">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Contacter le vendeur
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews — full width below */}
        <div className="mt-6">
          <h3 className="font-heading font-semibold text-foreground text-sm mb-3">Avis acheteurs ({lot.reviews.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {lot.reviews.map((review, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-card rounded-xl border border-border p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-[10px] font-bold text-foreground">{review.author.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{review.author}</p>
                      <p className="text-[10px] text-muted-foreground">{review.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className={`h-2.5 w-2.5 ${j < review.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{review.comment}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-14 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <p className="font-heading font-bold text-foreground text-sm">{total.toLocaleString("fr-FR")} €</p>
            <p className="text-[10px] text-muted-foreground">Total TTC</p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={inCart}
            className={`flex-1 max-w-[200px] py-2.5 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm ${inCart ? "bg-muted text-muted-foreground cursor-default" : "bg-primary text-primary-foreground hover:bg-primary-dark"}`}
          >
            <ShoppingCart className="h-4 w-4" />
            {inCart ? "Dans le panier" : "Ajouter"}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default LotDetail;
