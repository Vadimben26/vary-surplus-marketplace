import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Mail } from "lucide-react";
import varyLogo from "@/assets/vary-logo.png";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const ResetPassword = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error(t("login.fillAll"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/connexion`,
    });
    setLoading(false);
    if (error) {
      toast.error(t("login.resetError"));
    } else {
      setSent(true);
      toast.success(t("login.resetSent"));
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <Link to="/">
          <img src={varyLogo} alt="Vary" className="h-10 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link to="/connexion" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4 inline mr-1" />
            {t("login.backToLogin")}
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <img src={varyLogo} alt="Vary" className="h-14 w-auto mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold text-foreground mb-2">{t("login.resetTitle")}</h1>
            <p className="text-muted-foreground text-sm">{t("login.resetSubtitle")}</p>
          </div>

          {sent ? (
            <div className="bg-card rounded-2xl border border-border p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <p className="text-foreground font-medium">{t("login.resetSent")}</p>
              <Link to="/connexion" className="inline-block mt-4 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-dark transition-colors text-sm">
                {t("login.backToLogin")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{t("login.email")}</label>
                <Input
                  type="email"
                  placeholder="jean@entreprise.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {loading ? t("login.resetSending") : t("login.resetSubmit")}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
