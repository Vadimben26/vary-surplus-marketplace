import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Truck, Package, CheckCircle2, Clock, AlertTriangle, MessageCircle, Loader2, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import LegalFooter from "@/components/LegalFooter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DisputeForm } from "@/components/orders/DisputeForm";

const statusSteps = ["paid", "preparing", "shipped", "delivered", "confirmed"] as const;

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
  <div className="flex items-center gap-1" onMouseLeave={() => onHover?.(0)}>
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

  const startNew = () => { setRating(0); setComment(""); setEditing(true); };
  const startEdit = () => { setRating(review?.rating || 0); setComment(review?.comment || ""); setEditing(true); };

  const submit = async () => {
    if (!rating) return;
    setSaving(true);
    try {
      if (review) {
        const { error } = await (supabase as any).from("reviews")
          .update({ rating, comment: comment.trim() || null }).eq("id", review.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("reviews").insert({
          order_id: order.id, lot_id: order.lot_id, buyer_id: buyerProfileId,
          seller_id: order.seller_id, rating, comment: comment.trim() || null,
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
  const within48h = review ? Date.now() - new Date(review.created_at).getTime() < 48 * 3600 * 1000 : false;

  if (editing) {
    return (
      <div className="mt-4 p-4 rounded-xl border border-border bg-muted/30 space-y-3">
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">Votre note</p>
          <StarRow value={rating} hover={hover} onChange={setRating} onHover={setHover} />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Votre commentaire (optionnel)</label>
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
          <button onClick={submit} disabled={!rating || saving}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? "Envoi…" : "Publier l'avis"}
          </button>
          <button onClick={() => setEditing(false)} className="text-sm text-muted-foreground hover:text-foreground">
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
            {review.comment && <p className="text-sm text-foreground mt-2 leading-relaxed">{review.comment}</p>}
          </div>
          {within48h && (
            <button onClick={startEdit} className="text-xs font-semibold text-primary hover:underline flex-shrink-0">
              Modifier
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <button onClick={startNew}
      className="w-full mt-4 py-2.5 text-sm font-semibold rounded-xl border border-primary/30 text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
      <Star className="h-4 w-4" />
      Laisser un avis
    </button>
  );
};

// Countdown component for 48h dispute window
const DisputeCountdown = ({ deliveredAt }: { deliveredAt: string }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(i);
  }, []);
  const deadline = new Date(deliveredAt).getTime() + 48 * 3600 * 1000;
  const remaining = Math.max(0, deadline - now);
  const hours = Math.floor(remaining / 3600_000);
  const minutes = Math.floor((remaining % 3600_000) / 60_000);
  const { t } = useTranslation();
  if (remaining === 0) return <span>{t("buyerTracking.deadlinePassed")}</span>;
  return <span dangerouslySetInnerHTML={{ __html: t("buyerTracking.deliveredCountdown", { hours, minutes }).replace(/(\d+h \d+min)/, "<strong>$1</strong>") }} />;
};

const Orders = () => {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"active" | "disputes">("active");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [disputingId, setDisputingId] = useState<string | null>(null);

  // Show success banner when returning from Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      toast.success("Paiement confirmé ! Votre commande est en cours de traitement.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["buyer-tracking", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*, lots(title, brand, images, units), profiles!orders_seller_id_fkey(id, full_name, company_name)")
        .eq("buyer_id", profile.id)
        .in("status", ["paid", "preparing", "shipped", "delivered", "confirmed"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const { data: disputes = [], isLoading: disputesLoading, refetch: refetchDisputes } = useQuery({
    queryKey: ["buyer-disputes", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*, lots(title, brand, images, units), profiles!orders_seller_id_fkey(id, full_name, company_name)")
        .eq("buyer_id", profile.id)
        .in("status", ["disputed", "refunded"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const { data: disputeRecords = {} } = useQuery({
    queryKey: ["buyer-dispute-records", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return {};
      const { data } = await (supabase as any)
        .from("disputes")
        .select("*")
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
      const { error } = await supabase.functions.invoke("confirm-receipt", {
        body: { order_id: orderId },
      });
      if (error) throw error;
      toast.success("Réception confirmée. Les fonds sont libérés au vendeur.");
      queryClient.invalidateQueries({ queryKey: ["buyer-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["buyer-disputes"] });
    } catch {
      toast.error("Erreur lors de la confirmation");
    } finally {
      setConfirmingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return <Clock className="h-4 w-4 text-amber-500" />;
      case "preparing": return <Package className="h-4 w-4 text-blue-500" />;
      case "shipped": return <Truck className="h-4 w-4 text-primary" />;
      case "delivered": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "confirmed": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "disputed": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "refunded": return <Clock className="h-4 w-4 text-muted-foreground" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      paid: t("sellerTracking.paid"),
      preparing: t("sellerTracking.preparing"),
      shipped: t("sellerTracking.shipped"),
      delivered: t("sellerTracking.delivered"),
      confirmed: t("sellerTracking.confirmed"),
      disputed: t("sellerDisputes.disputed"),
      refunded: t("sellerDisputes.refunded"),
    };
    return labels[status] || status;
  };

  const getStepIndex = (status: string) => statusSteps.indexOf(status as any);

  const currentList = activeTab === "active" ? orders : disputes;
  const loading = activeTab === "active" ? isLoading : disputesLoading;

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-6 pb-24 max-w-[1400px] mx-auto">
        <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-4">
          {t("buyerTracking.title")}
        </h1>

        {/* Internal tabs */}
        <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === "active" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {t("buyerTracking.tabActive")}
          </button>
          <button
            onClick={() => setActiveTab("disputes")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors relative ${activeTab === "disputes" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {t("buyerTracking.tabDisputes")}
            {disputes.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {disputes.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">{t("common.loading")}</div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-16">
            {activeTab === "active" ? (
              <>
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("buyerTracking.empty")}</p>
              </>
            ) : (
              <>
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">{t("buyerTracking.disputesEmpty")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("buyerTracking.disputesEmptyDesc")}</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {currentList.map((order: any, i: number) => {
              const lot = order.lots;
              const seller = order.profiles;
              const currentStep = getStepIndex(order.status);
              const isDisputed = order.status === "disputed";
              const dispute = (disputeRecords as any)[order.id];

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-card rounded-2xl border p-4 ${isDisputed ? "border-amber-300" : "border-border"}`}
                >
                  <div className="flex items-start gap-3 mb-4">
                    {lot?.images?.[0] && (
                      <img src={lot.images[0]} alt={lot.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold text-foreground text-sm line-clamp-1">{lot?.title}</h3>
                      <p className="text-xs text-muted-foreground">{seller?.company_name || seller?.full_name || "Vendeur"}</p>
                      <p className="text-xs font-semibold text-primary mt-0.5">{Number(order.amount).toLocaleString("fr-FR")} €</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs font-medium">
                      {getStatusIcon(order.status)}
                      {getStatusLabel(order.status)}
                    </div>
                  </div>

                  {/* Progress bar for active orders */}
                  {activeTab === "active" && (
                    <>
                      <div className="flex items-center gap-1">
                        {statusSteps.map((step, idx) => (
                          <div key={step} className="flex-1 flex items-center gap-1">
                            <div className={`h-1.5 flex-1 rounded-full transition-colors ${idx <= currentStep ? "bg-primary" : "bg-muted"}`} />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-1.5">
                        {statusSteps.map((step) => (
                          <span key={step} className="text-[8px] text-muted-foreground">{getStatusLabel(step)}</span>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Tracking number */}
                  {order.tracking_number && (
                    <p className="text-xs text-muted-foreground mt-3">
                      {t("sellerTracking.trackingNumber")}: <span className="font-mono font-semibold text-foreground">{order.tracking_number}</span>
                    </p>
                  )}

                  {/* DELIVERED — buyer must verify within 48h */}
                  {activeTab === "active" && order.status === "delivered" && !dispute && disputingId !== order.id && (
                    <div className="mt-3 space-y-3">
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-amber-800">
                              {t("buyerTracking.deliveredBanner")}
                            </p>
                            <p className="text-[11px] text-amber-700 mt-0.5">
                              {order.delivered_at ? (
                                <DisputeCountdown deliveredAt={order.delivered_at} />
                              ) : (
                                t("buyerTracking.deliveredHint")
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => handleConfirmReceipt(order.id)}
                          disabled={confirmingId === order.id}
                          className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {confirmingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          {t("buyerTracking.confirmGood")}
                        </button>
                        <button
                          onClick={() => setDisputingId(order.id)}
                          className="flex-1 py-2.5 border border-destructive/40 text-destructive text-sm font-semibold rounded-xl hover:bg-destructive/5 transition-colors flex items-center justify-center gap-2"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          {t("buyerTracking.openDispute")}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Dispute form (inline) */}
                  {activeTab === "active" && disputingId === order.id && profile?.id && user?.id && (
                    <div className="mt-3">
                      <DisputeForm
                        order={order}
                        buyerProfileId={profile.id}
                        buyerUserId={user.id}
                        onCancel={() => setDisputingId(null)}
                        onSubmitted={() => {
                          setDisputingId(null);
                          refetch();
                          refetchDisputes();
                          setActiveTab("disputes");
                        }}
                      />
                    </div>
                  )}

                  {/* CONFIRMED — leave a review */}
                  {activeTab === "active" && order.status === "confirmed" && profile?.id && (
                    <ReviewBlock order={order} buyerProfileId={profile.id} onSaved={() => refetch()} />
                  )}

                  {/* Dispute details (disputes tab) */}
                  {activeTab === "disputes" && order.status === "disputed" && (
                    <div className="mt-3 space-y-2">
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-amber-800">
                              {t("buyerTracking.disputeInReview")}{dispute?.reason ? ` — ${dispute.reason}` : ""}
                            </p>
                            <p className="text-[11px] text-amber-700 mt-0.5">
                              {t("buyerTracking.disputeFundsHeld")}
                              {dispute?.opened_at && ` ${t("buyerTracking.disputeOpenedOn", { date: new Date(dispute.opened_at).toLocaleString() })}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/messages?with=${seller?.id}&lot=${order.lot_id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                      >
                        <MessageCircle className="h-3 w-3" />
                        {t("buyerTracking.contactSeller")}
                      </button>
                    </div>
                  )}

                  {activeTab === "disputes" && order.status === "refunded" && (
                    <div className="mt-3 rounded-xl bg-muted/50 border border-border p-3">
                      <p className="text-xs font-semibold text-foreground">{t("buyerTracking.refundedTitle")}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{t("buyerTracking.refundedDesc")}</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
      <LegalFooter />
      <BottomNav />
    </div>
  );
};

export default Orders;
