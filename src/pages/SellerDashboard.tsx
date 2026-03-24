import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Package, DollarSign,
  Edit, Trash2, BarChart3, Clock, CheckCircle2, X, Crown, ImagePlus,
  Heart, ShoppingCart, MessageCircle, User, Lock, Download, FileSpreadsheet, Upload
} from "lucide-react";
import * as XLSX from "xlsx";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface LotItem {
  name: string;
  quantity: number;
  size: string;
  brand: string;
  category: string;
  gender: string;
  reference: string;
  retail_price: number;
  image_url: string;
}

const emptyItem: LotItem = { name: "", quantity: 0, size: "", brand: "", category: "", gender: "", reference: "", retail_price: 0, image_url: "" };

const CATEGORIES = ["clothing", "sneakers", "accessories", "sport", "beauty", "electronics"];

const SellerDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"active" | "draft" | "sold">("active");
  const [showForm, setShowForm] = useState(false);
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedLotId, setExpandedLotId] = useState<string | null>(null);
  const [popover, setPopover] = useState<{ lotId: string; type: "favorite" | "cart" } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setPopover(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Form state
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [units, setUnits] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [lotItems, setLotItems] = useState<LotItem[]>([{ ...emptyItem }]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  const sellerLocation = profile?.company_name
    ? `${profile.company_name}`
    : "";

  // Fetch seller's lots
  const { data: lots = [], isLoading } = useQuery({
    queryKey: ["seller-lots", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("lots")
        .select("*, lot_items(*)")
        .eq("seller_id", profile.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Check if seller is VIP
  const { data: isVipSeller = false } = useQuery({
    queryKey: ["seller-vip-status", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return false;
      const { data } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", profile.id)
        .eq("plan", "seller_vip")
        .eq("status", "active")
        .maybeSingle();
      return !!data;
    },
    enabled: !!profile?.id,
  });

  // Fetch buyer interest (favorites + cart) on seller's lots - only for VIP
  const { data: buyerInterests = [] } = useQuery({
    queryKey: ["buyer-interests", profile?.id, isVipSeller],
    queryFn: async () => {
      if (!profile?.id || !isVipSeller) return [];
      // Get favorites on my lots
      const { data: favs } = await supabase
        .from("favorites")
        .select("lot_id, user_id, profiles!favorites_user_id_fkey(id, full_name, company_name)")
        .in("lot_id", lots.map((l: any) => l.id));
      // Get cart items on my lots
      const { data: carts } = await supabase
        .from("cart_items")
        .select("lot_id, user_id, profiles!cart_items_user_id_fkey(id, full_name, company_name)")
        .in("lot_id", lots.map((l: any) => l.id));
      return [...(favs || []).map((f: any) => ({ ...f, type: "favorite" })), ...(carts || []).map((c: any) => ({ ...c, type: "cart" }))];
    },
    enabled: !!profile?.id && isVipSeller && lots.length > 0,
  });

  // Group interests by lot
  const interestsByLot = (buyerInterests as any[]).reduce((acc: Record<string, any[]>, item: any) => {
    if (!acc[item.lot_id]) acc[item.lot_id] = [];
    // Deduplicate by user_id + type
    const exists = acc[item.lot_id].find((i: any) => i.user_id === item.user_id && i.type === item.type);
    if (!exists) acc[item.lot_id].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const filteredLots = lots.filter((l: any) => l.status === activeTab);

  const statusConfig = {
    active: { label: t("sellerDashboard.active"), color: "bg-green-100 text-green-700", icon: CheckCircle2 },
    draft: { label: t("sellerDashboard.draft"), color: "bg-muted text-muted-foreground", icon: Clock },
    sold: { label: t("sellerDashboard.sold"), color: "bg-primary/10 text-primary", icon: DollarSign },
  };

  const resetForm = () => {
    setTitle(""); setPrice(""); setRetailPrice(""); setUnits("");
    setCategories([]); setDescription("");
    setLotItems([{ ...emptyItem }]);
    setPhotos([]); setExistingImages([]);
    setEditingLotId(null);
  };

  const openAdd = () => { resetForm(); setShowForm(true); };

  const openEdit = (lot: any) => {
    setEditingLotId(lot.id);
    setTitle(lot.title);
    setPrice(String(lot.price));
    const rv = (lot.lot_items || []).reduce((s: number, it: any) => s + (it.retail_price || 0) * (it.quantity || 0), 0);
    setRetailPrice(rv > 0 ? String(rv) : "");
    setUnits(String(lot.units));
    setCategories(lot.category ? lot.category.split(",").map((c: string) => c.trim()) : []);
    setDescription(lot.description || "");
    setExistingImages(lot.images || []);
    setPhotos([]);
    const items = lot.lot_items?.length
      ? lot.lot_items.map((it: any) => ({
          name: it.name,
          quantity: it.quantity,
          size: it.size || "",
          brand: it.brand || "",
          category: it.category || "",
          gender: it.gender || "",
          reference: it.reference || "",
          retail_price: it.retail_price || 0,
          image_url: it.image_url || "",
        }))
      : [{ ...emptyItem }];
    setLotItems(items);
    setShowForm(true);
  };

  const uploadImages = async (files: File[], lotId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${profile!.id}/${lotId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("lot-images").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("lot-images").getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("No profile");
      const totalPhotos = photos.length + existingImages.length;
      if (totalPhotos < 4) {
        throw new Error(t("sellerDashboard.need4Photos"));
      }
      const validItems = lotItems.filter(it => it.name.trim());
      if (validItems.length === 0) {
        throw new Error(t("sellerDashboard.needItems"));
      }
      const brandName = profile?.company_name || "—";
      if (!title || !price) {
        throw new Error(t("sellerDashboard.fillRequired"));
      }

      if (editingLotId) {
        // Upload new photos
        let allImages = [...existingImages];
        if (photos.length > 0) {
          const newUrls = await uploadImages(photos, editingLotId);
          allImages = [...allImages, ...newUrls];
        }
        const { error } = await supabase.from("lots").update({
          title, brand: brands, price: parseFloat(price),
          units: parseInt(units) || 0,
          category: categories.join(", "),
          description,
          images: allImages,
        }).eq("id", editingLotId);
        if (error) throw error;

        // Update lot items
        await supabase.from("lot_items").delete().eq("lot_id", editingLotId);
        if (validItems.length > 0) {
          const { error: itemErr } = await supabase.from("lot_items").insert(
            validItems.map(it => ({ lot_id: editingLotId, name: it.name, quantity: it.quantity, size: it.size, brand: it.brand, category: it.category, gender: it.gender, reference: it.reference, retail_price: it.retail_price || null, image_url: it.image_url || null }))
          );
          if (itemErr) throw itemErr;
        }
      } else {
        // Create lot
        const { data: newLot, error } = await supabase.from("lots").insert({
          seller_id: profile.id, title, brand: brands,
          price: parseFloat(price), units: parseInt(units) || 0,
          category: categories.join(", "), description,
          status: "active",
          images: [],
        }).select().single();
        if (error) throw error;

        // Upload photos
        const urls = await uploadImages(photos, newLot.id);
        await supabase.from("lots").update({ images: urls }).eq("id", newLot.id);

        // Insert items
        if (validItems.length > 0) {
          await supabase.from("lot_items").insert(
            validItems.map(it => ({ lot_id: newLot.id, name: it.name, quantity: it.quantity, size: it.size, brand: it.brand, category: it.category, gender: it.gender, reference: it.reference, retail_price: it.retail_price || null, image_url: it.image_url || null }))
          );
        }
      }
    },
    onSuccess: () => {
      toast.success(editingLotId ? t("sellerDashboard.lotModified") : t("sellerDashboard.lotPublished"));
      setShowForm(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["seller-lots"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("lot_items").delete().eq("lot_id", id);
      const { error } = await supabase.from("lots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("sellerDashboard.lotDeleted"));
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ["seller-lots"] });
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const toggleCategory = (cat: string) => {
    setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const updateItem = (idx: number, field: keyof LotItem, value: string | number) => {
    setLotItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const downloadTemplate = useCallback(() => {
    const headers = [
      { Marque: "", Article: "", Catégorie: "", Genre: "", Taille: "", "Réf.": "", Qté: "", "Prix retail": "", Photo: "" }
    ];
    const ws = XLSX.utils.json_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventaire");
    ws["!cols"] = Object.keys(headers[0]).map(k => ({ wch: Math.max(k.length, 14) }));
    XLSX.writeFile(wb, "template_inventaire.xlsx");
  }, []);

  const handleExcelUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);
        if (rows.length === 0) { toast.error(t("sellerDashboard.excelEmpty")); return; }
        const parsed: LotItem[] = rows.map(r => ({
          name: String(r["Article"] || r["article"] || r["Name"] || r["name"] || ""),
          brand: String(r["Marque"] || r["marque"] || r["Brand"] || r["brand"] || ""),
          category: String(r["Catégorie"] || r["catégorie"] || r["Category"] || r["category"] || ""),
          gender: String(r["Genre"] || r["genre"] || r["Gender"] || r["gender"] || ""),
          size: String(r["Taille"] || r["taille"] || r["Size"] || r["size"] || ""),
          reference: String(r["Réf."] || r["réf."] || r["Ref"] || r["ref"] || r["Reference"] || ""),
          quantity: Number(r["Qté"] || r["qté"] || r["Qty"] || r["qty"] || r["Quantity"] || 0),
          retail_price: Number(r["Prix retail"] || r["prix retail"] || r["Retail Price"] || r["retail_price"] || 0),
          image_url: String(r["Photo"] || r["photo"] || r["Image"] || r["image_url"] || ""),
        })).filter(it => it.name.trim());
        if (parsed.length === 0) { toast.error(t("sellerDashboard.excelNoItems")); return; }
        setLotItems(parsed);
        // Auto-compute units
        const totalUnits = parsed.reduce((s, it) => s + it.quantity, 0);
        if (totalUnits > 0) setUnits(String(totalUnits));
        toast.success(t("sellerDashboard.excelImported", { count: parsed.length }));
      } catch {
        toast.error(t("sellerDashboard.excelError"));
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }, [t]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setPhotos(prev => [...prev, ...newFiles].slice(0, 8));
    }
  };

  const removePhoto = (idx: number) => setPhotos(prev => prev.filter((_, i) => i !== idx));
  const removeExistingImage = (idx: number) => setExistingImages(prev => prev.filter((_, i) => i !== idx));

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-6 pb-24 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground">
              {profile?.full_name
                ? `${t("marketplace.welcome", { name: profile.full_name.split(" ")[0] })} 👋`
                : t("sellerDashboard.title")}
            </h1>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("sellerDashboard.addLot")}</span>
          </button>
        </div>

        {/* Stats - blurred with VIP upsell OR visible for VIP */}
        <div className="relative mb-8">
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4${!isVipSeller ? " blur-[6px] select-none pointer-events-none" : ""}`} aria-hidden={!isVipSeller}>
            {[
              { label: t("sellerDashboard.activeLots"), value: lots.filter((l: any) => l.status === "active").length, icon: Package, color: "text-primary" },
              { label: t("sellerDashboard.totalFavorites"), value: (buyerInterests as any[]).filter((i: any) => i.type === "favorite").length, icon: Heart, color: "text-destructive" },
              { label: t("sellerDashboard.totalCarts"), value: (buyerInterests as any[]).filter((i: any) => i.type === "cart").length, icon: ShoppingCart, color: "text-green-500" },
              { label: t("sellerDashboard.totalRevenue"), value: "— €", icon: DollarSign, color: "text-amber-500" },
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
          {!isVipSeller && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => navigate("/seller/vip")}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg hover:bg-primary/90 transition-colors"
              >
                <Crown className="h-4 w-4" />
                {t("sellerDashboard.vipUnlock")}
              </button>
            </div>
          )}
        </div>

        {/* Tab filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {(["active", "draft", "sold"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border hover:text-foreground"
              }`}
            >
              {statusConfig[tab].label} ({lots.filter((l: any) => l.status === tab).length})
            </button>
          ))}
        </div>

        {/* Lots grid - same style as marketplace */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">{t("common.loading")}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {filteredLots.map((lot: any) => {
              const sc = statusConfig[lot.status as keyof typeof statusConfig];
              const StatusIcon = sc.icon;
              const lotImage = lot.images?.[0];
              const totalTTC = Math.round(lot.price * 1.19);
              const ppu = lot.units > 0 ? (lot.price * 1.19 / lot.units).toFixed(2) : null;
              const retailValue = (lot.lot_items || []).reduce(
                (sum: number, item: any) => sum + (item.retail_price || 0) * (item.quantity || 0), 0
              );
              const discount = retailValue > 0 ? Math.round((1 - lot.price / retailValue) * 100) : 0;

              return (
                <motion.div
                  key={lot.id}
                  className="group"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Image */}
                  <div
                    className="relative aspect-square rounded-xl overflow-hidden bg-muted mb-3 cursor-pointer"
                    onClick={() => setExpandedLotId(expandedLotId === lot.id ? null : lot.id)}
                  >
                    {lotImage ? (
                      <img src={lotImage} alt={lot.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    {/* Status badge */}
                    <span className={`absolute top-3 left-3 px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 ${sc.color}`}>
                      <StatusIcon className="h-3 w-3" /> {sc.label}
                    </span>
                    {/* Discount badge */}
                    {discount > 0 && (
                      <span className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold bg-green-600 text-white">
                        -{discount}%
                      </span>
                    )}
                    {/* VIP interest indicators */}
                    {isVipSeller && (() => {
                      const favCount = (interestsByLot[lot.id] || []).filter((i: any) => i.type === "favorite").length;
                      const cartCount = (interestsByLot[lot.id] || []).filter((i: any) => i.type === "cart").length;
                      if (favCount === 0 && cartCount === 0) return null;
                      return (
                        <div className="absolute top-3 right-3 flex flex-col gap-1">
                          {favCount > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setPopover(popover?.lotId === lot.id && popover?.type === "favorite" ? null : { lotId: lot.id, type: "favorite" }); }}
                              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold bg-card/90 backdrop-blur-sm text-destructive"
                            >
                              <Heart className="h-3 w-3 fill-destructive" /> {favCount}
                            </button>
                          )}
                          {cartCount > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setPopover(popover?.lotId === lot.id && popover?.type === "cart" ? null : { lotId: lot.id, type: "cart" }); }}
                              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold bg-card/90 backdrop-blur-sm text-primary"
                            >
                              <ShoppingCart className="h-3 w-3" /> {cartCount}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                    {/* Popover for interests */}
                    {popover?.lotId === lot.id && (
                      <div ref={popoverRef} className="absolute top-12 right-3 z-50 w-56 bg-card border border-border rounded-xl shadow-lg p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          {popover.type === "favorite" ? "Favoris" : "Panier"}
                        </p>
                        {(interestsByLot[lot.id] || []).filter((i: any) => i.type === popover.type).map((interest: any, idx: number) => {
                          const bp = interest.profiles;
                          return (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setPopover(null); navigate(`/messages?with=${bp?.id}&lot=${lot.id}`); }}
                            >
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <User className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{bp?.company_name || bp?.full_name || "Acheteur"}</p>
                              </div>
                              <MessageCircle className="h-3.5 w-3.5 text-primary" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Card body - same as marketplace LotCard */}
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">{lot.brand}</span>
                    <h3 className="font-heading font-semibold text-foreground text-sm leading-snug line-clamp-2">{lot.title}</h3>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1 text-xs">
                        <Package className="h-3 w-3" />
                        {lot.units} pcs
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="font-heading font-bold text-foreground">{totalTTC.toLocaleString("fr-FR")} €</span>
                      {ppu && (
                        <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {ppu} €/pc
                        </span>
                      )}
                    </div>
                    {/* Seller action buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => openEdit(lot)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
                      >
                        <Edit className="h-3 w-3" /> {t("sellerDashboard.editLot")}
                      </button>
                      <button
                        onClick={() => setDeletingId(lot.id)}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  <AnimatePresence>
                    {expandedLotId === lot.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden mt-3"
                      >
                        <div className="border-t border-border pt-3 space-y-3">
                          {lot.images?.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto">
                              {lot.images.map((img: string, i: number) => (
                                <img key={i} src={img} alt={`${lot.title} ${i + 1}`} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                              ))}
                            </div>
                          )}
                          {lot.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed">{lot.description}</p>
                          )}
                          {lot.lot_items?.length > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{t("lotDetail.lotContent")}</p>
                              <div className="space-y-1">
                                {lot.lot_items.map((item: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between py-1 px-2 bg-muted/50 rounded text-xs">
                                    <span className="text-foreground">{item.name} {item.size && <span className="text-muted-foreground">({item.size})</span>}</span>
                                    <span className="font-semibold text-primary">{item.quantity} pcs</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {isVipSeller && interestsByLot[lot.id]?.length > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{t("sellerDashboard.buyerInterest")}</p>
                              <div className="space-y-1">
                                {interestsByLot[lot.id].map((interest: any, idx: number) => {
                                  const buyerProfile = interest.profiles;
                                  const isFav = interest.type === "favorite";
                                  return (
                                    <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <User className="h-3 w-3 text-primary" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-foreground truncate">{buyerProfile?.company_name || buyerProfile?.full_name || "Acheteur"}</p>
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                          {isFav ? <><Heart className="h-2.5 w-2.5 text-destructive fill-destructive" /> Favori</> : <><ShoppingCart className="h-2.5 w-2.5 text-primary" /> Panier</>}
                                        </p>
                                      </div>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); navigate(`/messages?with=${buyerProfile?.id}&lot=${lot.id}`); }}
                                        className="p-1.5 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                                      >
                                        <MessageCircle className="h-3 w-3" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {!isVipSeller && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate("/seller/vip"); }}
                              className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                            >
                              <Lock className="h-3 w-3" />
                              {t("sellerDashboard.vipBuyerInsight")}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {!isLoading && filteredLots.length === 0 && (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t("sellerDashboard.noLots")}</p>
          </div>
        )}
      </main>

      {/* Add/Edit lot modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl font-bold text-foreground">
                  {editingLotId ? t("sellerDashboard.editLotTitle") : t("sellerDashboard.addLotTitle")}
                </h2>
                <button onClick={() => setShowForm(false)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">{t("sellerDashboard.lotTitle")} *</label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Lot de 200 t-shirts Nike" />
                </div>

                {/* Brand + Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("sellerDashboard.brands")} *</label>
                    <Input value={brands} onChange={e => setBrands(e.target.value)} placeholder="Nike, Adidas" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("sellerDashboard.lotPrice")} *</label>
                    <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="5000" />
                  </div>
                </div>

                {/* Units */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">{t("sellerDashboard.numberOfUnits")} *</label>
                  <Input type="number" value={units} onChange={e => setUnits(e.target.value)} placeholder="200" />
                </div>

                {/* Categories (multi-select chips) */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">{t("sellerDashboard.categories_label")} *</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(c => {
                      const label = t(`sellerDashboard.categories.${c}`);
                      const selected = categories.includes(label);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleCategory(label)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">{t("sellerDashboard.description")}</label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t("sellerDashboard.describeLot")} className="resize-none" rows={3} />
                </div>

                {/* Lot content / Excel upload */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground">{t("sellerDashboard.lotContent")} *</label>

                  {/* Template download + Excel upload buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-muted text-foreground font-medium rounded-xl hover:bg-muted/80 transition-colors text-sm"
                    >
                      <Download className="h-4 w-4" />
                      {t("sellerDashboard.downloadTemplate")}
                    </button>
                    <label className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors text-sm cursor-pointer">
                      <Upload className="h-4 w-4" />
                      {t("sellerDashboard.uploadExcel")}
                      <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} />
                    </label>
                  </div>

                  {/* Preview of imported items */}
                  {lotItems.length > 0 && lotItems[0].name && (
                    <div className="bg-muted/50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-primary" />
                          <span className="text-xs font-semibold text-foreground">
                            {lotItems.filter(it => it.name.trim()).length} {t("sellerDashboard.references")}
                          </span>
                        </div>
                        <button type="button" onClick={() => setLotItems([{ ...emptyItem }])} className="text-xs text-destructive hover:underline">
                          {t("sellerDashboard.clearItems")}
                        </button>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {lotItems.filter(it => it.name.trim()).slice(0, 20).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1.5 px-2 bg-card rounded text-xs">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-foreground font-medium truncate">{item.name}</span>
                              {item.brand && <span className="text-primary text-[10px] uppercase">{item.brand}</span>}
                              {item.size && <span className="text-muted-foreground">({item.size})</span>}
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="font-semibold text-foreground">{item.quantity} pcs</span>
                              {item.retail_price > 0 && <span className="text-muted-foreground">{item.retail_price} €</span>}
                            </div>
                          </div>
                        ))}
                        {lotItems.filter(it => it.name.trim()).length > 20 && (
                          <p className="text-[10px] text-muted-foreground text-center pt-1">
                            +{lotItems.filter(it => it.name.trim()).length - 20} {t("sellerDashboard.moreItems")}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Photos (4 required) */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    {t("sellerDashboard.lotPhotos")} * <span className="text-xs font-normal text-muted-foreground">({t("sellerDashboard.min4Photos")})</span>
                  </label>
                  {/* Existing images */}
                  {existingImages.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {existingImages.map((url, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeExistingImage(idx)} className="absolute top-0.5 right-0.5 bg-foreground/70 text-background rounded-full p-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* New photo previews */}
                  {photos.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {photos.map((file, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                          <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removePhoto(idx)} className="absolute top-0.5 right-0.5 bg-foreground/70 text-background rounded-full p-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/40 transition-colors cursor-pointer block">
                    <ImagePlus className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                    <p className="text-sm text-muted-foreground">{t("sellerDashboard.dragDrop")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("sellerDashboard.photoFormat")}</p>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {photos.length + existingImages.length}/4 {t("sellerDashboard.photosMin")}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-3 bg-muted text-foreground font-semibold rounded-xl hover:bg-muted/80 transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="flex-1 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saveMutation.isPending ? t("common.loading") : editingLotId ? t("common.save") : t("sellerDashboard.publishLot")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deletingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4"
            onClick={() => setDeletingId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm text-center"
              onClick={e => e.stopPropagation()}
            >
              <Trash2 className="h-10 w-10 text-destructive mx-auto mb-3" />
              <h3 className="font-heading font-bold text-foreground mb-1">{t("sellerDashboard.deleteLotTitle")}</h3>
              <p className="text-sm text-muted-foreground mb-6">{t("sellerDashboard.deleteIrreversible")}</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingId(null)} className="flex-1 py-2.5 bg-muted text-foreground font-medium rounded-xl">
                  {t("common.cancel")}
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deletingId)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 py-2.5 bg-destructive text-destructive-foreground font-medium rounded-xl disabled:opacity-50"
                >
                  {t("common.delete")}
                </button>
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
