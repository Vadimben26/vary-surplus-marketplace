import { useState } from "react";
import { Upload, X, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const REASONS = [
  "Produits non reçus",
  "Produits non conformes à la description",
  "Produits endommagés",
  "Quantité incorrecte",
  "Autre",
];

const MAX_FILES = 5;
const MAX_SIZE = 5 * 1024 * 1024;

interface Props {
  order: any;
  buyerProfileId: string;
  buyerUserId: string;
  onCancel: () => void;
  onSubmitted: () => void;
}

export const DisputeForm = ({ order, buyerProfileId, buyerUserId, onCancel, onSubmitted }: Props) => {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const added: File[] = [];
    Array.from(newFiles).forEach((f) => {
      if (files.length + added.length >= MAX_FILES) return;
      if (f.size > MAX_SIZE) {
        toast.error(`${f.name} dépasse 5 Mo`);
        return;
      }
      const ok = f.type.startsWith("image/") || f.type === "application/pdf";
      if (!ok) {
        toast.error(`${f.name}: format non supporté`);
        return;
      }
      added.push(f);
    });
    setFiles([...files, ...added]);
  };

  const removeFile = (idx: number) => setFiles(files.filter((_, i) => i !== idx));

  const canSubmit = !!reason && details.trim().length >= 50 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const disputeId = crypto.randomUUID();
      const evidenceUrls: string[] = [];

      for (const file of files) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${buyerUserId}/${disputeId}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from("dispute-evidence")
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        evidenceUrls.push(path);
      }

      const { error: insErr } = await (supabase as any).from("disputes").insert({
        id: disputeId,
        order_id: order.id,
        buyer_id: buyerProfileId,
        seller_id: order.seller_id,
        reason,
        details: details.trim(),
        evidence_urls: evidenceUrls,
      });
      if (insErr) throw insErr;

      const { error: updErr } = await (supabase.from("orders") as any)
        .update({ status: "disputed" })
        .eq("id", order.id);
      if (updErr) throw updErr;

      supabase.functions.invoke("send-dispute-alert", { body: { orderId: order.id } });

      toast.success("Litige ouvert. Notre équipe vous contactera sous 48h.");
      onSubmitted();
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'ouverture du litige");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 p-4 rounded-xl border border-amber-300 bg-amber-50/40 space-y-3">
      <div className="flex items-center gap-2 text-amber-700">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-wide">Ouverture d'un litige</span>
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground block mb-1">Raison du litige</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
        >
          <option value="">— Sélectionner —</option>
          {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground block mb-1">Décrivez le problème</label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={4}
          minLength={50}
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
          placeholder="Décrivez précisément le problème (min 50 caractères)…"
        />
        <p className={`text-[10px] mt-1 text-right ${details.length < 50 ? "text-destructive" : "text-muted-foreground"}`}>
          {details.length} / 50 min
        </p>
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground block mb-1">
          Ajouter des preuves (photos, PDF — max {MAX_FILES} fichiers, 5 Mo chacun)
        </label>
        <label className="flex items-center justify-center gap-2 px-3 py-3 text-xs rounded-lg border border-dashed border-border bg-background cursor-pointer hover:bg-muted/50">
          <Upload className="h-4 w-4" />
          <span>Choisir des fichiers</span>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={(e) => addFiles(e.target.files)}
            className="hidden"
            disabled={files.length >= MAX_FILES}
          />
        </label>
        {files.length > 0 && (
          <ul className="mt-2 space-y-1">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between gap-2 px-2 py-1 text-xs bg-background rounded-md border border-border">
                <span className="truncate flex-1">{f.name}</span>
                <span className="text-muted-foreground">{(f.size / 1024).toFixed(0)} Ko</span>
                <button onClick={() => removeFile(i)} className="text-destructive hover:text-destructive/80">
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
          {submitting ? "Envoi…" : "Soumettre le litige"}
        </button>
        <button onClick={onCancel} disabled={submitting} className="text-sm text-muted-foreground hover:text-foreground">
          Annuler
        </button>
      </div>
    </div>
  );
};
