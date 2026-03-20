import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, BarChart3, MessageSquare, Rocket, ArrowLeft, Check, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SellerVIP = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();

  const benefits = [
    { icon: BarChart3, title: t("sellerVIP.detailedInsights"), description: t("sellerVIP.detailedInsightsDesc") },
    { icon: MessageSquare, title: t("sellerVIP.messageTemplates"), description: t("sellerVIP.messageTemplatesDesc") },
    { icon: Rocket, title: t("sellerVIP.visibilityBoost"), description: t("sellerVIP.visibilityBoostDesc") },
  ];

  const included = [
    t("sellerVIP.included1"),
    t("sellerVIP.included2"),
    t("sellerVIP.included3"),
    t("sellerVIP.included4"),
    t("sellerVIP.included5"),
  ];

  const handleSubscribe = async () => {
    if (!user) { toast.error(t("checkout.loginRequired")); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-vip-subscription", {
        body: { plan: "seller_vip" },
      });
      if (error) throw error;
      if (data?.error?.includes("Stripe not configured")) {
        toast.info(t("checkout.stripeNotReady"));
        return;
      }
      if (data?.url) window.location.href = data.url;
    } catch { toast.error(t("checkout.error")); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-6 pb-24 max-w-3xl mx-auto">
        <Link to="/seller" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> {t("sellerVIP.backToDashboard")}
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
            <Crown className="h-4 w-4" /> {t("sellerVIP.badge")}
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">{t("sellerVIP.title")}</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">{t("sellerVIP.subtitle")}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {benefits.map((b, i) => (
            <motion.div key={b.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-card rounded-2xl border border-border p-5 text-center">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <b.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-1">{b.title}</h3>
              <p className="text-xs text-muted-foreground">{b.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl border-2 border-primary p-6 md:p-8 mb-6">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-heading text-4xl font-bold text-foreground">99 €</span>
            <span className="text-muted-foreground text-sm">{t("sellerVIP.perMonth")}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-6">{t("sellerVIP.noCommitment")}</p>

          <div className="space-y-3 mb-8">
            {included.map((item) => (
              <div key={item} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>

          <button onClick={handleSubscribe} disabled={loading} className="w-full py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
            {t("sellerVIP.subscribe")}
          </button>
        </motion.div>
      </main>
      <BottomNav />
    </div>
  );
};

export default SellerVIP;
