import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { UserPlus, Eye, ArrowRight, ArrowLeft } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const BuyerWelcome = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 md:px-8 py-4 flex items-center justify-between border-b border-border">
        <Link to="/" className="font-heading text-2xl font-bold text-primary">VARY</Link>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl w-full"
        >
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-3 w-3" />
            {t("common.back")}
          </Link>

          <div className="text-center mb-10">
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
              {t("buyerWelcome.title")}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              {t("buyerWelcome.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            <Link
              to="/inscription/acheteur"
              className="group bg-card border-2 border-primary rounded-2xl p-6 md:p-8 hover:shadow-lg transition-all relative"
            >
              <div className="absolute -top-3 left-6 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                {t("buyerWelcome.recommended")}
              </div>
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <UserPlus className="h-7 w-7 text-primary" />
              </div>
              <h2 className="font-heading text-xl font-bold text-foreground mb-2">
                {t("buyerWelcome.createTitle")}
              </h2>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {t("buyerWelcome.createDesc")}
              </p>
              <span className="inline-flex items-center gap-1 text-primary font-semibold text-sm">
                {t("buyerWelcome.createCta")} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>

            <Link
              to="/marketplace"
              className="group bg-card border border-border rounded-2xl p-6 md:p-8 hover:border-primary hover:shadow-lg transition-all"
            >
              <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mb-4">
                <Eye className="h-7 w-7 text-muted-foreground" />
              </div>
              <h2 className="font-heading text-xl font-bold text-foreground mb-2">
                {t("buyerWelcome.guestTitle")}
              </h2>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {t("buyerWelcome.guestDesc")}
              </p>
              <span className="inline-flex items-center gap-1 text-foreground font-semibold text-sm">
                {t("buyerWelcome.guestCta")} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default BuyerWelcome;
