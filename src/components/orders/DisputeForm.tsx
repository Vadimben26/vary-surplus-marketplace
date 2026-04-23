import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload, X, Loader2, AlertTriangle, Truck, Package, Plus, Minus, Camera } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_SIZE = 5 * 1024 * 1024;

interface Props {
  order: any;
  buyerProfileId: string;
  buyerUserId: string;
  onCancel: () => void;
  onSubmitted: () => void;
}

type Mode = "choose" | "quality" | "transport";

interface DefectiveItem {
  lot_item_id: string;
  defective_quantity: number;
  photoFile: File | null;
  photoPreview: string | null;
}

/**
 * 3-zone dispute system:
 *  - Green (≤2%):    No automatic action — buyer is shown a tolerance message.
 *  - Orange (2-12%): Partial refund computed per article using inventory references.
 *                    Refund = Σ(retail × defective_qty) × (lot_price / total_retail_value)
 *  - Red (>12%):     Full refund. Return shipping at seller's expense. Seller suspended.
 *
 * A buyer MUST upload at least one photo per defective reference declared.
 * Transport damage is routed to a separate "transport_claim" flow (admin-managed).
 */
export const DisputeForm = ({ order, buyerProfileId, buyerUserId, onCancel, onSubmitted }: Props) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("choose");
  const [details, setDetails] = useState("");
  const [defects, setDefects] = useState<Record<string, DefectiveItem>>({});
  const [transportFiles, setTransportFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Fetch lot items (references) so the buyer can declare defects per article.
  const { data: lotItems = [] } = useQuery({
    queryKey: ["lot-items-for-dispute", order.lot_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lot_items")
        .select("id, name, reference, quantity, retail_price, image_url, brand")
        .eq("lot_id", order.lot_id);
      if (error) throw error;
      return data || [];
    },
    enabled: mode === "quality",
  });

  // ---------- Aggregate metrics ----------
  const totals = useMemo(() => {
    const totalUnits = lotItems.reduce((s: number, it: any) => s + (it.quantity || 0), 0);
    const totalRetail = lotItems.reduce(
      (s: number, it: any) => s + Number(it.retail_price || 0) * (it.quantity || 0),
      0,
    );
    const defectiveUnits = Object.values(defects).reduce((s, d) => s + (d.defective_quantity || 0), 0);
    const defectiveRetail = Object.values(defects).reduce((s, d) => {
      const item = lotItems.find((it: any) => it.id === d.lot_item_id);
      return s + Number(item?.retail_price || 0) * (d.defective_quantity || 0);
    }, 0);
    const defectPct = totalUnits > 0 ? (defectiveUnits / totalUnits) * 100 : 0;
    const lotPrice = Number(order.amount || 0);
    const refundOrange = totalRetail > 0 ? defectiveRetail * (lotPrice / totalRetail) : 0;
    let zone: "green" | "orange" | "red" = "green";
    if (defectPct > 12) zone = "red";
    else if (defectPct > 2) zone = "orange";
    const refundAmount = zone === "red" ? lotPrice : zone === "orange" ? refundOrange : 0;
    return { totalUnits, totalRetail, defectiveUnits, defectiveRetail, defectPct, lotPrice, refundAmount, zone };
  }, [lotItems, defects, order.amount]);

  // ---------- Defect editing ----------
  const setDefectQty = (item: any, qty: number) => {
    const clamped = Math.max(0, Math.min(item.quantity || 0, qty));
    setDefects((prev) => {
      const next = { ...prev };
      const existing = next[item.id];
      if (clamped === 0) {
        if (existing?.photoPreview) URL.revokeObjectURL(existing.photoPreview);
        delete next[item.id];
      } else {
        next[item.id] = {
          lot_item_id: item.id,
          defective_quantity: clamped,
          photoFile: existing?.photoFile ?? null,
          photoPreview: existing?.photoPreview ?? null,
        };
      }
      return next;
    });
  };

  const setDefectPhoto = (itemId: string, file: File | null) => {
    if (file && file.size > MAX_SIZE) {
      toast.error(t("disputeForm.fileTooLarge", { name: file.name }));
      return;
    }
    if (file && !file.type.startsWith("image/")) {
      toast.error(t("disputeForm.fileUnsupported", { name: file.name }));
      return;
    }
    setDefects((prev) => {
      const next = { ...prev };
      const existing = next[itemId];
      if (!existing) return next;
      if (existing.photoPreview) URL.revokeObjectURL(existing.photoPreview);
      next[itemId] = {
        ...existing,
        photoFile: file,
        photoPreview: file ? URL.createObjectURL(file) : null,
      };
      return next;
    });
  };

  // ---------- Transport claim files ----------
  const addTransportFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const added: File[] = [];
    Array.from(newFiles).forEach((f) => {
      if (transportFiles.length + added.length >= 5) return;
      if (f.size > MAX_SIZE) { toast.error(t("disputeForm.fileTooLarge", { name: f.name })); return; }
      if (!(f.type.startsWith("image/") || f.type === "application/pdf")) {
        toast.error(t("disputeForm.fileUnsupported", { name: f.name })); return;
      }
      added.push(f);
    });
    setTransportFiles([...transportFiles, ...added]);
  };

  // ---------- Validation ----------
  const qualityValid = useMemo(() => {
    const items = Object.values(defects);
    if (items.length === 0) return false;
    if (items.some((d) => !d.photoFile)) return false;
    return details.trim().length >= 50;
  }, [defects, details]);

  const transportValid = transportFiles.length > 0 && details.trim().length >= 50;

  // ---------- Submit quality dispute ----------
  const submitQuality = async () => {
    if (!qualityValid || submitting) return;
    if (totals.zone === "green") {
      toast.error(t("disputeForm.greenZoneError", "Le taux de défauts (≤2%) entre dans la tolérance contractuelle. Aucun litige n'est ouvert."));
      return;
    }
    setSubmitting(true);
    try {
      const disputeId = crypto.randomUUID();
      const items = Object.values(defects);

      // Upload one photo per defective reference.
      const uploaded: Array<{ lot_item_id: string; defective_quantity: number; photo_url: string; retail_price_unit: number }> = [];
      for (const d of items) {
        const file = d.photoFile!;
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${buyerUserId}/${disputeId}/${d.lot_item_id}-${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage.from("dispute-evidence").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const item = lotItems.find((it: any) => it.id === d.lot_item_id);
        uploaded.push({
          lot_item_id: d.lot_item_id,
          defective_quantity: d.defective_quantity,
          photo_url: path,
          retail_price_unit: Number(item?.retail_price || 0),
        });
      }

      // Insert the dispute row with computed zone & refund.
      const reasonLabel = totals.zone === "red"
        ? "Défauts majeurs (zone rouge)"
        : "Défauts partiels (zone orange)";

      const { error: insErr } = await (supabase as any).from("disputes").insert({
        id: disputeId,
        order_id: order.id,
        buyer_id: buyerProfileId,
        seller_id: order.seller_id,
        dispute_type: "quality",
        zone: totals.zone,
        defect_percentage: Math.round(totals.defectPct * 100) / 100,
        refund_amount: Math.round(totals.refundAmount * 100) / 100,
        reason: reasonLabel,
        details: details.trim(),
        evidence_urls: uploaded.map((u) => u.photo_url),
      });
      if (insErr) throw insErr;

      // Insert per-reference dispute_items rows.
      const { error: itemsErr } = await (supabase as any).from("dispute_items").insert(
        uploaded.map((u) => ({ dispute_id: disputeId, ...u }))
      );
      if (itemsErr) throw itemsErr;

      // Mark order as disputed.
      const { error: updErr } = await (supabase.from("orders") as any)
        .update({ status: "disputed" })
        .eq("id", order.id);
      if (updErr) throw updErr;

      // Red zone: temporarily suspend the seller (7 days) so they can appeal.
      if (totals.zone === "red") {
        const sevenDays = new Date();
        sevenDays.setDate(sevenDays.getDate() + 7);
        await (supabase.from("profiles") as any)
          .update({ suspended_until: sevenDays.toISOString() })
          .eq("id", order.seller_id);
      }

      // Best-effort admin alert.
      supabase.functions.invoke("send-dispute-alert", { body: { orderId: order.id } });

      toast.success(t("disputeForm.submittedToast"));
      onSubmitted();
    } catch (e: any) {
      toast.error(e?.message || t("disputeForm.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Submit transport claim ----------
  const submitTransport = async () => {
    if (!transportValid || submitting) return;
    setSubmitting(true);
    try {
      const claimId = crypto.randomUUID();
      const urls: string[] = [];
      for (const file of transportFiles) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${buyerUserId}/${claimId}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage.from("dispute-evidence").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        urls.push(path);
      }
      const { error: insErr } = await (supabase as any).from("transport_claims").insert({
        id: claimId,
        order_id: order.id,
        buyer_id: buyerProfileId,
        seller_id: order.seller_id,
        description: details.trim(),
        evidence_urls: urls,
      });
      if (insErr) throw insErr;

      // Best-effort admin alert (reuse the dispute alert function).
      supabase.functions.invoke("send-dispute-alert", { body: { orderId: order.id, type: "transport" } });

      toast.success(t("disputeForm.transportSubmitted", "Réclamation transport envoyée. L'équipe Vary vous contactera sous 48h."));
      onSubmitted();
    } catch (e: any) {
      toast.error(e?.message || t("disputeForm.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- UI ----------
  if (mode === "choose") {
    return (
      <div className="mt-4 p-4 rounded-xl border border-amber-300 bg-amber-50/40 space-y-3">
        <div className="flex items-center gap-2 text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wide">{t("disputeForm.title")}</span>
        </div>
        <p className="text-xs text-foreground">
          {t("disputeForm.chooseTypePrompt", "Quel est le type de problème rencontré ?")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => setMode("quality")}
            className="flex items-start gap-2 p-3 text-left rounded-lg border border-border bg-card hover:border-primary/60 hover:bg-primary/5 transition-colors"
          >
            <Package className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t("disputeForm.qualityTitle", "Défauts produits")}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t("disputeForm.qualityDesc", "Articles abîmés, non conformes, manquants")}
              </p>
            </div>
          </button>
          <button
            onClick={() => setMode("transport")}
            className="flex items-start gap-2 p-3 text-left rounded-lg border border-border bg-card hover:border-primary/60 hover:bg-primary/5 transition-colors"
          >
            <Truck className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t("disputeForm.transportTitle", "Dommage transport")}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t("disputeForm.transportDesc", "Colis endommagé pendant l'acheminement — pris en charge par Vary")}
              </p>
            </div>
          </button>
        </div>
        <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">
          {t("disputeForm.cancel")}
        </button>
      </div>
    );
  }

  if (mode === "transport") {
    return (
      <div className="mt-4 p-4 rounded-xl border border-amber-300 bg-amber-50/40 space-y-3">
        <div className="flex items-center gap-2 text-amber-700">
          <Truck className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wide">
            {t("disputeForm.transportTitle", "Dommage transport")}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t("disputeForm.transportInfo", "Cette réclamation est traitée directement par l'équipe Vary. Le vendeur n'est pas tenu responsable.")}
        </p>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">{t("disputeForm.describeLabel")}</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
            placeholder={t("disputeForm.transportPlaceholder", "Décrivez l'état du colis à la réception (min 50 caractères)…")}
          />
          <p className={`text-[10px] mt-1 text-right ${details.length < 50 ? "text-destructive" : "text-muted-foreground"}`}>
            {t("disputeForm.minChars", { count: details.length })}
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            {t("disputeForm.evidenceLabel", { max: 5 })}
          </label>
          <label className="flex items-center justify-center gap-2 px-3 py-3 text-xs rounded-lg border border-dashed border-border bg-background cursor-pointer hover:bg-muted/50">
            <Upload className="h-4 w-4" />
            <span>{t("disputeForm.chooseFiles")}</span>
            <input type="file" multiple accept="image/*,application/pdf"
              onChange={(e) => addTransportFiles(e.target.files)}
              className="hidden" disabled={transportFiles.length >= 5} />
          </label>
          {transportFiles.length > 0 && (
            <ul className="mt-2 space-y-1">
              {transportFiles.map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-2 px-2 py-1 text-xs bg-background rounded-md border border-border">
                  <span className="truncate flex-1">{f.name}</span>
                  <span className="text-muted-foreground">{(f.size / 1024).toFixed(0)} Ko</span>
                  <button onClick={() => setTransportFiles(transportFiles.filter((_, j) => j !== i))} className="text-destructive hover:text-destructive/80">
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={submitTransport}
            disabled={!transportValid || submitting}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
            {submitting ? t("disputeForm.submitting") : t("disputeForm.submitTransport", "Envoyer la réclamation")}
          </button>
          <button onClick={() => setMode("choose")} disabled={submitting} className="text-sm text-muted-foreground hover:text-foreground">
            {t("disputeForm.back", "← Retour")}
          </button>
        </div>
      </div>
    );
  }

  // mode === "quality"
  const zoneStyle =
    totals.zone === "red"
      ? "bg-red-50 border-red-300 text-red-800"
      : totals.zone === "orange"
        ? "bg-amber-50 border-amber-300 text-amber-800"
        : "bg-green-50 border-green-300 text-green-800";

  const zoneLabel =
    totals.zone === "red"
      ? t("disputeForm.zoneRedLabel", "Zone rouge — remboursement intégral")
      : totals.zone === "orange"
        ? t("disputeForm.zoneOrangeLabel", "Zone orange — remboursement partiel calculé")
        : t("disputeForm.zoneGreenLabel", "Zone verte — tolérance contractuelle (≤ 2%)");

  return (
    <div className="mt-4 p-4 rounded-xl border border-amber-300 bg-amber-50/40 space-y-4">
      <div className="flex items-center gap-2 text-amber-700">
        <Package className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-wide">
          {t("disputeForm.qualityTitle", "Défauts produits")}
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {t("disputeForm.qualityInstructions", "Pour chaque référence défectueuse, indiquez la quantité et joignez une photo prouvant le défaut. Le calcul se fait au prorata du prix de revente.")}
      </p>

      {/* References list */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {lotItems.length === 0 && (
          <div className="text-xs text-muted-foreground italic p-3 text-center">
            {t("disputeForm.noItems", "Inventaire indisponible pour ce lot.")}
          </div>
        )}
        {lotItems.map((item: any) => {
          const d = defects[item.id];
          const qty = d?.defective_quantity || 0;
          return (
            <div key={item.id} className={`p-3 rounded-lg border ${qty > 0 ? "border-amber-300 bg-amber-50/30" : "border-border bg-card"}`}>
              <div className="flex items-start gap-3">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-muted flex-shrink-0 flex items-center justify-center">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.reference ? `Réf. ${item.reference} · ` : ""}{item.quantity} unités · {Number(item.retail_price || 0).toFixed(2)} € retail
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button type="button" onClick={() => setDefectQty(item, qty - 1)} disabled={qty === 0}
                    className="w-7 h-7 rounded-md border border-border bg-card flex items-center justify-center disabled:opacity-30 hover:bg-muted">
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="number" min={0} max={item.quantity} value={qty}
                    onChange={(e) => setDefectQty(item, Number(e.target.value))}
                    className="w-12 h-7 text-center text-xs rounded-md border border-border bg-background"
                  />
                  <button type="button" onClick={() => setDefectQty(item, qty + 1)} disabled={qty >= (item.quantity || 0)}
                    className="w-7 h-7 rounded-md border border-border bg-card flex items-center justify-center disabled:opacity-30 hover:bg-muted">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {qty > 0 && (
                <div className="mt-2 pl-13">
                  {d?.photoPreview ? (
                    <div className="flex items-center gap-2">
                      <img src={d.photoPreview} alt="" className="w-12 h-12 rounded-md object-cover border border-border" />
                      <button onClick={() => setDefectPhoto(item.id, null)} className="text-[11px] text-destructive hover:underline">
                        {t("disputeForm.removePhoto", "Retirer la photo")}
                      </button>
                    </div>
                  ) : (
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-md border border-dashed border-amber-400 bg-amber-50 text-amber-800 cursor-pointer hover:bg-amber-100">
                      <Camera className="h-3 w-3" />
                      {t("disputeForm.addPhotoRequired", "Photo obligatoire pour cette référence")}
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => setDefectPhoto(item.id, e.target.files?.[0] || null)} />
                    </label>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live computation summary */}
      {totals.defectiveUnits > 0 && (
        <div className={`p-3 rounded-lg border ${zoneStyle} space-y-1.5`}>
          <p className="text-xs font-bold uppercase tracking-wide">{zoneLabel}</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <span>{t("disputeForm.defectRate", "Taux de défauts")} :</span>
            <span className="text-right font-semibold">{totals.defectPct.toFixed(2)}% ({totals.defectiveUnits}/{totals.totalUnits})</span>
            <span>{t("disputeForm.lotPrice", "Prix du lot")} :</span>
            <span className="text-right font-semibold">{totals.lotPrice.toFixed(2)} €</span>
            {totals.zone !== "green" && (
              <>
                <span>{t("disputeForm.refundEstimate", "Remboursement estimé")} :</span>
                <span className="text-right font-semibold">{totals.refundAmount.toFixed(2)} €</span>
              </>
            )}
          </div>
          {totals.zone === "red" && (
            <p className="text-[11px] mt-1">
              {t("disputeForm.redZoneNote", "Le compte vendeur sera temporairement suspendu et pourra faire appel sous 7 jours.")}
            </p>
          )}
          {totals.zone === "green" && (
            <p className="text-[11px] mt-1">
              {t("disputeForm.greenZoneNote", "Le taux de défauts entre dans la tolérance contractuelle (≤ 2%). Aucun remboursement automatique.")}
            </p>
          )}
        </div>
      )}

      {/* Description */}
      <div>
        <label className="text-xs font-semibold text-foreground block mb-1">{t("disputeForm.describeLabel")}</label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
          placeholder={t("disputeForm.describePlaceholder")}
        />
        <p className={`text-[10px] mt-1 text-right ${details.length < 50 ? "text-destructive" : "text-muted-foreground"}`}>
          {t("disputeForm.minChars", { count: details.length })}
        </p>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={submitQuality}
          disabled={!qualityValid || submitting || totals.zone === "green"}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
          {submitting ? t("disputeForm.submitting") : t("disputeForm.submit")}
        </button>
        <button onClick={() => setMode("choose")} disabled={submitting} className="text-sm text-muted-foreground hover:text-foreground">
          {t("disputeForm.back", "← Retour")}
        </button>
      </div>
    </div>
  );
};
