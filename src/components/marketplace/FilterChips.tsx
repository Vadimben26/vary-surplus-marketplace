import { X, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { B2BFilters, DEFAULT_FILTERS, PRICE_MAX, PRICE_PER_ITEM_MAX, UNITS_MAX, PALLETS_MAX } from "./FilterPanel";

interface FilterChipsProps {
  filters: B2BFilters;
  onChange: (filters: B2BFilters) => void;
  resultCount: number;
}

const FilterChips = ({ filters, onChange, resultCount }: FilterChipsProps) => {
  const { t } = useTranslation();

  const chips: { label: string; onRemove: () => void }[] = [];

  filters.countries.forEach((c) =>
    chips.push({ label: `📍 ${c}`, onRemove: () => onChange({ ...filters, countries: filters.countries.filter((x) => x !== c) }) })
  );

  if (filters.priceRange[0] > 0 || filters.priceRange[1] < PRICE_MAX) {
    chips.push({
      label: `💰 ${filters.priceRange[0].toLocaleString("fr-FR")}–${filters.priceRange[1].toLocaleString("fr-FR")} €`,
      onRemove: () => onChange({ ...filters, priceRange: [0, PRICE_MAX] }),
    });
  }

  if (filters.pricePerItemRange[0] > 0 || filters.pricePerItemRange[1] < PRICE_PER_ITEM_MAX) {
    chips.push({
      label: `💶 ${filters.pricePerItemRange[0]}–${filters.pricePerItemRange[1]} €/pc`,
      onRemove: () => onChange({ ...filters, pricePerItemRange: [0, PRICE_PER_ITEM_MAX] }),
    });
  }

  if (filters.unitsRange[0] > 0 || filters.unitsRange[1] < UNITS_MAX) {
    chips.push({
      label: `📦 ${filters.unitsRange[0].toLocaleString("fr-FR")}–${filters.unitsRange[1].toLocaleString("fr-FR")} pcs`,
      onRemove: () => onChange({ ...filters, unitsRange: [0, UNITS_MAX] }),
    });
  }

  if (filters.palletsRange[0] > 0 || filters.palletsRange[1] < PALLETS_MAX) {
    chips.push({
      label: `🟫 ${filters.palletsRange[0]}–${filters.palletsRange[1]} ${t("filters.palletsUnit", "pal.")}`,
      onRemove: () => onChange({ ...filters, palletsRange: [0, PALLETS_MAX] }),
    });
  }

  filters.categories.forEach((c) =>
    chips.push({
      label: `${t(`filters.mode_${filters.categoryMode}`)} ${c}`,
      onRemove: () => onChange({ ...filters, categories: filters.categories.filter((x) => x !== c) }),
    })
  );

  filters.brandsInclude.forEach((b) =>
    chips.push({
      label: `✅ ${b}`,
      onRemove: () => onChange({ ...filters, brandsInclude: filters.brandsInclude.filter((x) => x !== b) }),
    })
  );

  filters.brandsExclude.forEach((b) =>
    chips.push({
      label: `🚫 ${b}`,
      onRemove: () => onChange({ ...filters, brandsExclude: filters.brandsExclude.filter((x) => x !== b) }),
    })
  );

  if (filters.search) {
    chips.push({
      label: `🔍 "${filters.search}"`,
      onRemove: () => onChange({ ...filters, search: "" }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground">
        {resultCount} {t("filters.results")}
      </span>
      {chips.map((chip, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
        >
          {chip.label}
          <button onClick={chip.onRemove} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        onClick={() => onChange(DEFAULT_FILTERS)}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-full transition-colors"
      >
        <RotateCcw className="h-3 w-3" />
        {t("filters.clearAll")}
      </button>
    </div>
  );
};

export default FilterChips;
