import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Crown, Lock, SlidersHorizontal, X } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import LotCard from "@/components/LotCard";
import FilterPanel, { B2BFilters, DEFAULT_FILTERS, PRICE_MAX, PRICE_PER_ITEM_MAX, UNITS_MAX } from "@/components/marketplace/FilterPanel";
import FilterChips from "@/components/marketplace/FilterChips";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

const Marketplace = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [filters, setFilters] = useState<B2BFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const { data: dbLots = [] } = useQuery({
    queryKey: ["marketplace-lots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lots")
        .select("*, profiles!lots_seller_id_fkey(company_name, company_description)")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Compute available brands from data
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    dbLots.forEach((lot: any) => { if (lot.brand) set.add(lot.brand); });
    return Array.from(set).sort();
  }, [dbLots]);

  // Compute counts for filters
  const lotCounts = useMemo(() => {
    const countries: Record<string, number> = {};
    const categories: Record<string, number> = {};
    const brands: Record<string, number> = {};
    dbLots.forEach((lot: any) => {
      if (lot.location) countries[lot.location] = (countries[lot.location] || 0) + 1;
      if (lot.category) categories[lot.category] = (categories[lot.category] || 0) + 1;
      if (lot.brand) brands[lot.brand] = (brands[lot.brand] || 0) + 1;
    });
    return { countries, categories, brands, total: dbLots.length };
  }, [dbLots]);

  const filteredLots = useMemo(() => {
    return dbLots.filter((lot: any) => {
      // Search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!lot.title.toLowerCase().includes(q) && !lot.brand.toLowerCase().includes(q)) return false;
      }
      // Country
      if (filters.countries.length > 0 && !filters.countries.includes(lot.location || "")) return false;
      // Total price
      if (lot.price < filters.priceRange[0] || lot.price > filters.priceRange[1]) return false;
      // Price per item
      const ppi = lot.units > 0 ? lot.price / lot.units : 0;
      if (ppi < filters.pricePerItemRange[0] || ppi > filters.pricePerItemRange[1]) return false;
      // Units
      if (lot.units < filters.unitsRange[0] || lot.units > filters.unitsRange[1]) return false;
      // Rating
      if (filters.minRating > 0 && (lot.rating || 0) < filters.minRating) return false;
      // Category (contains mode for now — single category field)
      if (filters.categories.length > 0) {
        const lotCat = (lot.category || "").toLowerCase();
        const match = filters.categories.some((c) => lotCat.includes(c.toLowerCase()));
        if (!match) return false;
      }
      // Brands include
      if (filters.brandsInclude.length > 0 && !filters.brandsInclude.includes(lot.brand)) return false;
      // Brands exclude
      if (filters.brandsExclude.length > 0 && filters.brandsExclude.includes(lot.brand)) return false;
      return true;
    });
  }, [filters, dbLots]);

  const firstName = profile?.full_name?.split(" ")[0];
  const vipLots = dbLots.slice(0, 5);

  const { data: isBuyerVip = false } = useQuery({
    queryKey: ["buyer-vip-status", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return false;
      const { data } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", profile.id)
        .eq("plan", "buyer_vip")
        .eq("status", "active")
        .maybeSingle();
      return !!data;
    },
    enabled: !!profile?.id,
  });

  const hasActiveFilters = filters.countries.length > 0 ||
    filters.priceRange[0] > 0 || filters.priceRange[1] < PRICE_MAX ||
    filters.pricePerItemRange[0] > 0 || filters.pricePerItemRange[1] < PRICE_PER_ITEM_MAX ||
    filters.unitsRange[0] > 0 || filters.unitsRange[1] < UNITS_MAX ||
    filters.minRating > 0 || filters.categories.length > 0 ||
    filters.brandsInclude.length > 0 || filters.brandsExclude.length > 0 ||
    filters.search.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <TopNav
        filters={{ location: "", priceRange: "", style: "", search: filters.search }}
        onFiltersChange={(f) => setFilters((prev) => ({ ...prev, search: f.search }))}
        showSearch
      />

      <div className="max-w-[1600px] mx-auto">
        {firstName && (
          <div className="px-4 md:px-8 pt-4">
            <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground">
              {t("marketplace.welcome", { name: firstName })} 👋
            </h2>
          </div>
        )}

        {/* VIP Row */}
        {!isBuyerVip && (
          <div className="px-4 md:px-8 pt-6">
            <div className="rounded-2xl overflow-hidden border border-primary/20 bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <h3 className="font-heading font-bold text-foreground text-sm">{t("marketplace.vipExclusive")}</h3>
                </div>
              </div>
              <div className="relative">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 blur-[8px] select-none pointer-events-none" aria-hidden="true">
                  {vipLots.map((lot: any) => (
                    <LotCard key={`vip-${lot.id}`} id={lot.id} image={lot.images?.[0] || ""} title={lot.title} brand={lot.brand} price={`${Math.round(lot.price * 1.19).toLocaleString("fr-FR")} €`} pricePerUnit={lot.units > 0 ? `${(lot.price * 1.19 / lot.units).toFixed(2)} €` : undefined} units={lot.units} rating={lot.rating || 0} location={lot.location || ""} category={lot.category || ""} />
                  ))}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-card/90 backdrop-blur-sm border border-border rounded-xl shadow-lg">
                    <Lock className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground text-sm">{t("marketplace.vipOnly")}</span>
                  </div>
                  <Link to="/buyer/vip" className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 transition-colors shadow-lg">
                    <Crown className="h-4 w-4" />
                    {t("marketplace.becomeVip")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {isBuyerVip && vipLots.length > 0 && (
          <div className="px-4 md:px-8 pt-6">
            <div className="rounded-2xl overflow-hidden border border-primary/20 bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-5 w-5 text-primary" />
                <h3 className="font-heading font-bold text-foreground text-sm">{t("marketplace.vipExclusive")}</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {vipLots.map((lot: any) => (
                  <LotCard key={`vip-${lot.id}`} id={lot.id} image={lot.images?.[0] || ""} title={lot.title} brand={lot.brand} price={`${Math.round(lot.price * 1.19).toLocaleString("fr-FR")} €`} pricePerUnit={lot.units > 0 ? `${(lot.price * 1.19 / lot.units).toFixed(2)} €` : undefined} units={lot.units} rating={lot.rating || 0} location={lot.location || ""} category={lot.category || ""} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Horizontal filter bar */}
        <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="px-4 md:px-8 py-3 space-y-2">
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              lotCounts={lotCounts}
              availableBrands={availableBrands}
            />
            <FilterChips filters={filters} onChange={setFilters} resultCount={filteredLots.length} />
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
            {filters.search && (
              <button onClick={() => setFilters((f) => ({ ...f, search: "" }))}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Lot grid */}
        <main className="px-4 md:px-8 py-4 pb-24">
          {filteredLots.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">{t("marketplace.noResults")}</p>
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="mt-4 text-primary hover:underline font-medium"
              >
                {t("marketplace.resetFilters")}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {filteredLots.map((lot: any) => {
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
                    rating={lot.rating || 0}
                    location={lot.location || ""}
                    category={lot.category || ""}
                  />
                );
              })}
            </div>
          )}
        </main>
      </div>
      <BottomNav />
    </div>
  );
};

export default Marketplace;
