import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, X, Loader2, ShieldAlert, CheckCircle2, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const MAX_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

/**
 * Seller appeal panel — shown only when the seller is currently suspended
 * (red-zone dispute). Seller has 7 days from suspension to submit an appeal;
 * Vary commits to a 48h decision.
 */
export const SellerAppealPanel = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Look for the most recent unresolved red-zone dispute against this seller.
  const { data: openDispute } = useQuery({
    queryKey: ["seller-red-dispute", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await (supabase as any)
        .from("disputes")
        .select("id, order_id, opened_at, defect_percentage, refund_amount")
        .eq("seller_id", profile.id)
        .eq("zone", "red")
        .neq("status", "resolved")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: existingAppeal } = useQuery({
    queryKey: ["seller-appeal", openDispute?.id],
    queryFn: async () => {
      if (!openDispute?.id) return null;
      const { data } = await (supabase as any)
        .from("seller_appeals")
        .select("*")
        .eq("dispute_id", openDispute.id)
        .maybeSingle();
      return data;
    },
    enabled: !!openDispute?.id,
  });

  const isSuspended = profile?.suspended_until && new Date(profile.suspended_until) > new Date();
  if (!isSuspended || !openDispute) return null;

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const added: File[] = [];
    Array.from(newFiles).forEach((f) => {
      if (files.length + added.length >= MAX_FILES) return;
      if (f.size > MAX_SIZE) { toast.error(t("appeal.fileTooLarge", { name: f.name })); return; }
      if (!(f.type.startsWith("image/") || f.type === "application/pdf")) {
        toast.error(t("appeal.fileUnsupported", { name: f.name })); return;
      }
      added.push(f);
    });
    setFiles([...files, ...added]);
  };

  const submit = async () => {
    if (message.trim().length < 50 || submitting || !profile?.id) return;
    setSubmitting(true);
    try {
      const appealId = crypto.randomUUID();
      const urls: string[] = [];
      for (const file of files) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${profile.id}/${appealId}/${Date.now()}-${safe}`;
        const { error } = await supabase.storage.from("dispute-evidence").upload(path, file, { upsert: false });
        if (error) throw error;
        urls.push(path);
      }
      const { error: insErr } = await (supabase as any).from("seller_appeals").insert({
        id: appealId,
        seller_id: profile.id,
        dispute_id: openDispute.id,
        message: message.trim(),
        evidence_urls: urls,
      });
      if (insErr) throw insErr;
      toast.success(t("appeal.submittedToast", "Appel envoyé. Vary répondra sous 48h."));
      queryClient.invalidateQueries({ queryKey: ["seller-appeal"] });
    } catch (e: any) {
      toast.error(e?.message || t("appeal.submitError", "Erreur lors de l'envoi de l'appel"));
    } finally {
      setSubmitting(false);
    }
  };

  // Already submitted appeal — show status.
  if (existingAppeal) {
    return (
      <div className="mb-4 p-4 rounded-2xl border border-amber-300 bg-amber-50/40">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-amber-700" />
          <h3 className="font-heading font-semibold text-amber-800 text-sm">
            {t("appeal.pendingTitle", "Appel en cours d'examen")}
          </h3>
        </div>
        <p className="text-xs text-amber-800">
          {t("appeal.pendingDesc", "Votre appel a été reçu. L'équipe Vary rendra sa décision sous 48h.")}
        </p>
        {existingAppeal.admin_decision && (
          <div className="mt-3 p-3 rounded-lg bg-card border border-border">
            <p className="text-[11px] font-bold uppercase text-muted-foreground mb-1">
              {t("appeal.decisionLabel", "Décision Vary")}
            </p>
            <p className="text-sm text-foreground">{existingAppeal.admin_decision}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4 p-4 rounded-2xl border border-red-300 bg-red-50/40 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-red-700" />
        <h3 className="font-heading font-semibold text-red-800 text-sm">
          {t("appeal.title", "Faire appel d'un litige")}
        </h3>
      </div>
      <p className="text-xs text-red-800">
        {t("appeal.intro", "Votre compte est temporairement suspendu suite à un litige majeur (taux de défauts > 12%). Vous avez 7 jours pour soumettre un appel ; Vary rendra sa décision sous 48h.")}
      </p>
      <div className="grid grid-cols-2 gap-2 text-[11px] text-red-800 bg-card p-2 rounded-lg border border-red-200">
        <span>{t("appeal.disputeRate", "Taux de défauts")} :</span>
        <span className="text-right font-semibold">{Number(openDispute.defect_percentage).toFixed(2)}%</span>
        <span>{t("appeal.disputeRefund", "Remboursement réclamé")} :</span>
        <span className="text-right font-semibold">{Number(openDispute.refund_amount).toFixed(2)} €</span>
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground block mb-1">
          {t("appeal.messageLabel", "Votre argumentaire (min 50 caractères)")}
        </label>
        <textarea
          value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
          placeholder={t("appeal.messagePlaceholder", "Expliquez pourquoi vous contestez ce litige…")}
        />
        <p className={`text-[10px] mt-1 text-right ${message.length < 50 ? "text-destructive" : "text-muted-foreground"}`}>
          {message.length} / 50 min
        </p>
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground block mb-1">
          {t("appeal.evidenceLabel", "Pièces justificatives (max {{max}} fichiers)", { max: MAX_FILES })}
        </label>
        <label className="flex items-center justify-center gap-2 px-3 py-3 text-xs rounded-lg border border-dashed border-border bg-background cursor-pointer hover:bg-muted/50">
          <Upload className="h-4 w-4" />
          <span>{t("appeal.chooseFiles", "Choisir des fichiers")}</span>
          <input type="file" multiple accept="image/*,application/pdf"
            onChange={(e) => addFiles(e.target.files)} className="hidden"
            disabled={files.length >= MAX_FILES} />
        </label>
        {files.length > 0 && (
          <ul className="mt-2 space-y-1">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between gap-2 px-2 py-1 text-xs bg-background rounded-md border border-border">
                <span className="truncate flex-1">{f.name}</span>
                <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-destructive hover:text-destructive/80">
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={submit}
        disabled={message.trim().length < 50 || submitting}
        className="w-full py-2.5 text-sm font-semibold rounded-xl bg-red-700 text-white hover:bg-red-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {submitting ? t("appeal.submitting", "Envoi…") : t("appeal.submit", "Soumettre l'appel")}
      </button>
    </div>
  );
};
