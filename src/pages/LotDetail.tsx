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
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-8 h-16">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Link to="/marketplace">
            <img src={varyLogo} alt="Vary" className="h-8 w-auto" />
          </Link>
          <button onClick={() => toggleFavorite(lot.id)} className="p-2 rounded-full hover:bg-muted transition-colors">
            <Heart className={`h-5 w-5 ${liked ? "fill-destructive text-destructive" : "text-foreground"}`} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="aspect-square rounded-2xl overflow-hidden bg-muted">
            <img src={lot.image} alt={lot.title} className="w-full h-full object-cover" />
          </motion.div>

          {/* Details */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <span className="text-sm font-semibold text-primary uppercase tracking-wide">{lot.brand}</span>
              <div className="flex items-center gap-2 mt-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="text-sm font-medium text-foreground">{lot.rating.toFixed(1)}</span>
                {lot.isNew && <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground">Nouveau</span>}
              </div>
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mt-3">{lot.title}</h1>
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed">{lot.description}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Package className="h-4 w-4" />
                  <span className="text-xs font-medium">Quantité</span>
                </div>
                <p className="font-heading font-bold text-foreground">{lot.units} unités</p>
              </div>
              <div className="bg-muted rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-medium">Localisation</span>
                </div>
                <p className="font-heading font-bold text-foreground text-sm">{lot.location}</p>
              </div>
              {lot.sizes && (
                <div className="bg-muted rounded-xl p-4 col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">Tailles disponibles</span>
                  <p className="font-heading font-bold text-foreground">{lot.sizes}</p>
                </div>
              )}
            </div>

            {/* Detailed item breakdown */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-heading font-semibold text-foreground mb-4">Contenu détaillé du lot</h3>
              <div className="space-y-2">
                {displayedItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Tailles : {item.size}</p>
                    </div>
                    <span className="text-sm font-heading font-bold text-primary">{item.quantity} pcs</span>
                  </div>
                ))}
              </div>
              {lot.items.length > 4 && (
                <button onClick={() => setShowAllItems(!showAllItems)} className="flex items-center gap-1 mt-3 text-sm text-primary font-medium hover:underline">
                  {showAllItems ? "Voir moins" : `Voir tout (${lot.items.length} articles)`}
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAllItems ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>

            {/* Price breakdown */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
              <h3 className="font-heading font-semibold text-foreground mb-4">Estimation du coût total</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Prix du lot</span>
                  <span className="text-foreground font-medium">{lot.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3" /> Livraison estimée</span>
                  <span className="text-foreground font-medium">{deliveryFee} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Commission Vary (5%)</span>
                  <span className="text-foreground font-medium">{commissionAmount.toLocaleString("fr-FR")} €</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-heading font-bold text-foreground">Total estimé</span>
                  <span className="font-heading font-bold text-primary text-lg">{total.toLocaleString("fr-FR")} €</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={inCart}
                className={`flex-1 py-3 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${inCart ? "bg-muted text-muted-foreground cursor-default" : "bg-primary text-primary-foreground hover:bg-primary-dark"}`}
              >
                <ShoppingCart className="h-5 w-5" />
                {inCart ? "Déjà dans le panier" : "Ajouter au panier"}
              </button>
              <button className="px-4 py-3 border border-border rounded-xl hover:bg-muted transition-colors">
                <MessageCircle className="h-5 w-5 text-foreground" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Seller info */}
        <div className="mt-12 bg-card rounded-2xl border border-border p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">À propos du vendeur</h3>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h4 className="font-heading font-bold text-foreground">{lot.seller.name}</h4>
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                  <span className="text-sm font-medium text-foreground">{lot.seller.rating.toFixed(1)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{lot.seller.sales} ventes · {lot.seller.location}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{lot.seller.description}</p>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-8 mb-8">
          <h3 className="font-heading font-semibold text-foreground mb-4">Avis des acheteurs ({lot.reviews.length})</h3>
          <div className="space-y-4">
            {lot.reviews.map((review, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-bold text-foreground">{review.author.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{review.author}</p>
                      <p className="text-xs text-muted-foreground">{review.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className={`h-3.5 w-3.5 ${j < review.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default LotDetail;
