import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Crown, Lock, X } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import LotCard from "@/components/LotCard";
import FilterPanel, { B2BFilters, DEFAULT_FILTERS } from "@/components/marketplace/FilterPanel";
import FilterChips from "@/components/marketplace/FilterChips";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useShippingMatrix } from "@/hooks/useShippingMatrix";
import { useBuyerShippingCountry } from "@/hooks/useBuyerShippingCountry";
import { useBuyerMatching } from "@/hooks/useBuyerMatching";
import { sortLotsByMatch } from "@/lib/buyerMatching";
import { computeShippingCost, FLOOR_PRICE, PRICE_TO_SHIPPING_MULTIPLE } from "@/lib/shipping";

const Marketplace = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [filters, setFilters] = useState<B2BFilters>(DEFAULT_FILTERS);

  // Fetch lots WITH lot_items to compute retail value / discount
  const { data: dbLots = [] } = useQuery({
    queryKey: ["marketplace-lots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lots")
        .select("*, lot_items(quantity, retail_price), profiles!lots_seller_id_fkey(company_name, company_description)")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((lot: any) => {
        const retailValue = (lot.lot_items || []).reduce(
          (sum: number, item: any) => sum + (item.retail_price || 0) * (item.quantity || 0), 0
        );
        const discount = retailValue > 0 ? Math.round((1 - lot.price / retailValue) * 100) : 0;
        return { ...lot, retailValue, discount };
      });
    },
  });

  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    dbLots.forEach((lot: any) => { if (lot.brand) set.add(lot.brand); });
    return Array.from(set).sort();
  }, [dbLots]);

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

  const { country: buyerCountry } = useBuyerShippingCountry();
  const { data: shippingMatrix } = useShippingMatrix();
  const { profile: matchingProfile } = useBuyerMatching();

  const filteredLots = useMemo(() => {
    /**
     * Phase 6 visibility rule:
     * - For buyers with a profile (buyerCountry set), hide lots whose
     *   `price < max(FLOOR_PRICE, 11 × shipping cost)` from origin → buyer.
     * - For guests / no profile, no filter is applied.
     *
     * Phase 7: results are then sorted by buyer ↔ lot match score
     * (categories, delivery countries, budget, revenue tier, recency)
     * so the most relevant lots surface first. Guests keep the default
     * recency order.
     */
    const isReachable = (lot: any): boolean => {
      if (!buyerCountry || !shippingMatrix) return true;
      const origin = lot.location || (lot.profiles as any)?.country;
      if (!origin) return true;
      const r = computeShippingCost(origin, buyerCountry, lot.pallets || 1, shippingMatrix);
      if (!r) return false;
      const minPrice = Math.max(FLOOR_PRICE, PRICE_TO_SHIPPING_MULTIPLE * r.cost);
      return lot.price >= minPrice;
    };

    const filtered = dbLots.filter((lot: any) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!lot.title.toLowerCase().includes(q) && !lot.brand.toLowerCase().includes(q)) return false;
      }
      if (filters.countries.length > 0 && !filters.countries.includes(lot.location || "")) return false;
      if (lot.price < filters.priceRange[0] || lot.price > filters.priceRange[1]) return false;
      const ppi = lot.units > 0 ? lot.price / lot.units : 0;
      if (ppi < filters.pricePerItemRange[0] || ppi > filters.pricePerItemRange[1]) return false;
      if (lot.units < filters.unitsRange[0] || lot.units > filters.unitsRange[1]) return false;
      if (filters.minRating > 0 && (lot.rating || 0) < filters.minRating) return false;
      if (filters.categories.length > 0) {
        const lotCat = (lot.category || "").toLowerCase();
        const match = filters.categories.some((c) => lotCat.includes(c.toLowerCase()));
        if (!match) return false;
      }
      if (filters.brandsInclude.length > 0 && !filters.brandsInclude.includes(lot.brand)) return false;
      if (filters.brandsExclude.length > 0 && filters.brandsExclude.includes(lot.brand)) return false;
      if (filters.minDiscount > 0 && (lot.discount || 0) < filters.minDiscount) return false;
      if (!isReachable(lot)) return false;
      return true;
    });

    // Personalized sort for buyers with a completed questionnaire.
    return matchingProfile ? sortLotsByMatch(filtered, matchingProfile) : filtered;
  }, [filters, dbLots, buyerCountry, shippingMatrix, matchingProfile]);

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

  const renderLotCard = (lot: any, keyPrefix = "") => {
    const totalTTC = Math.round(lot.price * 1.19);
    const ppu = lot.units > 0 ? (lot.price * 1.19 / lot.units).toFixed(2) : null;
    return (
      <LotCard
        key={`${keyPrefix}${lot.id}`}
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
  };

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
                  {vipLots.map((lot: any) => renderLotCard(lot, "vip-blur-"))}
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
                {vipLots.map((lot: any) => renderLotCard(lot, "vip-"))}
              </div>
            </div>
          </div>
        )}

        <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="px-4 md:px-8 py-3 space-y-2">
            <FilterPanel filters={filters} onChange={setFilters} lotCounts={lotCounts} availableBrands={availableBrands} />
            <FilterChips filters={filters} onChange={setFilters} resultCount={filteredLots.length} />
          </div>
        </div>

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

        <main className="px-4 md:px-8 py-4 pb-24">
          {filteredLots.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">{t("marketplace.noResults")}</p>
              <button onClick={() => setFilters(DEFAULT_FILTERS)} className="mt-4 text-primary hover:underline font-medium">
                {t("marketplace.resetFilters")}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {filteredLots.map((lot: any) => renderLotCard(lot))}
            </div>
          )}
        </main>
      </div>
      <BottomNav />
    </div>
  );
};

export default Marketplace;
