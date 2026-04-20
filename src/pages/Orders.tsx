import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Truck, CheckCircle2, Clock, AlertTriangle, Loader2, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { DisputeForm } from "@/components/orders/DisputeForm";

const disputeStatusLabel: Record<string, string> = {
  open: "En attente d'examen",
  admin_review: "En cours d'examen",
  resolved_refund: "Résolu — remboursement",
  resolved_release: "Résolu — livraison confirmée",
};

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  pending_payment: { icon: Clock, color: "text-yellow-600 bg-yellow-50", label: "orders.statusPending" },
  paid: { icon: CheckCircle2, color: "text-blue-600 bg-blue-50", label: "orders.statusPaid" },
  preparing: { icon: Package, color: "text-orange-600 bg-orange-50", label: "orders.statusPreparing" },
  shipped: { icon: Truck, color: "text-indigo-600 bg-indigo-50", label: "orders.statusShipped" },
  delivered: { icon: Package, color: "text-green-600 bg-green-50", label: "orders.statusDelivered" },
  confirmed: { icon: CheckCircle2, color: "text-green-700 bg-green-100", label: "orders.statusConfirmed" },
  disputed: { icon: AlertTriangle, color: "text-red-600 bg-red-50", label: "orders.statusDisputed" },
  refunded: { icon: AlertTriangle, color: "text-gray-600 bg-gray-50", label: "orders.statusRefunded" },
  cancelled: { icon: AlertTriangle, color: "text-gray-500 bg-gray-50", label: "orders.statusCancelled" },
};

const StarRow = ({
  value,
  hover,
  onChange,
  onHover,
  readOnly,
}: {
  value: number;
  hover?: number;
  onChange?: (v: number) => void;
  onHover?: (v: number) => void;
  readOnly?: boolean;
}) => (
  <div
    className="flex items-center gap-1"
    onMouseLeave={() => onHover?.(0)}
  >
    {[1, 2, 3, 4, 5].map((n) => {
      const filled = (hover ?? value) >= n;
      return (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onHover?.(n)}
          className={`text-2xl leading-none ${filled ? "text-amber-500" : "text-muted-foreground/40"} ${readOnly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform"}`}
          aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
        >
          {filled ? "★" : "☆"}
        </button>
      );
    })}
  </div>
);

const ReviewBlock = ({
  order,
  buyerProfileId,
  onSaved,
}: {
  order: any;
  buyerProfileId: string;
  onSaved: () => void;
}) => {
  const { data: review, refetch, isLoading } = useQuery({
    queryKey: ["review", order.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("reviews")
        .select("*")
        .eq("order_id", order.id)
        .maybeSingle();
      return data;
    },
  });

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const startNew = () => {
    setRating(0);
    setComment("");
    setEditing(true);
  };

  const startEdit = () => {
    setRating(review?.rating || 0);
    setComment(review?.comment || "");
    setEditing(true);
  };

  const submit = async () => {
    if (!rating) return;
    setSaving(true);
    try {
      if (review) {
        const { error } = await (supabase as any)
          .from("reviews")
          .update({ rating, comment: comment.trim() || null })
          .eq("id", review.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("reviews")
          .insert({
            order_id: order.id,
            lot_id: order.lot_id,
            buyer_id: buyerProfileId,
            seller_id: order.seller_id,
            rating,
            comment: comment.trim() || null,
          });
        if (error) throw error;
      }
      toast.success("Merci pour votre avis !");
      setEditing(false);
      await refetch();
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return null;

  const within48h = review
    ? Date.now() - new Date(review.created_at).getTime() < 48 * 3600 * 1000
    : false;

  if (editing) {
    return (
      <div className="mt-4 p-4 rounded-xl border border-border bg-muted/30 space-y-3">
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">Votre note</p>
          <StarRow value={rating} hover={hover} onChange={setRating} onHover={setHover} />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            Votre commentaire (optionnel)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Décrivez votre expérience…"
          />
          <p className="text-[10px] text-muted-foreground mt-1 text-right">{comment.length}/500</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={submit}
            disabled={!rating || saving}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Envoi…" : "Publier l'avis"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  if (review) {
    return (
      <div className="mt-4 p-4 rounded-xl border border-border bg-muted/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <StarRow value={review.rating} readOnly />
            {review.comment && (
              <p className="text-sm text-foreground mt-2 leading-relaxed">{review.comment}</p>
            )}
          </div>
          {within48h && (
            <button
              onClick={startEdit}
              className="text-xs font-semibold text-primary hover:underline flex-shrink-0"
            >
              Modifier
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={startNew}
      className="w-full mt-4 py-2.5 text-sm font-semibold rounded-xl border border-primary/30 text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
    >
      <Star className="h-4 w-4" />
      Laisser un avis
    </button>
  );
};

const Orders = () => {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [disputingId, setDisputingId] = useState<string | null>(null);

  // Show success banner when returning from Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      toast.success("Paiement confirmé ! Votre commande est en cours de traitement.");
      // Clean the URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const { data: orders = [], refetch } = useQuery({
    queryKey: ["orders", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from("orders")
        .select("*, lots(title, brand, images, units)")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const { data: disputesByOrder = {}, refetch: refetchDisputes } = useQuery({
    queryKey: ["my-disputes", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return {};
      const { data } = await (supabase as any)
        .from("disputes")
        .select("order_id, status, reason, opened_at")
        .eq("buyer_id", profile.id);
      const map: Record<string, any> = {};
      (data || []).forEach((d: any) => { map[d.order_id] = d; });
      return map;
    },
    enabled: !!profile?.id,
  });

  const handleConfirmReceipt = async (orderId: string) => {
    setConfirmingId(orderId);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-receipt", {
        body: { order_id: orderId },
      });
      if (error) throw error;
      toast.success("Réception confirmée. Les fonds seront versés au vendeur sous 24h.");
      refetch();
    } catch {
      toast.error(t("orders.confirmError"));
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-8 pb-24 max-w-4xl mx-auto">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-6">
          {t("orders.title")}
        </h1>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground mb-6">{t("orders.empty")}</p>
            <Link to="/marketplace" className="inline-block px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors">
              {t("common.browseLots")}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => {
              const config = statusConfig[order.status] || statusConfig.pending_payment;
              const StatusIcon = config.icon;
              const lot = order.lots;
              const isBuyer = order.buyer_id === profile?.id;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-2xl border border-border p-5"
                >
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                      {lot?.images?.[0] && (
                        <img src={lot.images[0]} alt={lot.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {t(config.label)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-heading font-semibold text-foreground text-sm">
                        {lot?.brand} — {lot?.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">{lot?.units} {t("common.units")}</p>
                      {order.tracking_number && (
                        <p className="text-xs text-primary mt-1">
                          {t("orders.tracking")}: {order.tracking_number}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-heading font-bold text-foreground">
                        {Number(order.amount).toLocaleString("fr-FR")} €
                      </span>
                    </div>
                  </div>

                  {(() => {
                    const dispute = (disputesByOrder as any)[order.id];
                    const showDisputeBadge = !!dispute || order.status === "disputed";

                    if (isBuyer && order.status === "delivered" && !dispute && disputingId !== order.id) {
                      return (
                        <div className="flex flex-col sm:flex-row gap-2 mt-4">
                          <button
                            onClick={() => handleConfirmReceipt(order.id)}
                            disabled={confirmingId === order.id}
                            className="flex-1 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {confirmingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            {t("orders.confirmReceipt")}
                          </button>
                          <button
                            onClick={() => setDisputingId(order.id)}
                            className="flex-1 py-2.5 border border-destructive/40 text-destructive font-semibold rounded-xl hover:bg-destructive/5 transition-colors flex items-center justify-center gap-2"
                          >
                            <AlertTriangle className="h-4 w-4" />
                            Ouvrir un litige
                          </button>
                        </div>
                      );
                    }

                    if (isBuyer && disputingId === order.id && profile?.id && user?.id) {
                      return (
                        <DisputeForm
                          order={order}
                          buyerProfileId={profile.id}
                          buyerUserId={user.id}
                          onCancel={() => setDisputingId(null)}
                          onSubmitted={() => {
                            setDisputingId(null);
                            refetch();
                            refetchDisputes();
                          }}
                        />
                      );
                    }

                    if (showDisputeBadge) {
                      const status = dispute?.status || "open";
                      return (
                        <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                          <AlertTriangle className="h-4 w-4" />
                          Litige en cours — {disputeStatusLabel[status] || status}
                        </div>
                      );
                    }

                    return null;
                  })()}

                  {isBuyer && order.status === "confirmed" && profile?.id && (
                    <ReviewBlock order={order} buyerProfileId={profile.id} onSaved={() => refetch()} />
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Orders;
