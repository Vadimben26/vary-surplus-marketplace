import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, DollarSign, Package, Star, Percent, X, Plus, Minus, ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface B2BFilters {
  search: string;
  countries: string[];
  priceRange: [number, number];
  pricePerItemRange: [number, number];
  unitsRange: [number, number];
  minRating: number;
  minDiscount: number;
  categories: string[];
  categoryMode: "contains" | "mostly";
  brandsInclude: string[];
  brandsExclude: string[];
}

export const DEFAULT_FILTERS: B2BFilters = {
  search: "",
  countries: [],
  priceRange: [0, 50000],
  pricePerItemRange: [0, 100],
  unitsRange: [0, 5000],
  minRating: 0,
  minDiscount: 0,
  categories: [],
  categoryMode: "contains",
  brandsInclude: [],
  brandsExclude: [],
};

export const PRICE_MAX = 50000;
export const PRICE_PER_ITEM_MAX = 100;
export const UNITS_MAX = 5000;

const COUNTRIES = [
  "France", "Espagne", "Italie", "Allemagne", "Pays-Bas", "Portugal",
  "Belgique", "Royaume-Uni", "Pologne", "Roumanie", "Suède",
  "Autriche", "Grèce", "Suisse", "Tchéquie", "Danemark", "Irlande",
  "Hongrie", "Croatie",
];

const CATEGORIES = [
  "Vêtements", "Sacs", "Sneakers", "Beauté", "Sport", "Électronique",
];

interface FilterDropdownProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  children: React.ReactNode;
  wide?: boolean;
}

const FilterDropdown = ({ label, icon, active, children, wide }: FilterDropdownProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border whitespace-nowrap ${
          active
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card text-foreground border-border hover:border-primary/50"
        }`}
      >
        {icon}
        {label}
        <ChevronDown className="h-3 w-3 ml-0.5" />
      </button>
    </PopoverTrigger>
    <PopoverContent
      className={`p-3 ${wide ? "w-[360px]" : "w-[280px]"}`}
      align="start"
      sideOffset={8}
    >
      {children}
    </PopoverContent>
  </Popover>
);

interface FilterPanelProps {
  filters: B2BFilters;
  onChange: (filters: B2BFilters) => void;
  lotCounts: {
    countries: Record<string, number>;
    categories: Record<string, number>;
    brands: Record<string, number>;
    total: number;
  };
  availableBrands: string[];
}

const FilterPanel = ({ filters, onChange, lotCounts, availableBrands }: FilterPanelProps) => {
  const { t } = useTranslation();
  const [brandSearch, setBrandSearch] = useState("");

  const update = (partial: Partial<B2BFilters>) => onChange({ ...filters, ...partial });

  const toggleArrayItem = (key: "countries" | "categories" | "brandsInclude" | "brandsExclude", value: string) => {
    const arr = filters[key] as string[];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    update({ [key]: next });
  };

  const filteredBrands = availableBrands
    .filter((b) => b.toLowerCase().includes(brandSearch.toLowerCase()))
    .slice(0, 15);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Country */}
      <FilterDropdown
        label={t("filters.country")}
        icon={<MapPin className="h-3.5 w-3.5" />}
        active={filters.countries.length > 0}
        wide
      >
        <div className="flex flex-wrap gap-1.5">
          {COUNTRIES.map((c) => {
            const count = lotCounts.countries[c] || 0;
            const selected = filters.countries.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleArrayItem("countries", c)}
                disabled={count === 0 && !selected}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selected
                    ? "bg-primary text-primary-foreground"
                    : count === 0
                    ? "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                    : "bg-muted text-foreground hover:bg-accent"
                }`}
              >
                {c}
                <span className={`text-[10px] ${selected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </FilterDropdown>

      {/* Total price */}
      <FilterDropdown
        label={t("filters.totalPrice")}
        icon={<DollarSign className="h-3.5 w-3.5" />}
        active={filters.priceRange[0] > 0 || filters.priceRange[1] < PRICE_MAX}
      >
        <div className="space-y-3">
          <Slider
            min={0}
            max={PRICE_MAX}
            step={200}
            value={filters.priceRange}
            onValueChange={(val) => update({ priceRange: val as [number, number] })}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{filters.priceRange[0].toLocaleString("fr-FR")} €</span>
            <span>{filters.priceRange[1].toLocaleString("fr-FR")} €</span>
          </div>
        </div>
      </FilterDropdown>

      {/* Price per item */}
      <FilterDropdown
        label={t("filters.pricePerItem")}
        icon={<DollarSign className="h-3.5 w-3.5" />}
        active={filters.pricePerItemRange[0] > 0 || filters.pricePerItemRange[1] < PRICE_PER_ITEM_MAX}
      >
        <div className="space-y-3">
          <Slider
            min={0}
            max={PRICE_PER_ITEM_MAX}
            step={1}
            value={filters.pricePerItemRange}
            onValueChange={(val) => update({ pricePerItemRange: val as [number, number] })}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{filters.pricePerItemRange[0]} €/pc</span>
            <span>{filters.pricePerItemRange[1]} €/pc</span>
          </div>
        </div>
      </FilterDropdown>

      {/* Units */}
      <FilterDropdown
        label={t("filters.totalUnits")}
        icon={<Package className="h-3.5 w-3.5" />}
        active={filters.unitsRange[0] > 0 || filters.unitsRange[1] < UNITS_MAX}
      >
        <div className="space-y-3">
          <Slider
            min={0}
            max={UNITS_MAX}
            step={10}
            value={filters.unitsRange}
            onValueChange={(val) => update({ unitsRange: val as [number, number] })}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{filters.unitsRange[0].toLocaleString("fr-FR")} pcs</span>
            <span>{filters.unitsRange[1].toLocaleString("fr-FR")} pcs</span>
          </div>
        </div>
      </FilterDropdown>

      {/* Rating */}
      <FilterDropdown
        label={t("filters.sellerRating")}
        icon={<Star className="h-3.5 w-3.5" />}
        active={filters.minRating > 0}
      >
        <div className="flex gap-2">
          {[0, 3, 3.5, 4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => update({ minRating: r })}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filters.minRating === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-accent"
              }`}
            >
              {r === 0 ? t("filters.all") : `≥ ${r}`}
              {r > 0 && <Star className="h-3 w-3 fill-current" />}
            </button>
          ))}
        </div>
      </FilterDropdown>

      {/* Discount */}
      <FilterDropdown
        label={t("filters.discount")}
        icon={<Percent className="h-3.5 w-3.5" />}
        active={filters.minDiscount > 0}
      >
        <div className="flex flex-wrap gap-2">
          {[0, 20, 30, 50, 60, 70].map((d) => (
            <button
              key={d}
              onClick={() => update({ minDiscount: d })}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filters.minDiscount === d
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-accent"
              }`}
            >
              {d === 0 ? t("filters.all") : `≥ ${d}%`}
            </button>
          ))}
        </div>
      </FilterDropdown>
      <FilterDropdown
        label={t("filters.category")}
        icon={<Package className="h-3.5 w-3.5" />}
        active={filters.categories.length > 0}
      >
        <div className="space-y-3">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["contains", "mostly"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => update({ categoryMode: mode })}
                className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filters.categoryMode === mode
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(`filters.mode_${mode}`)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const count = lotCounts.categories[cat] || 0;
              const selected = filters.categories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleArrayItem("categories", cat)}
                  disabled={count === 0 && !selected}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selected
                      ? "bg-primary text-primary-foreground"
                      : count === 0
                      ? "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                      : "bg-muted text-foreground hover:bg-accent"
                  }`}
                >
                  {cat}
                  <span className={`text-[10px] ${selected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </FilterDropdown>

      {/* Brands */}
      <FilterDropdown
        label={t("filters.brands")}
        icon={<Percent className="h-3.5 w-3.5" />}
        active={filters.brandsInclude.length > 0 || filters.brandsExclude.length > 0}
      >
        <div className="space-y-3">
          <input
            type="text"
            placeholder={t("filters.searchBrand")}
            className="w-full h-8 px-3 text-xs rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
            value={brandSearch}
            onChange={(e) => setBrandSearch(e.target.value)}
          />

          {filters.brandsInclude.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("filters.included")}</span>
              <div className="flex flex-wrap gap-1">
                {filters.brandsInclude.map((b) => (
                  <span key={b} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-md font-medium">
                    {b}
                    <button onClick={() => toggleArrayItem("brandsInclude", b)}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {filters.brandsExclude.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("filters.excluded")}</span>
              <div className="flex flex-wrap gap-1">
                {filters.brandsExclude.map((b) => (
                  <span key={b} className="flex items-center gap-1 px-2 py-1 bg-destructive/10 text-destructive text-xs rounded-md font-medium">
                    {b}
                    <button onClick={() => toggleArrayItem("brandsExclude", b)}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {filteredBrands.map((brand) => {
              const count = lotCounts.brands[brand] || 0;
              const isIncluded = filters.brandsInclude.includes(brand);
              const isExcluded = filters.brandsExclude.includes(brand);
              return (
                <div key={brand} className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-muted/50 group">
                  <span className={`text-xs ${isExcluded ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {brand} <span className="text-muted-foreground">({count})</span>
                  </span>
                  <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        if (isExcluded) toggleArrayItem("brandsExclude", brand);
                        toggleArrayItem("brandsInclude", brand);
                      }}
                      className={`p-1 rounded ${isIncluded ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                      title={t("filters.include")}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (isIncluded) toggleArrayItem("brandsInclude", brand);
                        toggleArrayItem("brandsExclude", brand);
                      }}
                      className={`p-1 rounded ${isExcluded ? "bg-destructive text-destructive-foreground" : "hover:bg-accent"}`}
                      title={t("filters.exclude")}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </FilterDropdown>
    </div>
  );
};

export default FilterPanel;
