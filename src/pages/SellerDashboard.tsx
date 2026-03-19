import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Package, TrendingUp, Eye, DollarSign, MapPin,
  Edit, Trash2, BarChart3, Clock, CheckCircle2, Upload, X, ShoppingBag
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { mockLots } from "@/data/mockLots";
import { canAccessBuyer, requestDualRole } from "@/lib/auth";
import { toast } from "sonner";

interface SellerLot {
  id: string;
  title: string;
  brand: string;
  price: string;
  units: number;
  location: string;
  category: string;
  image: string;
  status: "active" | "draft" | "sold";
  views: number;
  inquiries: number;
  createdAt: string;
}

const mockSellerLots: SellerLot[] = mockLots.slice(0, 6).map((lot, i) => ({
  ...lot,
  status: i === 0 ? "sold" : i === 5 ? "draft" : "active",
  views: Math.floor(Math.random() * 500) + 50,
  inquiries: Math.floor(Math.random() * 20) + 1,
  createdAt: new Date(Date.now() - Math.random() * 30 * 86400000).toLocaleDateString("fr-FR"),
}));

const statusConfig = {
  active: { label: "Actif", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  draft: { label: "Brouillon", color: "bg-muted text-muted-foreground", icon: Clock },
  sold: { label: "Vendu", color: "bg-primary/10 text-primary", icon: DollarSign },
};

const SellerDashboard = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "draft" | "sold">("all");
  const [lots] = useState<SellerLot[]>(mockSellerLots);

  const stats = {
    totalLots: lots.length,
    activeLots: lots.filter((l) => l.status === "active").length,
    totalViews: lots.reduce((s, l) => s + l.views, 0),
    totalInquiries: lots.reduce((s, l) => s + l.inquiries, 0),
    revenue: "47 500 €",
  };

  const filteredLots = activeTab === "all" ? lots : lots.filter((l) => l.status === activeTab);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-6 pb-24 max-w-[1400px] mx-auto">

        {/* Welcome */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Espace vendeur</h1>
            <p className="text-muted-foreground text-sm mt-1">Gérez vos lots et suivez vos performances</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Ajouter un lot</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Lots actifs", value: stats.activeLots, icon: Package, color: "text-primary" },
            { label: "Vues totales", value: stats.totalViews, icon: Eye, color: "text-blue-500" },
            { label: "Demandes", value: stats.totalInquiries, icon: TrendingUp, color: "text-green-500" },
            { label: "CA total", value: stats.revenue, icon: DollarSign, color: "text-amber-500" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="font-heading text-xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tab filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {(["all", "active", "draft", "sold"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border hover:text-foreground"
              }`}
            >
              {tab === "all" ? "Tous" : statusConfig[tab].label} ({tab === "all" ? lots.length : lots.filter((l) => l.status === tab).length})
            </button>
          ))}
        </div>

        {/* Lots list */}
        <div className="space-y-4">
          {filteredLots.map((lot) => {
            const sc = statusConfig[lot.status];
            const StatusIcon = sc.icon;
            return (
              <motion.div
                key={lot.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border border-border p-4 flex flex-col sm:flex-row gap-4"
              >
                <div className="w-full sm:w-28 h-28 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                  <img src={lot.image} alt={lot.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-primary uppercase">{lot.brand}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${sc.color}`}>
                          <StatusIcon className="h-3 w-3" /> {sc.label}
                        </span>
                      </div>
                      <h3 className="font-heading font-semibold text-foreground text-sm line-clamp-1">{lot.title}</h3>
                    </div>
                    <span className="font-heading font-bold text-foreground whitespace-nowrap">{lot.price}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {lot.units} unités</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {lot.location}</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {lot.views} vues</span>
                    <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /> {lot.inquiries} demandes</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {lot.createdAt}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-muted text-foreground rounded-lg hover:bg-secondary-light transition-colors">
                      <Edit className="h-3 w-3" /> Modifier
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                      <Trash2 className="h-3 w-3" /> Supprimer
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredLots.length === 0 && (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun lot dans cette catégorie.</p>
          </div>
        )}
      </main>

      {/* Add lot modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4"
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl font-bold text-foreground">Ajouter un lot</h2>
                <button onClick={() => setShowAddForm(false)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Titre du lot *</label>
                  <Input placeholder="Ex: Lot de 200 t-shirts Nike" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Marque *</label>
                    <Input placeholder="Nike" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Prix du lot *</label>
                    <Input placeholder="5 000 €" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Nombre d'unités *</label>
                    <Input type="number" placeholder="200" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Localisation *</label>
                    <Input placeholder="Paris, France" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Catégorie *</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                    <option>Vêtements</option>
                    <option>Sneakers</option>
                    <option>Accessoires</option>
                    <option>Sport</option>
                    <option>Beauté</option>
                    <option>Électronique</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Description</label>
                  <Textarea placeholder="Décrivez votre lot en détail..." className="resize-none" rows={3} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Photos du lot</label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/40 transition-colors cursor-pointer">
                    <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Glissez-déposez ou cliquez pour ajouter des images</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG (max 10 Mo par image, jusqu'à 8 photos)</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-3 bg-muted text-foreground font-semibold rounded-xl hover:bg-secondary-light transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-dark transition-colors"
                  >
                    Publier le lot
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default SellerDashboard;
