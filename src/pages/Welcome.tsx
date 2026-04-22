import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ShoppingBag, Store, ArrowRight, ShieldCheck, BadgeCheck, Truck, Package, TrendingDown, Users } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import TrustBar from "@/components/TrustBar";
import varyLogo from "@/assets/vary-logo.png";

/**
 * Welcome — split-screen 2 portes.
 * Chaque audience (acheteur / vendeur) a son univers complet :
 * promesse, 3 preuves clés, CTA dédié. Aucun mélange visuel.
 */
const Welcome = () => {
  const { t } = useTranslation();

  const buyerProofs = [
    { icon: TrendingDown, label: t("welcome.buyerProof1", "−40 à −70 % vs prix retail") },
    { icon: BadgeCheck, label: t("welcome.buyerProof2", "Vendeurs et marques vérifiés") },
    { icon: ShieldCheck, label: t("welcome.buyerProof3", "Paiement en escrow") },
  ];

  const sellerProofs = [
    { icon: Users, label: t("welcome.sellerProof1", "Réseau d'acheteurs pros qualifiés") },
    { icon: Package, label: t("welcome.sellerProof2", "Lots écoulés en quelques jours") },
    { icon: Truck, label: t("welcome.sellerProof3", "Transport et litiges pris en charge") },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TrustBar />
      <header className="px-4 md:px-8 py-4 flex items-center justify-between border-b border-border">
        <Link to="/" className="flex-shrink-0">
          <img src={varyLogo} alt="Vary" className="h-9 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link to="/connexion" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("welcome.alreadyAccount")}
          </Link>
        </div>
      </header>

      {/* Tagline */}
      <div className="px-4 md:px-8 pt-8 pb-4 text-center max-w-3xl mx-auto">
        <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-primary mb-2">
          {t("welcome.tagline")}
        </span>
        <h1 className="font-heading text-2xl md:text-4xl font-bold text-foreground leading-tight">
          {t("welcome.splitTitle", "Quel est votre objectif aujourd'hui ?")}
        </h1>
      </div>

      {/* Split full-width */}
      <main className="flex-1 grid md:grid-cols-2 gap-px bg-border">
        {/* BUYER */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-background hover:bg-primary/[0.02] transition-colors flex flex-col justify-center px-6 py-10 md:px-12 md:py-16"
        >
          <div className="max-w-md mx-auto w-full">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-5">
              <ShoppingBag className="h-7 w-7 text-primary" />
            </div>
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-primary mb-2">
              {t("welcome.buyerKicker", "Acheteurs")}
            </span>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3 leading-tight">
              {t("welcome.buyerHeadline", "J'achète des lots vérifiés")}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground mb-6 leading-relaxed">
              {t("welcome.buyerPitch", "Stocks neufs en lots, marques connues, prix grossiste. Filtrage par catégorie, pays et budget.")}
            </p>

            <ul className="space-y-2.5 mb-8">
              {buyerProofs.map(({ icon: Icon, label }, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-foreground">
                  <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>

            <Link
              to="/bienvenue/acheteur"
              className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
            >
              {t("welcome.buyerCta")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.section>

        {/* SELLER */}
        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-background hover:bg-primary/[0.02] transition-colors flex flex-col justify-center px-6 py-10 md:px-12 md:py-16"
        >
          <div className="max-w-md mx-auto w-full">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-5">
              <Store className="h-7 w-7 text-primary" />
            </div>
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-primary mb-2">
              {t("welcome.sellerKicker", "Vendeurs")}
            </span>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3 leading-tight">
              {t("welcome.sellerHeadline", "Je vends mes surplus")}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground mb-6 leading-relaxed">
              {t("welcome.sellerPitch", "Écoulez vos surplus neufs en lots auprès d'acheteurs vérifiés. Vous gardez le contrôle de votre visibilité.")}
            </p>

            <ul className="space-y-2.5 mb-8">
              {sellerProofs.map(({ icon: Icon, label }, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-foreground">
                  <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>

            <Link
              to="/inscription/vendeur"
              className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
            >
              {t("welcome.sellerCta")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default Welcome;
