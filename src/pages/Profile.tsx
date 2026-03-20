import { useState, useEffect } from "react";
import { ArrowLeft, User, Package, Clock, CheckCircle, Edit2, Save, X, Building2, Truck, AlertTriangle, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import varyLogo from "@/assets/vary-logo.png";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import DevPanel from "@/components/DevPanel";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, canAccessSeller, updateProfile } = useAuth();
  const isSeller = canAccessSeller();
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"profile" | "orders">("profile");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    company_name: profile?.company_name || "",
    company_description: profile?.company_description || "",
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["buyer-orders", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*, lots(title, brand, images)")
        .eq("buyer_id", profile.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    pending_payment: { label: t("legal.orders.statusPending"), color: "text-muted-foreground bg-muted", icon: Clock },
    paid: { label: t("legal.orders.statusPaid"), color: "text-amber-600 bg-amber-50", icon: Clock },
    preparing: { label: t("legal.orders.statusPreparing"), color: "text-blue-600 bg-blue-50", icon: Package },
    shipped: { label: t("legal.orders.statusShipped"), color: "text-blue-600 bg-blue-50", icon: Truck },
    delivered: { label: t("legal.orders.statusDelivered"), color: "text-green-600 bg-green-50", icon: CheckCircle },
    confirmed: { label: t("legal.orders.statusConfirmed"), color: "text-green-700 bg-green-50", icon: CheckCircle },
    disputed: { label: t("legal.orders.statusDisputed"), color: "text-amber-700 bg-amber-50", icon: AlertTriangle },
    refunded: { label: t("legal.orders.statusRefunded"), color: "text-muted-foreground bg-muted", icon: Clock },
    cancelled: { label: t("legal.orders.statusCancelled"), color: "text-destructive bg-destructive/10", icon: X },
  };

  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        company_name: profile.company_name || "",
        company_description: profile.company_description || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    const { error } = await updateProfile(editForm as any);
    if (error) {
      toast.error(t("profile.saveError"));
    } else {
      toast.success(t("profile.saveSuccess"));
      setEditing(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      company_name: profile?.company_name || "",
      company_description: profile?.company_description || "",
    });
    setEditing(false);
  };

  const handleConfirmReceipt = async (orderId: string) => {
    setConfirmingId(orderId);
    try {
      const { error } = await supabase.functions.invoke("confirm-receipt", {
        body: { order_id: orderId },
      });
      if (error) throw error;
      toast.success(t("legal.orders.receiptConfirmed"));
      queryClient.invalidateQueries({ queryKey: ["buyer-orders"] });
    } catch {
      toast.error(t("legal.orders.confirmError"));
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-8 h-16">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Link to="/marketplace">
            <img src={varyLogo} alt="Vary" className="h-8 w-auto" />
          </Link>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-6">{t("profile.title")}</h1>

        <div className="flex gap-1 mb-8 bg-muted rounded-xl p-1">
          <button
            onClick={() => setTab("profile")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${tab === "profile" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {t("profile.profileTab")}
          </button>
          <button
            onClick={() => setTab("orders")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${tab === "orders" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {t("profile.ordersTab")}
          </button>
        </div>

        {tab === "profile" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h2 className="font-heading font-semibold text-foreground">{profile?.full_name || t("common.myProfile")}</h2>
                  <p className="text-sm text-muted-foreground">{profile?.company_name || profile?.email}</p>
                </div>
              </div>
              {!editing && (
                <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 text-sm text-primary border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors">
                  <Edit2 className="h-4 w-4" /> {t("common.edit")}
                </button>
              )}
            </div>

            <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
              {editing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{t("profile.fullName")}</label>
                      <input type="text" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{t("profile.phone")}</label>
                      <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">{t("profile.company")}</label>
                      <input type="text" value={editForm.company_name} onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })} className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring outline-none" />
                    </div>
                  </div>
                  {isSeller && (
                    <div className="pt-2">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {t("profile.companyDesc")}
                      </label>
                      <Textarea value={editForm.company_description} onChange={(e) => setEditForm({ ...editForm, company_description: e.target.value })} placeholder={t("profile.descPlaceholder")} className="resize-none mt-1" rows={3} />
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary-dark transition-colors text-sm">
                      <Save className="h-4 w-4" /> {t("common.save")}
                    </button>
                    <button onClick={handleCancel} className="flex items-center gap-2 px-5 py-2.5 border border-border text-foreground rounded-xl hover:bg-muted transition-colors text-sm">
                      <X className="h-4 w-4" /> {t("common.cancel")}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      [t("profile.name"), profile?.full_name || "—"],
                      [t("profile.emailLabel"), profile?.email || "—"],
                      [t("profile.phone"), profile?.phone || "—"],
                      [t("profile.company"), profile?.company_name || "—"],
                      [t("profile.type"), profile?.user_type === "both" ? t("profile.buyerAndSeller") : profile?.user_type === "seller" ? t("profile.sellerType") : t("profile.buyerType")],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                  {isSeller && profile?.company_description && (
                    <div className="border-t border-border pt-4 mt-4">
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                        <Building2 className="h-3 w-3" /> {t("profile.companyDesc")}
                      </p>
                      <p className="text-sm text-foreground">{profile.company_description}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {profile?.email === "vadimbenchetrit@icloud.com" && (
              <DevPanel profileId={profile.id} />
            )}
          </motion.div>
        )}

        {tab === "orders" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {ordersLoading ? (
              <div className="text-center py-16 text-muted-foreground">{t("common.loading")}</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("legal.orders.empty")}</p>
              </div>
            ) : (
              orders.map((order: any) => {
                const lot = order.lots;
                const sc = statusConfig[order.status] || statusConfig.pending_payment;
                const StatusIcon = sc.icon;
                const isDelivered = order.status === "delivered";
                const isDisputed = order.status === "disputed";

                return (
                  <div key={order.id} className={`bg-card rounded-2xl border p-5 ${isDisputed ? "border-amber-300" : "border-border"}`}>
                    <div className="flex items-start gap-3 mb-3">
                      {lot?.images?.[0] && (
                        <img src={lot.images[0]} alt={lot.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-semibold text-foreground text-sm line-clamp-1">{lot?.title}</h3>
                        <p className="text-xs text-primary font-medium">{lot?.brand}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5">
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {sc.label}
                        </span>
                        <span className="font-heading font-bold text-foreground text-sm">{Number(order.amount).toLocaleString("fr-FR")} €</span>
                      </div>
                    </div>

                    {order.tracking_number && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {t("legal.orders.tracking")}: <span className="font-mono font-semibold text-foreground">{order.tracking_number}</span>
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {isDelivered && (
                        <button
                          onClick={() => handleConfirmReceipt(order.id)}
                          disabled={confirmingId === order.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="h-3 w-3" />
                          {t("legal.orders.confirmReceipt")}
                        </button>
                      )}
                      {(isDelivered || isDisputed) && (
                        <button
                          onClick={() => navigate(`/messages?with=${order.seller_id}&lot=${order.lot_id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                        >
                          <MessageCircle className="h-3 w-3" />
                          {t("sellerDisputes.contactBuyer")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Profile;
