import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Store } from "lucide-react";
import varyLogo from "@/assets/vary-logo.png";

const Registration = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <Link to="/">
          <img src={varyLogo} alt="Vary" className="h-10 w-auto" />
        </Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Retour à l'accueil
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <img src={varyLogo} alt="Vary" className="h-16 w-auto mx-auto mb-6" />
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
              Rejoignez Vary
            </h1>
            <p className="text-muted-foreground mb-10 max-w-md mx-auto">
              La marketplace B2B européenne pour acheter et vendre des surplus neufs en lots
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Link
                to="/inscription/acheteur"
                className="block bg-card rounded-2xl border border-border p-8 shadow-card hover:shadow-card-hover hover:border-primary/40 transition-all group"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/20 transition-colors">
                  <ShoppingBag className="h-7 w-7 text-primary" />
                </div>
                <h2 className="font-heading text-xl font-bold text-foreground mb-2">
                  Je suis Acheteur
                </h2>
                <p className="text-sm text-muted-foreground">
                  Accédez à des lots de produits neufs à prix grossiste. Filtrez, commandez, recevez.
                </p>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Link
                to="/inscription/vendeur"
                className="block bg-card rounded-2xl border border-border p-8 shadow-card hover:shadow-card-hover hover:border-primary/40 transition-all group"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/20 transition-colors">
                  <Store className="h-7 w-7 text-primary" />
                </div>
                <h2 className="font-heading text-xl font-bold text-foreground mb-2">
                  Je suis Vendeur
                </h2>
                <p className="text-sm text-muted-foreground">
                  Écoulez vos surplus rapidement auprès d'acheteurs vérifiés. Paiement sécurisé, transport intégré.
                </p>
              </Link>
            </motion.div>
          </div>

          <p className="text-xs text-muted-foreground mt-8">
            Vous avez déjà un compte ?{" "}
            <Link to="/connexion" className="text-primary hover:underline font-medium">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Registration;
