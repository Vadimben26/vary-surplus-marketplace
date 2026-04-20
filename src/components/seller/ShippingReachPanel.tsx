import { useMemo, useState } from "react";
import { Check, X, ChevronDown, Info, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useShippingMatrix } from "@/hooks/useShippingMatrix";
import { computeCountryReach, fmtEur, FLOOR_PRICE } from "@/lib/shipping";

interface Props {
  originCountry: string;
  lotPrice: number;
  pallets: number;
}

/**
 * Live preview of the countries where the lot is accessible based on
 * the price-vs-shipping rule (price ≥ 11 × shipping cost).
 */
const ShippingReachPanel = ({ originCountry, lotPrice, pallets }: Props) => {
  const { t } = useTranslation();
  const { data: matrix, isLoading } = useShippingMatrix();
  const [expanded, setExpanded] = useState(false);

  const reach = useMemo(() => {
    if (!matrix || !originCountry) return [];
    return computeCountryReach(originCountry, lotPrice, pallets, matrix);
  }, [matrix, originCountry, lotPrice, pallets]);

  const accessible = reach.filter((r) => r.accessible);
  const blocked = reach.filter((r) => !r.accessible);

  if (!originCountry) {
    return (
      <div className="bg-muted/30 rounded-xl border border-border p-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          <span>{t("shipping.noOrigin", "Renseignez votre pays d'expédition dans vos préférences vendeur pour voir la portée de votre lot.")}</span>
        </div>
      </div>
    );
  }

  if (isLoading || !matrix) {
    return (
      <div className="bg-muted/30 rounded-xl border border-border p-3 text-xs text-muted-foreground animate-pulse">
        {t("shipping.loading", "Calcul de la portée…")}
      </div>
    );
  }

  const total = reach.length;
  const ratio = total > 0 ? Math.round((accessible.length / total) * 100) : 0;
  const ratioColor =
    ratio >= 75 ? "text-green-600" : ratio >= 40 ? "text-amber-600" : "text-destructive";

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" />
          <div className="text-left">
            <div className="text-xs font-semibold text-foreground">
              {t("shipping.reachTitle", "Portée du lot")}
            </div>
            <div className={`text-[10px] font-bold ${ratioColor}`}>
              {accessible.length} / {total} {t("shipping.countriesAccessible", "pays accessibles")} ({ratio}%)
            </div>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t border-border p-3 space-y-3 max-h-[360px] overflow-y-auto">
          <p className="text-[10px] text-muted-foreground italic">
            {t(
              "shipping.rule",
              "Règle : prix du lot ≥ 11× coût réel de livraison (plancher {{floor}}). Les pays trop éloignés masquent automatiquement votre lot aux acheteurs concernés.",
              { floor: fmtEur(FLOOR_PRICE) }
            )}
          </p>

          {accessible.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-green-700 uppercase tracking-wide">
                ✓ {t("shipping.accessible", "Accessibles")} ({accessible.length})
              </div>
              <div className="grid grid-cols-2 gap-1">
                {accessible.map((r) => (
                  <div key={r.country} className="flex items-center gap-1.5 text-[11px] bg-green-50 dark:bg-green-950/20 px-2 py-1 rounded">
                    <Check className="h-3 w-3 text-green-600 shrink-0" />
                    <span className="font-medium text-foreground truncate">{r.country}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {blocked.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-destructive uppercase tracking-wide">
                ✗ {t("shipping.blocked", "Bloqués (prix trop bas)")} ({blocked.length})
              </div>
              <div className="space-y-1">
                {blocked.map((r) => (
                  <div key={r.country} className="flex items-center justify-between text-[11px] bg-destructive/5 px-2 py-1 rounded">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <X className="h-3 w-3 text-destructive shrink-0" />
                      <span className="font-medium text-foreground truncate">{r.country}</span>
                      <span className="text-muted-foreground hidden sm:inline">({r.category})</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {t("shipping.minPrice", "min")} {fmtEur(r.minPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShippingReachPanel;
