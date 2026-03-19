import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Crown, Lock } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import LotCard from "@/components/LotCard";
import { useAuth } from "@/contexts/AuthContext";
import { mockLots } from "@/data/mockLots";
import { Slider } from "@/components/ui/slider";

const locations = ["", "France", "Espagne", "Italie", "Allemagne", "Pays-Bas", "Portugal", "Belgique"];
const styles = ["", "Casual", "Business", "Sport", "Premium", "Denim"];

const PRICE_MIN = 0;
const PRICE_MAX = 50000;
const PRICE_STEP = 200;

const Marketplace = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [filters, setFilters] = useState({
    location: "",
    priceRange: [PRICE_MIN, PRICE_MAX] as [number, number],
    style: "",
    search: "",
  });
  const [activeCategory, setActiveCategory] = useState("");

  const filteredLots = useMemo(() => {
    return mockLots.filter((lot) => {
      if (activeCategory && lot.category !== activeCategory) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!lot.title.toLowerCase().includes(q) && !lot.brand.toLowerCase().includes(q)) return false;
      }
      if (filters.location && !lot.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
      const price = parseFloat(lot.price.replace(/[^\d]/g, ""));
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false;
      if (filters.style) {
        const s = filters.style.toLowerCase();
        if (!lot.title.toLowerCase().includes(s) && !lot.brand.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [filters, activeCategory]);

  const firstName = profile?.full_name?.split(" ")[0];
  const vipLots = mockLots.slice(0, 5);

  const hasActiveFilters = filters.location || filters.style || filters.priceRange[0] !== PRICE_MIN || filters.priceRange[1] !== PRICE_MAX;

  return (
    <div className="min-h-screen bg-background">
      <TopNav filters={{ location: filters.location, priceRange: "", style: filters.style, search: filters.search }} onFiltersChange={(f) => setFilters(prev => ({ ...prev, location: f.location, style: f.style, search: f.search }))} showSearch />

      {/* Welcome message */}
      {firstName && (
        <div className="px-4 md:px-8 max-w-[1600px] mx-auto pt-4">
          <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground">
            {t("marketplace.welcome", { name: firstName })} 👋
          </h2>
        </div>
      )}

      {/* VIP Exclusive Row — same grid as regular lots */}
      <div className="px-4 md:px-8 max-w-[1600px] mx-auto pt-6">
        <div className="rounded-2xl overflow-hidden border border-primary/20 bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-bold text-foreground text-sm">{t("marketplace.vipExclusive")}</h3>
            </div>
          </div>
          <div className="relative">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 blur-[8px] select-none pointer-events-none" aria-hidden="true">
              {vipLots.map((lot) => (
                <LotCard key={`vip-${lot.id}`} {...lot} />
              ))}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-card/90 backdrop-blur-sm border border-border rounded-xl shadow-lg">
                <Lock className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground text-sm">{t("marketplace.vipOnly")}</span>
              </div>
              <Link
                to="/buyer/vip"
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 transition-colors shadow-lg"
              >
                <Crown className="h-4 w-4" />
                {t("marketplace.becomeVip")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 md:px-8 max-w-[1600px] mx-auto py-3">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring"
              value={filters.location}
              onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
            >
              <option value="">{t("marketplace.allCountries")}</option>
              {locations.filter(Boolean).map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>

            {/* Price range slider */}
            <div className="flex items-center gap-2 min-w-[260px]">
              <span className="text-xs text-muted-foreground whitespace-nowrap">💰 {filters.priceRange[0].toLocaleString()}€</span>
              <Slider
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={PRICE_STEP}
                value={filters.priceRange}
                onValueChange={(val) => setFilters((f) => ({ ...f, priceRange: val as [number, number] }))}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">{filters.priceRange[1].toLocaleString()}€</span>
            </div>

            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring"
              value={filters.style}
              onChange={(e) => setFilters((f) => ({ ...f, style: e.target.value }))}
            >
              <option value="">{t("marketplace.allStyles")}</option>
              {styles.filter(Boolean).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                onClick={() => setFilters((f) => ({ ...f, location: "", priceRange: [PRICE_MIN, PRICE_MAX], style: "" }))}
                className="h-9 px-3 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors font-medium"
              >
                {t("marketplace.reset")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search */}
      <div className="md:hidden px-4 pt-3">
        <div className="flex items-center bg-muted rounded-full border border-border px-4 py-2.5">
          <input
            type="text"
            placeholder={t("marketplace.searchPlaceholder")}
            className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
      </div>

      <main className="px-4 md:px-8 py-4 pb-24 max-w-[1600px] mx-auto">
        {filteredLots.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">{t("marketplace.noResults")}</p>
            <button
              onClick={() => setFilters({ location: "", priceRange: [PRICE_MIN, PRICE_MAX], style: "", search: "" })}
              className="mt-4 text-primary hover:underline font-medium"
            >
              {t("marketplace.resetFilters")}
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
