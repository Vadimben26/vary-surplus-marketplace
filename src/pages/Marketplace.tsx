import { useState, useMemo } from "react";
import MarketplaceHeader from "@/components/MarketplaceHeader";
import BottomNav from "@/components/BottomNav";
import LotCard from "@/components/LotCard";
import { mockLots } from "@/data/mockLots";

const Marketplace = () => {
  const [filters, setFilters] = useState({
    location: "",
    priceRange: "",
    style: "",
    search: "",
  });

  const filteredLots = useMemo(() => {
    return mockLots.filter((lot) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!lot.title.toLowerCase().includes(q) && !lot.brand.toLowerCase().includes(q)) return false;
      }
      if (filters.location && !lot.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (filters.priceRange) {
        const price = parseFloat(lot.price.replace(/[^\d]/g, ""));
        if (filters.priceRange === "low" && price > 5000) return false;
        if (filters.priceRange === "mid" && (price < 5000 || price > 15000)) return false;
        if (filters.priceRange === "high" && price < 15000) return false;
      }
      if (filters.style) {
        const s = filters.style.toLowerCase();
        if (!lot.title.toLowerCase().includes(s) && !lot.brand.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [filters]);

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader filters={filters} onFiltersChange={setFilters} />
      <main className="px-4 md:px-8 py-6 pb-24 max-w-[1600px] mx-auto">
        {filteredLots.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">Aucun lot ne correspond à vos filtres.</p>
            <button
              onClick={() => setFilters({ location: "", priceRange: "", style: "", search: "" })}
              className="mt-4 text-primary hover:underline font-medium"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {filteredLots.map((lot) => (
              <LotCard key={lot.id} {...lot} />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Marketplace;
