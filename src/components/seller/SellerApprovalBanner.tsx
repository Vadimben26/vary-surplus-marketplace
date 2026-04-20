import { motion } from "framer-motion";
import { ShieldCheck, Clock, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSellerApproval } from "@/hooks/useSellerApproval";

/**
 * Banner shown at the top of the seller dashboard reflecting the manual
 * approval state imposed by the Vary team.
 *
 * Buyers are auto-approved on questionnaire completion; sellers must be
 * vetted manually before they can publish active lots. Until approved,
 * lots can still be saved as drafts but won't appear on the marketplace.
 */
const SellerApprovalBanner = () => {
  const { t } = useTranslation();
  const { status, isApproved, isPending, isRejected, rejectionReason, loading } = useSellerApproval();

  if (loading || isApproved) return null;

  const config = isRejected
    ? {
        icon: AlertTriangle,
        iconBg: "bg-destructive/10",
        iconColor: "text-destructive",
        border: "border-destructive/30",
        title: t("sellerApproval.rejectedTitle", "Demande non validée"),
        body:
          rejectionReason ??
          t(
            "sellerApproval.rejectedBody",
            "L'équipe Vary n'a pas pu valider votre profil vendeur. Contactez le support pour plus d'informations."
          ),
      }
    : {
        icon: Clock,
        iconBg: "bg-amber-500/10",
        iconColor: "text-amber-600 dark:text-amber-400",
        border: "border-amber-500/30",
        title: t("sellerApproval.pendingTitle", "Profil vendeur en cours de validation"),
        body: t(
          "sellerApproval.pendingBody",
          "L'équipe Vary vérifie actuellement vos documents et votre activité. Vous pouvez préparer vos lots en brouillon — ils seront publiés automatiquement dès votre approbation (sous 48h)."
        ),
      };

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-6 rounded-2xl border ${config.border} bg-card p-5 flex items-start gap-4`}
    >
      <div className={`flex-shrink-0 w-10 h-10 ${config.iconBg} rounded-full flex items-center justify-center`}>
        <Icon className={`h-5 w-5 ${config.iconColor}`} />
      </div>
      <div className="flex-1">
        <h3 className="font-heading font-bold text-foreground text-sm mb-1 flex items-center gap-2">
          {config.title}
          <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{config.body}</p>
      </div>
    </motion.div>
  );
};

export default SellerApprovalBanner;
