import { ShieldCheck, BadgeCheck, Truck, Scale } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TrustBarProps {
  variant?: "compact" | "full";
  className?: string;
}

/**
 * Permanent trust bar surfaced across public pages so the value of
 * Vary's execution layer (escrow, verifications, transport, dispute
 * handling) is always visible — not buried in a marketing section.
 */
const TrustBar = ({ variant = "compact", className = "" }: TrustBarProps) => {
  const { t } = useTranslation();

  const items = [
    { icon: ShieldCheck, label: t("trust.escrow", "Paiement sous séquestre") },
    { icon: BadgeCheck, label: t("trust.verifiedSellers", "Vendeurs vérifiés") },
    { icon: Truck, label: t("trust.shipping", "Transport intégré") },
    { icon: Scale, label: t("trust.disputes", "Litiges gérés") },
  ];

  if (variant === "full") {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${className}`}>
        {items.map(({ icon: Icon, label }, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-3 bg-card border border-border rounded-xl">
            <Icon className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-xs font-medium text-foreground">{label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 px-4 py-2 bg-primary/5 border-b border-primary/10 text-[11px] md:text-xs ${className}`}>
      {items.map(({ icon: Icon, label }, i) => (
        <div key={i} className="flex items-center gap-1.5 text-foreground">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium">{label}</span>
        </div>
      ))}
    </div>
  );
};

export default TrustBar;
