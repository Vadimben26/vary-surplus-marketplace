import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Package, Truck, CheckCircle2, AlertTriangle, FileText, Image as ImageIcon } from "lucide-react";

interface Props {
  order: any; // includes id, lot_id, buyer_id, seller_id, amount, created_at, shipped_at, delivered_at
  onResolved: () => void;
}

export const DisputeResolutionPanel = ({ order, onResolved }: Props) => {
  const { profile } = useAuth();
  const [dispute, setDispute] = useState<any>(null);
  const [evidence, setEvidence] = useState<{ url: string; isImage: boolean; name: string }[]>([]);
  const [sellerResponses, setSellerResponses] = useState<any[]>([]);
  const [parties, setParties] = useState<{ buyer: any; seller: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<"refund" | "release" | null>(null);
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: d } = await (supabase as any)
        .from("disputes")
        .select("*")
        .eq("order_id", order.id)
        .maybeSingle();
      if (cancelled) return;
      setDispute(d);

      const [{ data: buyer }, { data: seller }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, company_name, email").eq("id", order.buyer_id).single(),
        supabase.from("profiles").select("id, full_name, company_name, email").eq("id", order.seller_id).single(),
      ]);
      if (cancelled) return;
      setParties({ buyer, seller });

      // Seller responses (messages from seller about this lot, after dispute opened)
      if (d?.opened_at) {
        const { data: msgs } = await supabase
          .from("messages")
          .select("content, created_at, sender_id")
          .eq("sender_id", order.seller_id)
          .eq("lot_id", order.lot_id)
          .gte("created_at", d.opened_at)
          .order("created_at", { ascending: true });
        if (!cancelled) setSellerResponses(msgs || []);
      }

      // Signed URLs for evidence
      if (d?.evidence_urls?.length) {
        const items: { url: string; isImage: boolean; name: string }[] = [];
        for (const path of d.evidence_urls) {
          const { data: signed } = await supabase.storage
            .from("dispute-evidence")
            .createSignedUrl(path, 3600);
          if (signed?.signedUrl) {
            const name = path.split("/").pop() || "fichier";
            items.push({
              url: signed.signedUrl,
              isImage: /\.(jpe?g|png|gif|webp|heic)$/i.test(name),
              name,
            });
          }
        }
        if (!cancelled) setEvidence(items);
      }

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [order.id, order.buyer_id, order.seller_id, order.lot_id]);

  const handleResolve = async () => {
    if (!confirm || !profile?.id || !dispute) return;
    if (note.trim().length < 10) {
      toast.error("Note de résolution requise (min 10 caractères)");
      return;
    }
    setWorking(true);
    try {
      const isRefund = confirm === "refund";
      const newDisputeStatus = isRefund ? "resolved_refund" : "resolved_release";
      const newOrderStatus = isRefund ? "refunded" : "confirmed";

      const { error: dErr } = await (supabase as any)
        .from("disputes")
        .update({
          status: newDisputeStatus,
          resolution_note: note.trim(),
          resolved_at: new Date().toISOString(),
          resolved_by: profile.id,
        })
        .eq("id", dispute.id);
      if (dErr) throw dErr;

      const { error: oErr } = await (supabase.from("orders") as any)
        .update({ status: newOrderStatus, ...(isRefund ? {} : { confirmed_at: new Date().toISOString() }) })
        .eq("id", order.id);
      if (oErr) throw oErr;

      if (!isRefund) {
        supabase.functions.invoke("release-funds", { body: { orderId: order.id } });
      }

      // Notify both parties (fire-and-forget)
      const outcome = isRefund ? "refund" : "release";
      supabase.functions.invoke("send-dispute-resolved-buyer", {
        body: { orderId: order.id, outcome, resolutionNote: note.trim() },
      });
      supabase.functions.invoke("send-dispute-resolved-seller", {
        body: { orderId: order.id, outcome, resolutionNote: note.trim() },
      });

      if (isRefund) {
        toast.success(`Remboursement à traiter manuellement dans Stripe Dashboard — voir commande ${order.id.slice(0, 8)}`);
      } else {
        toast.success("Fonds libérés au vendeur.");
      }

      setConfirm(null);
      setNote("");
      onResolved();
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de la résolution");
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Chargement du litige…</div>;

  if (!dispute) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Aucun enregistrement de litige trouvé pour cette commande.
      </div>
    );
  }

  const timeline = [
    { label: "Commande créée", date: order.created_at, icon: Package },
    { label: "Paiement confirmé", date: order.created_at, icon: CheckCircle2 },
    { label: "Expédiée", date: order.shipped_at, icon: Truck },
    { label: "Livrée", date: order.delivered_at, icon: CheckCircle2 },
    { label: "Litige ouvert", date: dispute.opened_at, icon: AlertTriangle },
  ].filter((s) => s.date);

  const isResolved = dispute.status?.startsWith("resolved");

  return (
    <div className="p-4 space-y-4 bg-muted/40 rounded-md border border-border">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column: dispute info */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground tracking-wide mb-1">Raison</p>
            <p className="text-sm font-semibold text-foreground">{dispute.reason}</p>
          </div>

          {dispute.details && (
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground tracking-wide mb-1">Détails de l'acheteur</p>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-background p-3 rounded-md border border-border">
                {dispute.details}
              </p>
            </div>
          )}

          {evidence.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground tracking-wide mb-2">
                Preuves ({evidence.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {evidence.map((e, i) => (
                  <a
                    key={i}
                    href={e.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block aspect-square rounded-md border border-border bg-background overflow-hidden hover:border-primary transition-colors relative group"
                  >
                    {e.isImage ? (
                      <img src={e.url} alt={e.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2">
                        <FileText className="h-8 w-8 mb-1" />
                        <span className="text-[10px] truncate w-full text-center">{e.name}</span>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {sellerResponses.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground tracking-wide mb-2">
                Réponse du vendeur
              </p>
              <div className="space-y-2">
                {sellerResponses.map((m, i) => (
                  <div key={i} className="text-xs bg-background p-3 rounded-md border border-border">
                    <p className="text-muted-foreground mb-1">{new Date(m.created_at).toLocaleString("fr-FR")}</p>
                    <p className="text-foreground whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: parties + timeline */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-background p-3 rounded-md border border-border">
              <p className="font-bold uppercase text-muted-foreground tracking-wide mb-1">Acheteur</p>
              <p className="font-semibold text-foreground">{parties?.buyer?.company_name || parties?.buyer?.full_name}</p>
              <p className="text-muted-foreground truncate">{parties?.buyer?.email}</p>
            </div>
            <div className="bg-background p-3 rounded-md border border-border">
              <p className="font-bold uppercase text-muted-foreground tracking-wide mb-1">Vendeur</p>
              <p className="font-semibold text-foreground">{parties?.seller?.company_name || parties?.seller?.full_name}</p>
              <p className="text-muted-foreground truncate">{parties?.seller?.email}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground tracking-wide mb-2">Chronologie</p>
            <ol className="space-y-1.5">
              {timeline.map((s, i) => {
                const Icon = s.icon;
                return (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-foreground">{s.label}</span>
                    <span className="text-muted-foreground ml-auto">
                      {new Date(s.date).toLocaleString("fr-FR")}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          {isResolved && (
            <div className="rounded-md border border-green-300 bg-green-50 p-3">
              <p className="text-xs font-bold text-green-800">
                Litige résolu — {dispute.status === "resolved_refund" ? "Remboursement" : "Fonds libérés"}
              </p>
              {dispute.resolution_note && (
                <p className="text-xs text-green-900 mt-1 whitespace-pre-wrap">{dispute.resolution_note}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {!isResolved && (
        <div className="pt-3 border-t border-border flex flex-col sm:flex-row gap-2">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => { setConfirm("refund"); setNote(""); }}
          >
            Rembourser l'acheteur
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => { setConfirm("release"); setNote(""); }}
          >
            Libérer les fonds au vendeur
          </Button>
        </div>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && !working && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "refund"
                ? `Confirmer le remboursement à ${parties?.buyer?.company_name || parties?.buyer?.full_name || "l'acheteur"} ?`
                : `Confirmer la libération des fonds à ${parties?.seller?.company_name || parties?.seller?.full_name || "le vendeur"} ?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "refund"
                ? "La commande sera marquée comme remboursée. Le remboursement effectif devra être déclenché manuellement dans Stripe Dashboard."
                : "Les fonds seront libérés au vendeur. La commande sera marquée comme confirmée."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Note de résolution (visible par les parties)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Expliquez la décision (min 10 caractères)…"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleResolve} disabled={working || note.trim().length < 10}>
              {working ? "Traitement…" : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
