import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Store, CheckCircle, Shield, Package, Truck } from "lucide-react";
import varyLogo from "@/assets/vary-logo.png";

const steps = [
  { icon: CheckCircle, label: "ÉTAPE 1", title: "Inscrivez-vous", desc: "Créez votre compte vendeur ou acheteur en quelques minutes." },
  { icon: Shield, label: "ÉTAPE 2", title: "Validation VARY", desc: "Notre équipe vérifie vos documents sous 24h." },
  { icon: Package, label: "ÉTAPE 3", title: "Publiez ou achetez", desc: "Accédez à la marketplace et commencez à trader." },
  { icon: Truck, label: "ÉTAPE 4", title: "Expédiez ou recevez", desc: "Organisez la livraison et sécurisez vos transactions." },
];

const Registration = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <Link to="/">
          <img src={varyLogo} alt="Vary" className="h-10 w-auto" />
        </Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Retour à l'accueil
        </Link>
      </header>

      <div className="flex-1 px-4 py-12">
        <div className="w-full max-w-2xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <img src={varyLogo} alt="Vary" className="h-16 w-auto mx-auto mb-6" />
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
              Rejoignez Vary
            </h1>
            <p className="text-muted-foreground mb-10 max-w-md mx-auto">
              La marketplace B2B européenne pour acheter et vendre des surplus neufs en lots
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <Link
                to="/inscription/acheteur"
                className="block bg-card rounded-2xl border border-border p-8 shadow-card hover:shadow-card-hover hover:border-primary/40 transition-all group"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/20 transition-colors">
                  <ShoppingBag className="h-7 w-7 text-primary" />
                </div>
                <h2 className="font-heading text-xl font-bold text-foreground mb-2">Je suis Acheteur</h2>
                <p className="text-sm text-muted-foreground">
                  Accédez à des lots de produits neufs à prix grossiste. Filtrez, commandez, recevez.
                </p>
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <Link
                to="/inscription/vendeur"
                className="block bg-card rounded-2xl border border-border p-8 shadow-card hover:shadow-card-hover hover:border-primary/40 transition-all group"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/20 transition-colors">
                  <Store className="h-7 w-7 text-primary" />
                </div>
                <h2 className="font-heading text-xl font-bold text-foreground mb-2">Je suis Vendeur</h2>
                <p className="text-sm text-muted-foreground">
                  Écoulez vos surplus rapidement auprès d'acheteurs vérifiés. Paiement sécurisé, transport intégré.
                </p>
              </Link>
            </motion.div>
          </div>

          <p className="text-xs text-muted-foreground mt-8">
            Vous avez déjà un compte ?{" "}
            <Link to="/connexion" className="text-primary hover:underline font-medium">Se connecter</Link>
          </p>
        </div>

        {/* Comment ça marche */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-3xl mx-auto mt-20"
        >
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground text-center mb-12">
            Comment ça marche
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-3 shadow-md">
                  <step.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <span className="text-xs font-semibold text-primary tracking-wide mb-1">{step.label}</span>
                <h3 className="font-heading font-bold text-foreground text-sm mb-1">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Registration;
