import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Heart, Star, MapPin, Package, Truck, Shield, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { getLotById } from "@/data/mockLots";
import varyLogo from "@/assets/vary-logo.png";
import BottomNav from "@/components/BottomNav";

const LotDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const lot = getLotById(id || "");

  if (!lot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Lot introuvable</h1>
          <button onClick={() => navigate("/marketplace")} className="text-primary hover:underline">
            Retour aux lots
          </button>
        </div>
      </div>
    );
  }

  const deliveryFee = "350 €";
  const commission = "5%";
  const priceNum = parseFloat(lot.price.replace(/[^\d]/g, ""));
  const commissionAmount = Math.round(priceNum * 0.05);
  const total = priceNum + 350 + commissionAmount;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-8 h-16">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium hidden md:inline">Retour</span>
          </button>
          <Link to="/marketplace">
            <img src={varyLogo} alt="Vary" className="h-8 w-auto" />
          </Link>
          <button onClick={() => setLiked(!liked)} className="p-2 rounded-full hover:bg-muted transition-colors">
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
                <div className="bg-muted rounded-xl p-4">
                  <span className="text-xs font-medium text-muted-foreground">Tailles</span>
                  <p className="font-heading font-bold text-foreground">{lot.sizes}</p>
                </div>
              )}
              {lot.condition && (
                <div className="bg-muted rounded-xl p-4">
                  <span className="text-xs font-medium text-muted-foreground">État</span>
                  <p className="font-heading font-bold text-foreground text-sm">{lot.condition}</p>
                </div>
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
                  <span className="text-foreground font-medium">{deliveryFee}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Commission Vary ({commission})</span>
                  <span className="text-foreground font-medium">{commissionAmount.toLocaleString("fr-FR")} €</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-heading font-bold text-foreground">Total estimé</span>
                  <span className="font-heading font-bold text-primary text-lg">{total.toLocaleString("fr-FR")} €</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-dark transition-colors">
                Commander ce lot
              </button>
              <button className="px-4 py-3 border border-border rounded-xl hover:bg-muted transition-colors">
                <MessageCircle className="h-5 w-5 text-foreground" />
              </button>
            </div>
          </motion.div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default LotDetail;
