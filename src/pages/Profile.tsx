import { useState } from "react";
import { ArrowLeft, User, Package, Clock, CheckCircle, Edit2, Save, X, Building2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import varyLogo from "@/assets/vary-logo.png";
import BottomNav from "@/components/BottomNav";
import { canAccessSeller } from "@/lib/auth";

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  country: string;
  companyDescription: string;
}

const mockOrders = [
  { id: "CMD-2026-001", lot: "Mix 1000 pièces vêtements été", brand: "Zara", total: "6 860 €", status: "delivered", date: "5 mars 2026" },
  { id: "CMD-2026-002", lot: "Surplus 800 pièces denim premium", brand: "Levi's", total: "20 170 €", status: "shipped", date: "12 mars 2026" },
  { id: "CMD-2026-003", lot: "Pack 50 sacs à main premium", brand: "Michael Kors", total: "13 150 €", status: "processing", date: "16 mars 2026" },
];

const statusLabels: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  delivered: { label: "Livré", color: "text-green-600 bg-green-50", icon: CheckCircle },
  shipped: { label: "En transit", color: "text-blue-600 bg-blue-50", icon: Package },
  processing: { label: "En préparation", color: "text-amber-600 bg-amber-50", icon: Clock },
};

const Profile = () => {
  const navigate = useNavigate();
  const isSeller = canAccessSeller();
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"profile" | "orders">("profile");
  const [profile, setProfile] = useState<UserProfile>(() => {
    const stored = localStorage.getItem("vary_profile");
    return stored ? JSON.parse(stored) : {
      firstName: "Jean",
      lastName: "Dupont",
      email: "jean.dupont@example.com",
      phone: "+33 6 12 34 56 78",
      company: "Mode & Style SARL",
      address: "12 Rue du Commerce",
      city: "Paris",
      country: "France",
      companyDescription: "Grossiste spécialisé dans la distribution de vêtements de marques premium. Plus de 10 ans d'expérience dans le secteur du textile et de la mode.",
    };
  });
  const [editForm, setEditForm] = useState<UserProfile>(profile);

  const handleSave = () => {
    setProfile(editForm);
    localStorage.setItem("vary_profile", JSON.stringify(editForm));
    setEditing(false);
  };

  const handleCancel = () => {
    setEditForm(profile);
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
        <h1 className="font-heading text-2xl font-bold text-foreground mb-6">Mon compte</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-muted rounded-xl p-1">
          <button
            onClick={() => setTab("profile")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${tab === "profile" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Profil
          </button>
          <button
            onClick={() => setTab("orders")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${tab === "orders" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Commandes
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
                  <h2 className="font-heading font-semibold text-foreground">{profile.firstName} {profile.lastName}</h2>
                  <p className="text-sm text-muted-foreground">{profile.company}</p>
                </div>
              </div>
              {!editing && (
                <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 text-sm text-primary border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors">
                  <Edit2 className="h-4 w-4" />
                  Modifier
                </button>
              )}
            </div>

            <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
              {editing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {(["firstName", "lastName", "email", "phone", "company", "address", "city", "country"] as (keyof UserProfile)[]).map((key) => (
                      <div key={key} className={key === "address" ? "col-span-2" : ""}>
                        <label className="text-xs font-medium text-muted-foreground">
                          {key === "firstName" ? "Prénom" : key === "lastName" ? "Nom" : key === "email" ? "Email" : key === "phone" ? "Téléphone" : key === "company" ? "Entreprise" : key === "address" ? "Adresse" : key === "city" ? "Ville" : "Pays"}
                        </label>
                        <input
                          type={key === "email" ? "email" : "text"}
                          value={editForm[key]}
                          onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                          className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Company description (seller only) */}
                  {isSeller && (
                    <div className="col-span-2 pt-2">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> Description de l'entreprise
                      </label>
                      <p className="text-xs text-muted-foreground mt-0.5 mb-1">Apparaît automatiquement sur chacun de vos lots</p>
                      <Textarea
                        value={editForm.companyDescription}
                        onChange={(e) => setEditForm({ ...editForm, companyDescription: e.target.value })}
                        placeholder="Décrivez votre entreprise..."
                        className="resize-none mt-1"
                        rows={3}
                      />
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary-dark transition-colors text-sm">
                      <Save className="h-4 w-4" /> Enregistrer
                    </button>
                    <button onClick={handleCancel} className="flex items-center gap-2 px-5 py-2.5 border border-border text-foreground rounded-xl hover:bg-muted transition-colors text-sm">
                      <X className="h-4 w-4" /> Annuler
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ["Prénom", profile.firstName],
                      ["Nom", profile.lastName],
                      ["Email", profile.email],
                      ["Téléphone", profile.phone],
                      ["Entreprise", profile.company],
                      ["Adresse", profile.address],
                      ["Ville", profile.city],
                      ["Pays", profile.country],
                    ].map(([label, value]) => (
                      <div key={label} className={label === "Adresse" ? "col-span-2" : ""}>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Company description display (seller only) */}
                  {isSeller && profile.companyDescription && (
                    <div className="border-t border-border pt-4 mt-4">
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                        <Building2 className="h-3 w-3" /> Description de l'entreprise
                      </p>
                      <p className="text-sm text-foreground">{profile.companyDescription}</p>
                      <p className="text-xs text-muted-foreground mt-1">Visible automatiquement sur chacun de vos lots</p>
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
