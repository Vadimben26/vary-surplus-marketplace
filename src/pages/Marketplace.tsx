import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Crown, Lock } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import LotCard from "@/components/LotCard";
import { useAuth } from "@/contexts/AuthContext";
import { mockLots } from "@/data/mockLots";

const locations = ["", "France", "Espagne", "Italie", "Allemagne", "Pays-Bas", "Portugal", "Belgique"];
const priceRanges = [
  { value: "", labelKey: "marketplace.allPrices" },
  { value: "low", label: "< 5 000 €" },
  { value: "mid", label: "5 000 – 15 000 €" },
  { value: "high", label: "> 15 000 €" },
];
const styles = ["", "Casual", "Business", "Sport", "Premium", "Denim"];

const Marketplace = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [filters, setFilters] = useState({
    location: "",
    priceRange: "",
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

  const firstName = profile?.full_name?.split(" ")[0];

  // VIP lots: first 4 lots from full list (shown blurred)
  const vipLots = mockLots.slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <TopNav filters={filters} onFiltersChange={setFilters} showSearch />

      {/* Welcome message */}
      {firstName && (
        <div className="px-4 md:px-8 max-w-[1600px] mx-auto pt-4">
          <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground">
            {t("marketplace.welcome", { name: firstName })} 👋
          </h2>
        </div>
      )}

      {/* VIP Exclusive Row */}
      <div className="px-4 md:px-8 max-w-[1600px] mx-auto pt-6">
        <div className="relative rounded-2xl overflow-hidden border border-primary/20 bg-card p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-bold text-foreground">{t("marketplace.vipExclusive")}</h3>
            </div>
            <Link
              to="/buyer/vip"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 transition-colors"
            >
              <Crown className="h-4 w-4" />
              {t("marketplace.becomeVip")}
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t("marketplace.vipDesc")}</p>
          <div className="relative">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 blur-[8px] select-none pointer-events-none" aria-hidden="true">
              {vipLots.map((lot) => (
                <LotCard key={`vip-${lot.id}`} {...lot} />
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 px-5 py-3 bg-card/90 backdrop-blur-sm border border-border rounded-xl shadow-lg">
                <Lock className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground text-sm">{t("marketplace.vipOnly")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-4 md:px-8 max-w-[1600px] mx-auto pt-5">
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
          <select
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring"
            value={filters.priceRange}
            onChange={(e) => setFilters((f) => ({ ...f, priceRange: e.target.value }))}
          >
            {priceRanges.map((pr) => (
              <option key={pr.value} value={pr.value}>💰 {pr.labelKey ? t(pr.labelKey) : pr.label}</option>
            ))}
          </select>
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
          {(filters.location || filters.priceRange || filters.style) && (
            <button
              onClick={() => setFilters({ location: "", priceRange: "", style: "", search: filters.search })}
              className="h-9 px-3 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors font-medium"
            >
              {t("marketplace.reset")}
            </button>
          )}
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
              onClick={() => setFilters({ location: "", priceRange: "", style: "", search: "" })}
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
