import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Globe,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBuyerPrefs } from "@/hooks/useBuyerPrefs";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const EU_COUNTRY_CODES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "EL", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
];

interface KybUpgradeCardProps {
  /** When set, expand the card immediately (e.g. via ?verify=1 query). */
  defaultOpen?: boolean;
}

const KybUpgradeCard = ({ defaultOpen = false }: KybUpgradeCardProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isVerifiedPro, kybStatus, kybRejectionReason } = useBuyerPrefs();

  const [open, setOpen] = useState(defaultOpen);
  const [vatCountry, setVatCountry] = useState<string>("FR");
  const [vatNumber, setVatNumber] = useState<string>("");
  const [storefrontUrl, setStorefrontUrl] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Already verified → success card, no form
  if (isVerifiedPro) {
    return (
      <div className="bg-card rounded-2xl border border-primary/30 p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BadgeCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-foreground">
              {t("kyb.verifiedTitle", "Acheteur professionnel vérifié")}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t(
                "kyb.verifiedDescription",
                "Vous avez accès aux lots privés réservés aux acheteurs vérifiés (sous réserve des critères de matching de chaque vendeur)."
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pending state — show a waiting indicator
  if (kybStatus === "pending") {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-start gap-3">
          <Loader2 className="h-5 w-5 text-primary animate-spin mt-0.5" />
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-foreground">
              {t("kyb.pendingTitle", "Analyse en cours…")}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t(
                "kyb.pendingDescription",
                "Notre IA analyse vos documents. Le résultat arrive en quelques secondes."
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = Array.from(incoming).slice(0, 4);
    setFiles(next);
  };

  const removeFile = (i: number) =>
    setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error(t("common.loginRequired", "Connexion requise"));
      return;
    }
    // Need at least ONE element of proof (doc, VAT, or storefront)
    if (files.length === 0 && !vatNumber.trim() && !storefrontUrl.trim()) {
      toast.error(
        t(
          "kyb.atLeastOne",
          "Ajoutez au moins un élément : numéro de TVA, document ou lien vitrine."
        )
      );
      return;
    }

    setSubmitting(true);
    try {
      // 1) Upload documents to private bucket under userId/<timestamp>-<name>
      const uploadedPaths: string[] = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^\w.\-]/g, "_");
        const path = `${user.id}/${Date.now()}-${safeName}`;
        const { error } = await supabase.storage
          .from("buyer-kyb-documents")
          .upload(path, file, { upsert: true });
        if (error) throw error;
        uploadedPaths.push(path);
      }

      // 2) Call the edge function
      const { data, error } = await supabase.functions.invoke(
        "submit-kyb-verification",
        {
          body: {
            vat_number: vatNumber.trim() || null,
            vat_country_code: vatNumber.trim() ? vatCountry : null,
            storefront_url: storefrontUrl.trim() || null,
            document_paths: uploadedPaths,
          },
        }
      );

      if (error) {
        throw new Error(error.message || "Submission failed");
      }
      if (data?.error) {
        throw new Error(data.message || data.error);
      }

      if (data?.status === "verified") {
        toast.success(
          t("kyb.successToast", "Vous êtes désormais acheteur vérifié !")
        );
        setOpen(false);
        setFiles([]);
      } else {
        toast.error(
          data?.rejection_reason ||
            t(
              "kyb.rejectedToast",
              "Vérification non concluante. Vous pouvez réessayer avec d'autres documents."
            )
        );
      }
      // Refresh access level + status
      queryClient.invalidateQueries({ queryKey: ["buyer-prefs-check", user.id] });
      queryClient.invalidateQueries({ queryKey: ["buyer-preferences", user.id] });
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error
          ? e.message
          : t("kyb.error", "Une erreur est survenue.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Banner / collapsed header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 p-6 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <BadgeCheck className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-heading font-semibold text-foreground">
            {t(
              "kyb.bannerTitle",
              "Débloquez les lots réservés — vérifiez votre activité"
            )}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              "kyb.bannerDescription",
              "Optionnel et automatique : envoyez un numéro de TVA UE, un Kbis ou un lien vitrine et accédez aux lots privés en moins de 10 secondes."
            )}
          </p>
          {kybStatus === "rejected" && kybRejectionReason && (
            <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>{kybRejectionReason}</span>
            </div>
          )}
        </div>
        <span className="text-xs font-medium text-primary mt-1">
          {open ? t("common.close", "Fermer") : t("kyb.openCta", "Vérifier")}
        </span>
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border-t border-border p-6 space-y-5"
        >
          {/* VAT number */}
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Hash className="h-3 w-3" />
              {t("kyb.vatLabel", "Numéro de TVA UE (optionnel)")}
            </label>
            <div className="flex gap-2">
              <select
                value={vatCountry}
                onChange={(e) => setVatCountry(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus:ring-2 focus:ring-ring outline-none"
              >
                {EU_COUNTRY_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value.toUpperCase())}
                placeholder={t("kyb.vatPlaceholder", "FR12345678901")}
                className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring outline-none"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {t(
                "kyb.vatHelp",
                "Validé en direct via la base européenne VIES. Aucune saisie manuelle après cela."
              )}
            </p>
          </div>

          {/* Storefront URL */}
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Globe className="h-3 w-3" />
              {t("kyb.storefrontLabel", "Lien vitrine (optionnel)")}
            </label>
            <input
              type="url"
              value={storefrontUrl}
              onChange={(e) => setStorefrontUrl(e.target.value)}
              placeholder={t(
                "kyb.storefrontPlaceholder",
                "Site web, Instagram, profil Vinted ou TikTok Shop…"
              )}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring outline-none"
            />
          </div>

          {/* File uploads */}
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <FileText className="h-3 w-3" />
              {t(
                "kyb.documentsLabel",
                "Documents (Kbis, registre de commerce, photo de boutique — optionnel)"
              )}
            </label>
            <label className="block cursor-pointer border-2 border-dashed border-border rounded-xl p-4 hover:border-primary/40 transition-colors">
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                <span>
                  {t("kyb.uploadCta", "Cliquez pour ajouter (max 4 fichiers, 6 Mo / fichier)")}
                </span>
              </div>
            </label>
            {files.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {files.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between text-xs bg-muted/40 rounded-lg px-3 py-2"
                  >
                    <span className="truncate text-foreground">{f.name}</span>
                    <button
                      onClick={() => removeFile(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={t("common.delete", "Supprimer")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Trust note */}
          <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-3">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
            <span>
              {t(
                "kyb.trustNote",
                "Analyse 100% automatique en moins de 10 secondes. Vos documents restent privés et chiffrés."
              )}
            </span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BadgeCheck className="h-4 w-4" />
            )}
            {submitting
              ? t("kyb.submitting", "Analyse en cours…")
              : t("kyb.submit", "Soumettre pour vérification")}
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default KybUpgradeCard;
