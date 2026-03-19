import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import varyLogo from "@/assets/vary-logo.png";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials"
        ? "Email ou mot de passe incorrect"
        : error.message);
    } else {
      toast.success("Connexion réussie !");
      navigate("/marketplace");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <Link to="/">
          <img src={varyLogo} alt="Vary" className="h-10 w-auto" />
        </Link>
        <Link to="/inscription" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Retour
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <img src={varyLogo} alt="Vary" className="h-14 w-auto mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Connexion</h1>
            <p className="text-muted-foreground text-sm">Accédez à votre compte Vary</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Email</label>
              <Input
                type="email"
                placeholder="jean@entreprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Mot de passe</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Pas encore de compte ?{" "}
            <Link to="/inscription" className="text-primary hover:underline font-medium">S'inscrire</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
