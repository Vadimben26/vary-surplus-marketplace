import { Heart, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import LotCard from "@/components/LotCard";
import { useFavorites } from "@/contexts/FavoritesContext";
import { mockLots } from "@/data/mockLots";

const Favorites = () => {
  const { favorites } = useFavorites();
  const favoriteLots = mockLots.filter((lot) => favorites.includes(lot.id));

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-8 pb-24 max-w-[1600px] mx-auto">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-6">Vos favoris ({favoriteLots.length})</h1>

        {favoriteLots.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Vous n'avez pas encore de lots favoris. Parcourez les offres et cliquez sur le cœur pour les sauvegarder ici.
            </p>
            <Link to="/marketplace" className="inline-block px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-dark transition-colors">
              Parcourir les lots
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {favoriteLots.map((lot) => (
              <LotCard key={lot.id} {...lot} />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Favorites;
