import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import LegalFooter from "@/components/LegalFooter";
import LotCard from "@/components/LotCard";
import { useFavorites } from "@/contexts/FavoritesContext";
import { supabase } from "@/integrations/supabase/client";

const Favorites = () => {
  const { t } = useTranslation();
  const { favorites } = useFavorites();

  const { data: favoriteLots = [] } = useQuery({
    queryKey: ["favorite-lots", favorites],
    queryFn: async () => {
      if (favorites.length === 0) return [];
      const { data, error } = await supabase
        .from("lots")
        .select("*, lot_items(quantity, retail_price)")
        .in("id", favorites)
        .eq("status", "active");
      if (error) throw error;
      return (data || []).map((lot: any) => {
        const retailValue = (lot.lot_items || []).reduce(
          (sum: number, item: any) => sum + (item.retail_price || 0) * (item.quantity || 0), 0
        );
        const discount = retailValue > 0 ? Math.round((1 - lot.price / retailValue) * 100) : 0;
        return { ...lot, discount };
      });
    },
    enabled: favorites.length > 0,
  });

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-8 pb-24 max-w-[1600px] mx-auto">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-6">
          {t("favorites.title")} ({favoriteLots.length})
        </h1>

        {favoriteLots.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">{t("favorites.empty")}</p>
            <Link to="/marketplace" className="inline-block px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-dark transition-colors">
              {t("common.browseLots")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {favoriteLots.map((lot: any) => {
              const totalTTC = Math.round(lot.price * 1.19);
              const ppu = lot.units > 0 ? (lot.price * 1.19 / lot.units).toFixed(2) : null;
              return (
                <LotCard
                  key={lot.id}
                  id={lot.id}
                  image={lot.images?.[0] || ""}
                  title={lot.title}
                  brand={lot.brand}
                  price={`${totalTTC.toLocaleString("fr-FR")} €`}
                  pricePerUnit={ppu ? `${ppu} €` : undefined}
                  units={lot.units}
                  location={lot.location || ""}
                  category={lot.category || ""}
                  discount={lot.discount > 0 ? lot.discount : undefined}
                />
              );
            })}
          </div>
        )}
      </main>
      <LegalFooter />
      <BottomNav />
    </div>
  );
};

export default Favorites;
