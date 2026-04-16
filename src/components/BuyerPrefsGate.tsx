import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ArrowRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BuyerPrefsGateProps {
  open: boolean;
  onClose?: () => void;
  /** Optional override for the headline (e.g. "Lot privé") */
  title?: string;
  /** Optional override for the explanation */
  description?: string;
  /** Where to send the user after they finish the questionnaire */
  returnTo?: string;
}

/**
 * Modal shown when a buyer attempts a gated action (checkout, contacting
 * a filtered seller, etc.) without having completed the buyer questionnaire.
 */
const BuyerPrefsGate = ({
  open,
  onClose,
  title,
  description,
  returnTo,
}: BuyerPrefsGateProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleStart = () => {
    const target = returnTo ?? window.location.pathname + window.location.search;
    navigate(`/inscription/acheteur?return=${encodeURIComponent(target)}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-card rounded-2xl border border-border shadow-card-hover max-w-md w-full p-8 text-center"
          >
            {onClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={t("common.close", "Fermer")}
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>

            <h2 className="font-heading text-xl font-bold text-foreground mb-3">
              {title ?? t("buyerGate.title", "Vérification acheteur requise")}
            </h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {description ??
                t(
                  "buyerGate.description",
                  "Pour finaliser votre achat ou contacter ce vendeur, complétez d'abord votre profil acheteur. Cela ne prend que quelques minutes."
                )}
            </p>

            <button
              onClick={handleStart}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
            >
              {t("buyerGate.cta", "Compléter mon profil")}
              <ArrowRight className="h-4 w-4" />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("buyerGate.later", "Plus tard")}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BuyerPrefsGate;
