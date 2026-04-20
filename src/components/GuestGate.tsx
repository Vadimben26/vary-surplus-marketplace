import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X, Lock, ArrowRight } from "lucide-react";
import varyLogo from "@/assets/vary-logo.png";

const GuestGate = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-8">
        <button
          type="button"
          onClick={() => navigate("/marketplace")}
          aria-label={t("guestGate.close")}
          className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex justify-center mb-6">
          <img src={varyLogo} alt="Vary" className="h-8" />
        </div>

        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
        </div>

        <h2 className="font-heading text-2xl font-bold text-foreground text-center mb-3">
          {t("guestGate.title")}
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-7">
          {t("guestGate.description")}
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate("/inscription/acheteur")}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-foreground text-background font-semibold rounded-md hover:opacity-90 transition-opacity"
          >
            {t("guestGate.createAccount")}
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/connexion")}
            className="w-full px-6 py-3 bg-muted text-foreground font-medium rounded-md hover:bg-muted/70 transition-colors text-sm"
          >
            {t("guestGate.alreadyAccount")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/marketplace")}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            {t("guestGate.continueBrowsing")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestGate;
