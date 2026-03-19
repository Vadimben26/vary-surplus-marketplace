import { useState, useEffect } from "react";
import { ArrowLeft, User, Package, Clock, CheckCircle, Edit2, Save, X, Building2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import varyLogo from "@/assets/vary-logo.png";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const mockOrders = [
  { id: "CMD-2026-001", lot: "Mix 1000 pièces vêtements été", brand: "Zara", total: "6 860 €", status: "delivered", date: "5 mars 2026" },
  { id: "CMD-2026-002", lot: "Surplus 800 pièces denim premium", brand: "Levi's", total: "20 170 €", status: "shipped", date: "12 mars 2026" },
  { id: "CMD-2026-003", lot: "Pack 50 sacs à main premium", brand: "Michael Kors", total: "13 150 €", status: "processing", date: "16 mars 2026" },
];

const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, canAccessSeller, updateProfile } = useAuth();
  const isSeller = canAccessSeller();
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"profile" | "orders">("profile");
  const [editForm, setEditForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    company_name: profile?.company_name || "",
    company_description: profile?.company_description || "",
  });

  const statusLabels: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    delivered: { label: t("profile.delivered"), color: "text-green-600 bg-green-50", icon: CheckCircle },
    shipped: { label: t("profile.shipped"), color: "text-blue-600 bg-blue-50", icon: Package },
    processing: { label: t("profile.processing"), color: "text-amber-600 bg-amber-50", icon: Clock },
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
          </motion.div>
        )}

        {tab === "orders" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {mockOrders.map((order) => {
              const status = statusLabels[order.status];
              const StatusIcon = status.icon;
              return (
                <div key={order.id} className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{order.id}</p>
                      <h3 className="font-heading font-semibold text-foreground text-sm mt-0.5">{order.lot}</h3>
                      <p className="text-xs text-primary font-medium">{order.brand}</p>
                    </div>
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {status.label}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{order.date}</span>
                    <span className="font-heading font-bold text-foreground">{order.total}</span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Profile;
