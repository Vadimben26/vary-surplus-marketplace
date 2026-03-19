import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, BarChart3, MessageSquare, Rocket, ArrowLeft, Check } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const benefits = [
  {
    icon: BarChart3,
    title: "Insights détaillés",
    description: "Accédez aux statistiques complètes : vues, favoris, demandes, taux de conversion sur chacun de vos lots.",
  },
  {
    icon: MessageSquare,
    title: "Templates de messages",
    description: "Des modèles de réponses professionnels prêts à l'emploi pour répondre rapidement aux acheteurs.",
  },
  {
    icon: Rocket,
    title: "Boost de visibilité",
    description: "Vos lots sont mis en avant sur la marketplace acheteur pour maximiser vos ventes.",
  },
];

const included = [
  "Statistiques en temps réel sur tous vos lots",
  "Nombre de vues, favoris et demandes détaillés",
  "Templates de messages professionnels illimités",
  "Mise en avant prioritaire sur la marketplace",
  "Support prioritaire",
];

const SellerVIP = () => {
  const handleSubscribe = () => {
    toast.info("Le paiement par abonnement sera bientôt disponible !");
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-6 pb-24 max-w-3xl mx-auto">
        <Link to="/seller" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Retour au dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
            <Crown className="h-4 w-4" /> Vendeur VIP
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
            Boostez vos ventes avec le statut VIP
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Débloquez des outils puissants pour comprendre vos performances, répondre plus vite et vendre davantage.
          </p>
        </motion.div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-2xl border border-border p-5 text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <b.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-1">{b.title}</h3>
              <p className="text-xs text-muted-foreground">{b.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Pricing card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border-2 border-primary p-6 md:p-8 mb-6"
        >
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-heading text-4xl font-bold text-foreground">299 €</span>
            <span className="text-muted-foreground text-sm">/ mois</span>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Sans engagement, annulable à tout moment</p>

          <div className="space-y-3 mb-8">
            {included.map((item) => (
              <div key={item} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleSubscribe}
            className="w-full py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <Crown className="h-4 w-4" />
            S'abonner — 299 €/mois
          </button>
        </motion.div>
      </main>
      <BottomNav />
    </div>
  );
};

export default SellerVIP;
