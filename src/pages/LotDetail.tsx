import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Heart, Star, MapPin, Package, Truck, Shield, MessageCircle, ShoppingCart, User, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
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
        {/* Top section: 3 columns on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Image — col 1-5 */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="md:col-span-5">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-muted">
              <img src={lot.image} alt={lot.title} className="w-full h-full object-cover" />
            </div>
          </motion.div>

          {/* Details — col 6-8 */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="md:col-span-4 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">{lot.brand}</span>
                {lot.isNew && <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary text-primary-foreground">Nouveau</span>}
              </div>
              <h1 className="font-heading text-lg md:text-xl font-bold text-foreground mt-1 leading-tight">{lot.title}</h1>
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                <span className="text-xs font-medium text-foreground">{lot.rating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground ml-1">· {lot.reviews.length} avis</span>
              </div>
            </div>

            <p className="text-muted-foreground text-xs leading-relaxed">{lot.description}</p>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted rounded-lg p-2.5 text-center">
                <Package className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
                <p className="font-heading font-bold text-foreground text-xs">{lot.units}</p>
                <p className="text-[10px] text-muted-foreground">unités</p>
              </div>
              <div className="bg-muted rounded-lg p-2.5 text-center">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
                <p className="font-heading font-bold text-foreground text-[10px]">{lot.location.split(",")[0]}</p>
                <p className="text-[10px] text-muted-foreground">{lot.location.split(",")[1]?.trim()}</p>
              </div>
              {lot.sizes && (
                <div className="bg-muted rounded-lg p-2.5 text-center">
                  <span className="text-[10px] text-muted-foreground">Tailles</span>
                  <p className="font-heading font-bold text-foreground text-xs">{lot.sizes}</p>
                </div>
              )}
            </div>

            {/* Item breakdown */}
            <div className="border border-border rounded-xl p-3">
              <h3 className="font-heading font-semibold text-foreground text-sm mb-2">Contenu du lot</h3>
              <div className="space-y-0">
                {displayedItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-xs font-medium text-foreground">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.size}</p>
                    </div>
                    <span className="text-xs font-heading font-bold text-primary whitespace-nowrap ml-2">{item.quantity} pcs</span>
                  </div>
                ))}
              </div>
              {lot.items.length > 4 && (
                <button onClick={() => setShowAllItems(!showAllItems)} className="flex items-center gap-1 mt-2 text-xs text-primary font-medium hover:underline">
                  {showAllItems ? "Voir moins" : `+${lot.items.length - 4} articles`}
                  <ChevronDown className={`h-3 w-3 transition-transform ${showAllItems ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>

            {/* Seller mini */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-foreground truncate">{lot.seller.name}</p>
                  <div className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    <span className="text-[10px] font-medium text-foreground">{lot.seller.rating.toFixed(1)}</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">{lot.seller.sales} ventes · {lot.seller.location}</p>
              </div>
            </div>
          </motion.div>

          {/* Sticky price panel — col 9-12 */}
          <div className="md:col-span-3">
            <div className="md:sticky md:top-20 space-y-4">
              <div className="bg-card rounded-2xl border border-border p-4 shadow-card">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Prix du lot</span>
                    <span className="text-foreground font-medium text-xs">{lot.price}</span>
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
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-heading font-bold text-foreground text-sm">Total</span>
                    <span className="font-heading font-bold text-primary text-lg">{total.toLocaleString("fr-FR")} €</span>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={inCart}
                  className={`w-full mt-4 py-3 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm ${inCart ? "bg-muted text-muted-foreground cursor-default" : "bg-primary text-primary-foreground hover:bg-primary-dark"}`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {inCart ? "Dans le panier" : "Ajouter au panier"}
                </button>

                <button className="w-full mt-2 py-2.5 border border-border rounded-xl hover:bg-muted transition-colors flex items-center justify-center gap-2 text-sm text-foreground">
                  <MessageCircle className="h-4 w-4" />
                  Contacter le vendeur
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom sections: Seller detail + Reviews — full width, 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
          {/* Seller detail */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-heading font-semibold text-foreground text-sm mb-3">À propos du vendeur</h3>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-heading font-bold text-foreground text-sm">{lot.seller.name}</h4>
                  <div className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    <span className="text-xs font-medium text-foreground">{lot.seller.rating.toFixed(1)}</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-1.5">{lot.seller.sales} ventes · {lot.seller.location}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{lot.seller.description}</p>
              </div>
            </div>
          </div>

          {/* Reviews */}
          <div>
            <h3 className="font-heading font-semibold text-foreground text-sm mb-3">Avis acheteurs ({lot.reviews.length})</h3>
            <div className="space-y-3">
              {lot.reviews.map((review, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-card rounded-xl border border-border p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-[10px] font-bold text-foreground">{review.author.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{review.author}</p>
                        <p className="text-[10px] text-muted-foreground">{review.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className={`h-3 w-3 ${j < review.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{review.comment}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default LotDetail;
