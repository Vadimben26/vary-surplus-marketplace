import { useState, useMemo } from "react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import LotCard from "@/components/LotCard";
import CategoryBar from "@/components/CategoryBar";
import { mockLots } from "@/data/mockLots";
import { MapPin, DollarSign, Palette } from "lucide-react";

const locations = ["", "France", "Espagne", "Italie", "Allemagne", "Pays-Bas", "Portugal", "Belgique"];
const priceRanges = [
  { value: "", label: "Tous les prix" },
  { value: "low", label: "< 5 000 €" },
  { value: "mid", label: "5 000 – 15 000 €" },
  { value: "high", label: "> 15 000 €" },
];
const styles = ["", "Casual", "Business", "Sport", "Premium", "Denim"];

const Marketplace = () => {
  const [filters, setFilters] = useState({
    location: "",
    priceRange: "",
    style: "",
    search: "",
  });
  const [activeCategory, setActiveCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filteredLots = useMemo(() => {
    return mockLots.filter((lot) => {
      if (activeCategory && lot.category !== activeCategory) return false;
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
  }, [filters, activeCategory]);

  return (
    <div className="min-h-screen bg-background">
      <TopNav filters={filters} onFiltersChange={setFilters} showSearch />

      {/* Filter bar */}
      <div className="px-4 md:px-8 max-w-[1600px] mx-auto pt-3">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring"
            value={filters.location}
            onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
          >
            <option value="">📍 Tous les pays</option>
            {locations.filter(Boolean).map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring"
            value={filters.priceRange}
            onChange={(e) => setFilters((f) => ({ ...f, priceRange: e.target.value }))}
          >
            {priceRanges.map((pr) => (
              <option key={pr.value} value={pr.value}>💰 {pr.label}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring"
            value={filters.style}
            onChange={(e) => setFilters((f) => ({ ...f, style: e.target.value }))}
          >
            <option value="">🎨 Tous les styles</option>
            {styles.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {(filters.location || filters.priceRange || filters.style) && (
            <button
              onClick={() => setFilters({ location: "", priceRange: "", style: "", search: filters.search })}
              className="h-9 px-3 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors font-medium"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="px-4 md:px-8 max-w-[1600px] mx-auto pt-3">
        <CategoryBar activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      </div>

      {/* Mobile search */}
      <div className="md:hidden px-4 pt-3">
        <div className="flex items-center bg-muted rounded-full border border-border px-4 py-2.5">
          <input
            type="text"
            placeholder="Rechercher un lot, une marque..."
            className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
      </div>

      <main className="px-4 md:px-8 py-4 pb-24 max-w-[1600px] mx-auto">
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
