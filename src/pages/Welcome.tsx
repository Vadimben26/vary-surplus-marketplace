import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ShoppingBag, Store, ArrowRight } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import varyLogo from "@/assets/vary-logo.png";

const Welcome = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 md:px-8 py-4 flex items-center justify-between border-b border-border">
        <Link to="/" className="flex-shrink-0">
          <img src={varyLogo} alt="Vary" className="h-9 w-auto" />
        </Link>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl w-full"
        >
          <div className="text-center mb-10">
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
              {t("welcome.title")}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              {t("welcome.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            <Link
              to="/bienvenue/acheteur"
              className="group bg-card border border-border rounded-2xl p-6 md:p-8 hover:border-primary hover:shadow-lg transition-all"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <ShoppingBag className="h-7 w-7 text-primary" />
              </div>
              <h2 className="font-heading text-xl font-bold text-foreground mb-2">
                {t("welcome.buyerTitle")}
              </h2>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {t("welcome.buyerDesc")}
              </p>
              <span className="inline-flex items-center gap-1 text-primary font-semibold text-sm">
                {t("welcome.continue")} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>

            <Link
              to="/inscription/vendeur"
              className="group bg-card border border-border rounded-2xl p-6 md:p-8 hover:border-primary hover:shadow-lg transition-all"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Store className="h-7 w-7 text-primary" />
              </div>
              <h2 className="font-heading text-xl font-bold text-foreground mb-2">
                {t("welcome.sellerTitle")}
              </h2>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {t("welcome.sellerDesc")}
              </p>
              <span className="inline-flex items-center gap-1 text-primary font-semibold text-sm">
                {t("welcome.fillForm")} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>

          <div className="text-center mt-8">
            <Link to="/connexion" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("welcome.alreadyAccount")}
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Welcome;
