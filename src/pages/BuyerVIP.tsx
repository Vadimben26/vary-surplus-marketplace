import { Link } from "react-router-dom";
import { Crown, Eye, Clock, Star, CheckCircle2, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const BuyerVIP = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-8 pb-24 max-w-3xl mx-auto">
        <Link to="/marketplace" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> {t("buyerVIP.backToMarketplace")}
        </Link>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
            <Crown className="h-4 w-4" /> {t("buyerVIP.badge")}
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
            {t("buyerVIP.title")}
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">{t("buyerVIP.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {[
            { icon: Clock, titleKey: "buyerVIP.earlyAccess", descKey: "buyerVIP.earlyAccessDesc" },
            { icon: Star, titleKey: "buyerVIP.prioritySupport", descKey: "buyerVIP.prioritySupportDesc" },
          ].map((feat) => (
            <div key={feat.titleKey} className="bg-card border border-border rounded-2xl p-5">
              <feat.icon className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-heading font-bold text-foreground mb-1">{t(feat.titleKey)}</h3>
              <p className="text-sm text-muted-foreground">{t(feat.descKey)}</p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <p className="text-5xl font-heading font-bold text-foreground mb-1">299 €<span className="text-lg font-normal text-muted-foreground"> {t("buyerVIP.perMonth")}</span></p>
          <p className="text-sm text-muted-foreground mb-6">{t("buyerVIP.noCommitment")}</p>
          <ul className="text-left max-w-md mx-auto space-y-3 mb-8">
            {["included1", "included2"].map((key) => (
              <li key={key} className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                {t(`buyerVIP.${key}`)}
              </li>
            ))}
          </ul>
          <button
            onClick={() => toast.info(t("buyerVIP.comingSoon"))}
            className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            {t("buyerVIP.subscribe")}
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default BuyerVIP;
