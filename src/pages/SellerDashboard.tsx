import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Package, DollarSign, MapPin,
  Edit, Trash2, BarChart3, Clock, CheckCircle2, X, Crown, ImagePlus,
  Heart, ShoppingCart, MessageCircle, User, Lock, FileSpreadsheet, Layers, CreditCard, AlertTriangle
} from "lucide-react";
import ShippingReachPanel from "@/components/seller/ShippingReachPanel";
import SellerApprovalBanner from "@/components/seller/SellerApprovalBanner";
import { useSellerApproval } from "@/hooks/useSellerApproval";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import LotPhotosUploader, {
  emptyPhotosState,
  countRequiredFilled,
  ALL_SLOTS,
  SLOT_META,
  type LotPhotosState,
} from "@/components/seller/LotPhotosUploader";

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

const CATEGORIES = ["clothing", "sneakers", "accessories"];

const SellerDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { isApproved: sellerIsApproved } = useSellerApproval();

  const [activeTab, setActiveTab] = useState<"active" | "draft" | "sold">("active");
  const [showForm, setShowForm] = useState(false);
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedLotId, setExpandedLotId] = useState<string | null>(null);
  const [popover, setPopover] = useState<{ lotId: string; type: "favorite" | "cart" } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{ chargesEnabled: boolean; detailsSubmitted: boolean } | null>(null);

  // Handle Stripe Connect onboarding return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeParam = params.get("stripe");
    if (!stripeParam) return;

    if (stripeParam === "refresh") {
      toast.error("La configuration n'a pas été complétée — réessayez.");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (stripeParam === "success") {
      (async () => {
        const { data } = await supabase.functions.invoke("check-stripe-connect-status");
        if (data) {
          setStripeStatus({ chargesEnabled: !!data.chargesEnabled, detailsSubmitted: !!data.detailsSubmitted });
          if (data.chargesEnabled) {
            toast.success("Compte de paiement configuré — vous pouvez recevoir des paiements !");
          } else {
            toast.message("Configuration en cours de vérification par Stripe.");
          }
        }
        window.history.replaceState({}, "", window.location.pathname);
      })();
    }
  }, []);

  // Initial Stripe status check
  useEffect(() => {
    if (!profile?.id) return;
    if (!profile.stripe_account_id) {
      setStripeStatus({ chargesEnabled: false, detailsSubmitted: false });
      return;
    }
    (async () => {
      const { data } = await supabase.functions.invoke("check-stripe-connect-status");
      if (data) setStripeStatus({ chargesEnabled: !!data.chargesEnabled, detailsSubmitted: !!data.detailsSubmitted });
    })();
  }, [profile?.id, (profile as any)?.stripe_account_id]);

  const handleStripeConnect = async () => {
    setStripeConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-stripe-connect-account");
      if (error || !data?.url) {
        toast.error("Impossible de démarrer la configuration Stripe.");
        return;
      }
      window.location.href = data.url;
    } finally {
      setStripeConnecting(false);
    }
  };

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
  const [pallets, setPallets] = useState("1");
  const [categories, setCategories] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [lotItems, setLotItems] = useState<LotItem[]>([{ ...emptyItem }]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  // Structured photos state — 9 numbered slots (6 required + 3 optional)
  const [slotPhotos, setSlotPhotos] = useState<LotPhotosState>(emptyPhotosState());
  // Working lot id used to scope uploads to a stable storage path. For new
  // lots we pre-create a draft so we can persist photos as the seller picks them.
  const [workingLotId, setWorkingLotId] = useState<string | null>(null);
  const [creatingDraft, setCreatingDraft] = useState(false);

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

  // Fetch seller preferences (for auto location)
  const { data: sellerPrefs } = useQuery({
    queryKey: ["seller-prefs", profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return null;
      const { data } = await supabase
        .from("seller_preferences")
        .select("warehouse_location, country, city, pickup_country")
        .eq("user_id", profile.user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.user_id,
  });

  const autoLocation = sellerPrefs?.warehouse_location || sellerPrefs?.city || sellerPrefs?.country || "";
  // Country used for shipping cost calculation (must match a row in shipping_routes.origin_country).
  const originCountry = sellerPrefs?.pickup_country || sellerPrefs?.country || "";

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

  // Fetch seller rating (public profile rating + count)
  const { data: sellerRating } = useQuery({
    queryKey: ["seller-rating-dashboard", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return { average_rating: 0, review_count: 0 };
      const { data } = await (supabase as any).rpc("get_seller_rating", { seller_profile_id: profile.id });
      const row = Array.isArray(data) ? data[0] : data;
      return {
        average_rating: Number(row?.average_rating) || 0,
        review_count: Number(row?.review_count) || 0,
      };
    },
    enabled: !!profile?.id,
  });

  // Active disputes count for this seller
  const { data: activeDisputesCount = 0 } = useQuery({
    queryKey: ["seller-active-disputes", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const { count } = await (supabase as any)
        .from("disputes")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", profile.id)
        .in("status", ["open", "admin_review"]);
      return count || 0;
    },
    enabled: !!profile?.id,
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
    setTitle(""); setPrice(""); setRetailPrice(""); setUnits(""); setPallets("1");
    setCategories([]); setDescription("");
    setLotItems([{ ...emptyItem }]);
    setPhotos([]); setExistingImages([]);
    setSlotPhotos(emptyPhotosState());
    setWorkingLotId(null);
    setEditingLotId(null);
  };

  // Pre-create a draft lot so that photos uploaded during the form session
  // can be scoped to a stable lot_id and persisted in the lot_photos table.
  const openAdd = async () => {
    resetForm();
    if (!profile?.id) {
      toast.error(t("common.loading"));
      return;
    }
    setCreatingDraft(true);
    try {
      const brandName = profile?.company_name || "—";
      const { data, error } = await supabase
        .from("lots")
        .insert({
          seller_id: profile.id,
          title: t("sellerDashboard.draftPlaceholderTitle", "Brouillon en cours"),
          brand: brandName,
          price: 0,
          units: 0,
          pallets: 1,
          category: "",
          description: "",
          location: autoLocation,
          status: "draft",
          images: [],
        })
        .select()
        .single();
      if (error) throw error;
      setWorkingLotId(data.id);
      setShowForm(true);
    } catch (err: any) {
      toast.error(err?.message || "Erreur");
    } finally {
      setCreatingDraft(false);
    }
  };

  const openEdit = async (lot: any) => {
    setEditingLotId(lot.id);
    setWorkingLotId(lot.id);
    setTitle(lot.title);
    setPrice(String(lot.price));
    const rv = (lot.lot_items || []).reduce((s: number, it: any) => s + (it.retail_price || 0) * (it.quantity || 0), 0);
    setRetailPrice(rv > 0 ? String(rv) : "");
    setUnits(String(lot.units));
    setPallets(String(lot.pallets || 1));
    setCategories(lot.category ? lot.category.split(",").map((c: string) => c.trim()) : []);

    setDescription(lot.description || "");
    setExistingImages(lot.images || []);
    setPhotos([]);

    // Load structured photos from lot_photos
    const { data: existingPhotos } = await supabase
      .from("lot_photos")
      .select("photo_number, url, media_type, is_required")
      .eq("lot_id", lot.id);
    const next = emptyPhotosState();
    (existingPhotos || []).forEach((p: any) => {
      if (p.photo_number >= 1 && p.photo_number <= 9) {
        next[p.photo_number] = {
          url: p.url,
          mediaType: p.media_type === "video" ? "video" : "photo",
          isRequired: !!p.is_required,
        };
      }
    });
    setSlotPhotos(next);

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
      if (!workingLotId) throw new Error("No working lot");
      const requiredFilled = countRequiredFilled(slotPhotos);
      if (requiredFilled < 6) {
        throw new Error(t("lotPhotos.blockedPublish", "Les 6 photos obligatoires doivent être téléversées avant publication."));
      }
      const validItems = lotItems.filter(it => it.name.trim());
      if (validItems.length === 0) {
        throw new Error(t("sellerDashboard.needItems"));
      }
      const brandName = profile?.company_name || "—";
      if (!title || !price) {
        throw new Error(t("sellerDashboard.fillRequired"));
      }

      // Build legacy images array from slot photos (photos only, ordered).
      const orderedImages = ALL_SLOTS
        .map((n) => slotPhotos[n])
        .filter((s): s is NonNullable<typeof s> => !!s && s.mediaType === "photo")
        .map((s) => s.url);

      const desiredStatus = editingLotId
        ? undefined // keep current status when editing
        : (sellerIsApproved ? "active" : "draft");

      const updatePayload: any = {
        title,
        brand: brandName,
        price: parseFloat(price),
        units: parseInt(units) || 0,
        pallets: Math.max(1, parseInt(pallets) || 1),
        category: categories.join(", "),
        location: autoLocation,
        description,
        images: orderedImages,
      };
      if (desiredStatus) updatePayload.status = desiredStatus;

      const { error } = await supabase.from("lots").update(updatePayload).eq("id", workingLotId);
      if (error) throw error;

      // Replace lot items
      await supabase.from("lot_items").delete().eq("lot_id", workingLotId);
      if (validItems.length > 0) {
        const { error: itemErr } = await supabase.from("lot_items").insert(
          validItems.map(it => ({
            lot_id: workingLotId, name: it.name, quantity: it.quantity, size: it.size,
            brand: it.brand, category: it.category, gender: it.gender, reference: it.reference,
            retail_price: it.retail_price || null, image_url: it.image_url || null,
          }))
        );
        if (itemErr) throw itemErr;
      }

      // Fire-and-forget: notify matching buyers if lot was published active
      if (!editingLotId && sellerIsApproved) {
        supabase.functions.invoke("match-lot-to-buyers", {
          body: { lotId: workingLotId },
        }).catch((e) => console.warn("match-lot-to-buyers failed:", e));
      }
    },
    onSuccess: () => {
      const successMsg = editingLotId
        ? t("sellerDashboard.lotModified")
        : sellerIsApproved
          ? t("sellerDashboard.lotPublished")
          : t("sellerDashboard.lotSavedAsDraft", "Lot enregistré en brouillon. Il sera publié dès que votre profil vendeur sera validé.");
      toast.success(successMsg);
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

  const addItemRow = () => setLotItems(prev => [...prev, { ...emptyItem }]);
  const removeItemRow = (idx: number) => setLotItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

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
        <SellerApprovalBanner />

        {/* Stripe Connect onboarding banner */}
        {stripeStatus && !stripeStatus.chargesEnabled && (
          <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">
                  Configurez votre compte de paiement pour recevoir vos fonds
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {stripeStatus.detailsSubmitted
                    ? "Votre compte est en cours de vérification par Stripe."
                    : "Sans compte Stripe Connect, les acheteurs ne pourront pas finaliser leurs commandes sur vos lots."}
                </p>
              </div>
            </div>
            <button
              onClick={handleStripeConnect}
              disabled={stripeConnecting}
              className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {stripeConnecting ? "Redirection…" : "Configurer maintenant"}
            </button>
          </div>
        )}

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

        {/* Public seller rating + active disputes */}
        {profile?.id && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl border border-border p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl text-amber-500 leading-none tracking-tight" aria-label={`${sellerRating?.average_rating ?? 0}/5`}>
                  {Array.from({ length: 5 }).map((_, i) =>
                    i < Math.round(sellerRating?.average_rating || 0) ? "★" : "☆"
                  ).join("")}
                </span>
                <div>
                  <p className="font-heading text-xl font-bold text-foreground">
                    {(sellerRating?.review_count ?? 0) > 0
                      ? (sellerRating?.average_rating ?? 0).toFixed(1)
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sellerRating?.review_count ?? 0} avis acheteurs
                  </p>
                </div>
              </div>
              <a
                href={`/vendeur/${profile.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Voir mon profil public →
              </a>
            </div>

            <button
              onClick={() => navigate("/seller/suivi")}
              className={`text-left bg-card rounded-2xl border p-4 flex items-center justify-between gap-3 transition-colors hover:bg-muted/30 ${
                (activeDisputesCount ?? 0) > 0 ? "border-destructive/40" : "border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className={`h-5 w-5 ${(activeDisputesCount ?? 0) > 0 ? "text-destructive" : "text-green-600"}`} />
                <div>
                  <p className={`font-heading text-xl font-bold ${(activeDisputesCount ?? 0) > 0 ? "text-destructive" : "text-foreground"}`}>
                    {activeDisputesCount ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(activeDisputesCount ?? 0) > 0 ? "Litiges actifs" : "Aucun litige en cours"}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-primary">Voir →</span>
            </button>
          </div>
        )}

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
                      {lot.location && (
                        <span className="flex items-center gap-1 text-xs">
                          <MapPin className="h-3 w-3" />
                          {lot.location}
                        </span>
                      )}
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

      {/* Add/Edit lot — full-page layout mirroring the buyer LotDetail */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background overflow-y-auto"
          >
            {/* Header */}
            <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
              <div className="flex items-center justify-between px-4 md:px-8 h-14 max-w-6xl mx-auto">
                <button onClick={() => setShowForm(false)} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
                  <X className="h-5 w-5" />
                  <span className="text-sm font-medium hidden sm:inline">{t("common.cancel")}</span>
                </button>
                <h2 className="font-heading text-base font-bold text-foreground">
                  {editingLotId ? t("sellerDashboard.editLotTitle") : t("sellerDashboard.addLotTitle")}
                </h2>
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="px-4 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
                >
                  {saveMutation.isPending ? t("common.loading") : editingLotId ? t("common.save") : t("sellerDashboard.publishLot")}
                </button>
              </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 md:px-8 py-4 pb-24">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

                {/* LEFT COL — Photos (mirrors LotDetail image area) */}
                <div className="md:col-span-4 space-y-3">
                  {/* Main photo preview */}
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-muted">
                    {(existingImages.length > 0 || photos.length > 0) ? (
                      <img
                        src={existingImages[0] || (photos[0] ? URL.createObjectURL(photos[0]) : "")}
                        alt="Aperçu"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                        <ImagePlus className="h-10 w-10 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium text-muted-foreground">{t("sellerDashboard.dragDrop")}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t("sellerDashboard.photoFormat")}</p>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
                      </label>
                    )}
                  </div>

                  {/* Thumbnails row */}
                  <div className="flex gap-1.5">
                    {existingImages.map((url, idx) => (
                      <div key={`ex-${idx}`} className="relative flex-1 aspect-square rounded-lg overflow-hidden border-2 border-primary/20">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeExistingImage(idx)} className="absolute top-0.5 right-0.5 bg-foreground/70 text-background rounded-full p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {photos.map((file, idx) => (
                      <div key={`new-${idx}`} className="relative flex-1 aspect-square rounded-lg overflow-hidden border-2 border-primary/20">
                        <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removePhoto(idx)} className="absolute top-0.5 right-0.5 bg-foreground/70 text-background rounded-full p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {/* Add more button */}
                    {(existingImages.length + photos.length) < 8 && (
                      <label className="flex-1 aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/40 transition-colors">
                        <ImagePlus className="h-5 w-5 text-muted-foreground" />
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {photos.length + existingImages.length}/4 {t("sellerDashboard.photosMin")}
                  </p>

                  {/* Seller info block (auto, read-only) */}
                  {profile && (
                    <div className="flex items-start gap-2.5 p-3 bg-muted rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{profile.company_name || profile.full_name || "Vendeur"}</p>
                        {profile.company_description && (
                          <p className="text-[10px] text-muted-foreground leading-snug mt-1">{profile.company_description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1 italic">{t("sellerDashboard.autoProfileNote")}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* CENTER COL — Details (mirrors LotDetail center) */}
                <div className="md:col-span-5 space-y-4">
                  {/* Brand (auto from profile - read only) */}
                  <div>
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                      {profile?.company_name || "—"}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t("sellerDashboard.brandAutoNote", "Marque automatique depuis votre profil")}</p>
                  </div>

                  {/* Title */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("sellerDashboard.lotTitle")} *</label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Lot de 200 t-shirts" className="font-heading font-bold text-lg border-none bg-muted/50 px-3 py-2 rounded-lg" />
                  </div>

                  {/* Categories (chips) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("sellerDashboard.categories_label")} *</label>
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

                  {/* Location (auto from profile - read only) */}
                  {autoLocation && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground">{autoLocation}</span>
                      <span className="text-[10px] text-muted-foreground italic ml-auto">{t("sellerDashboard.autoProfileNote")}</span>
                    </div>
                  )}

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("sellerDashboard.description")}</label>
                    <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t("sellerDashboard.describeLot")} className="resize-none bg-muted/50 border-none rounded-lg" rows={4} />
                  </div>

                  {/* Inline editable inventory table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {t("sellerDashboard.lotContent")} *
                      </label>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">
                          {lotItems.filter(it => it.name.trim()).length} {t("sellerDashboard.references")}
                        </span>
                      </div>
                    </div>

                    <div className="border border-border rounded-xl overflow-hidden">
                      <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-muted sticky top-0 z-10">
                            <tr>
                              <th className="text-left px-2 py-2 font-semibold text-muted-foreground whitespace-nowrap">{t("sellerDashboard.brand", "Marque")}</th>
                              <th className="text-left px-2 py-2 font-semibold text-muted-foreground whitespace-nowrap min-w-[140px]">{t("sellerDashboard.itemName")}</th>
                              <th className="text-left px-2 py-2 font-semibold text-muted-foreground whitespace-nowrap">{t("sellerDashboard.category", "Catégorie")}</th>
                              <th className="text-left px-2 py-2 font-semibold text-muted-foreground whitespace-nowrap">{t("sellerDashboard.gender", "Genre")}</th>
                              <th className="text-left px-2 py-2 font-semibold text-muted-foreground whitespace-nowrap w-20">{t("sellerDashboard.size")}</th>
                              <th className="text-left px-2 py-2 font-semibold text-muted-foreground whitespace-nowrap w-24">{t("sellerDashboard.itemRef", "Réf.")}</th>
                              <th className="text-left px-2 py-2 font-semibold text-muted-foreground whitespace-nowrap w-16">{t("sellerDashboard.qty")}</th>
                              <th className="text-left px-2 py-2 font-semibold text-muted-foreground whitespace-nowrap w-24">{t("sellerDashboard.retailEur", "Prix retail €")}</th>
                              <th className="text-left px-2 py-2 font-semibold text-muted-foreground whitespace-nowrap min-w-[160px]">{t("sellerDashboard.photoUrl", "Photo (URL)")}</th>
                              <th className="w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {lotItems.map((item, idx) => (
                              <tr key={idx} className="border-t border-border hover:bg-muted/30">
                                <td className="px-1 py-1">
                                  <input value={item.brand} onChange={e => updateItem(idx, "brand", e.target.value)} className="w-full bg-transparent px-1 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded" />
                                </td>
                                <td className="px-1 py-1">
                                  <input value={item.name} onChange={e => updateItem(idx, "name", e.target.value)} className="w-full bg-transparent px-1 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded" />
                                </td>
                                <td className="px-1 py-1">
                                  <select value={item.category} onChange={e => updateItem(idx, "category", e.target.value)} className="w-full bg-transparent px-1 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded">
                                    <option value=""></option>
                                    <option value="clothing">{t("sellerDashboard.categories.clothing")}</option>
                                    <option value="sneakers">{t("sellerDashboard.categories.sneakers")}</option>
                                    <option value="accessories">{t("sellerDashboard.categories.accessories")}</option>
                                  </select>
                                </td>
                                <td className="px-1 py-1">
                                  <select value={item.gender} onChange={e => updateItem(idx, "gender", e.target.value)} className="w-full bg-transparent px-1 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded">
                                    <option value=""></option>
                                    <option value="men">{t("sellerDashboard.men", "Homme")}</option>
                                    <option value="women">{t("sellerDashboard.women", "Femme")}</option>
                                    <option value="unisex">{t("sellerDashboard.unisex", "Mixte")}</option>
                                    <option value="kids">{t("sellerDashboard.kids", "Enfant")}</option>
                                  </select>
                                </td>
                                <td className="px-1 py-1">
                                  <input value={item.size} onChange={e => updateItem(idx, "size", e.target.value)} className="w-full bg-transparent px-1 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded" />
                                </td>
                                <td className="px-1 py-1">
                                  <input value={item.reference} onChange={e => updateItem(idx, "reference", e.target.value)} className="w-full bg-transparent px-1 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded" />
                                </td>
                                <td className="px-1 py-1">
                                  <input type="number" min="0" value={item.quantity || ""} onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 0)} className="w-full bg-transparent px-1 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded" />
                                </td>
                                <td className="px-1 py-1">
                                  <input type="number" min="0" step="0.01" value={item.retail_price || ""} onChange={e => updateItem(idx, "retail_price", parseFloat(e.target.value) || 0)} className="w-full bg-transparent px-1 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded" />
                                </td>
                                <td className="px-1 py-1">
                                  <input value={item.image_url} onChange={e => updateItem(idx, "image_url", e.target.value)} placeholder="https://..." className="w-full bg-transparent px-1 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded" />
                                </td>
                                <td className="px-1 py-1">
                                  <button
                                    type="button"
                                    onClick={() => removeItemRow(idx)}
                                    disabled={lotItems.length <= 1}
                                    className="text-destructive hover:text-destructive/80 p-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
                                    aria-label={t("common.delete", "Supprimer")}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button
                        type="button"
                        onClick={addItemRow}
                        className="w-full px-3 py-2 text-xs font-medium text-primary hover:bg-muted/50 transition-colors border-t border-border"
                      >
                        {t("sellerDashboard.addLine")}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">
                      {t("sellerDashboard.inlineHint", "Remplissez chaque ligne directement. Les colonnes sont fixes et ordonnées.")}
                    </p>
                  </div>

                </div>

                {/* RIGHT COL — Sticky price panel (mirrors LotDetail right panel) */}
                <div className="md:col-span-3">
                  <div className="md:sticky md:top-[72px] space-y-3">
                    <div className="bg-card rounded-xl border border-border p-4 shadow-card space-y-3">

                      {/* Units */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{t("sellerDashboard.numberOfUnits")} *</label>
                        <Input type="number" value={units} onChange={e => setUnits(e.target.value)} placeholder="200" className="bg-muted/50 border-none" />
                      </div>

                      {/* Pallets — drives shipping cost */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {t("sellerDashboard.pallets", "Palettes")} *
                        </label>
                        <Input type="number" min="1" value={pallets} onChange={e => setPallets(e.target.value)} placeholder="1" className="bg-muted/50 border-none" />
                        <p className="text-[10px] text-muted-foreground italic">
                          {t("sellerDashboard.palletsHint", "Détermine le coût de transport et donc les pays accessibles.")}
                        </p>
                      </div>

                      {/* Retail price */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{t("sellerDashboard.retailPrice")}</label>
                        <Input type="number" value={retailPrice} onChange={e => setRetailPrice(e.target.value)} placeholder="12000" className="bg-muted/50 border-none" />
                      </div>

                      {/* Lot price */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{t("sellerDashboard.lotPrice")} * (HT)</label>
                        <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="5000" className="bg-muted/50 border-none font-heading font-bold text-lg" />
                      </div>

                      {/* Auto-computed preview — seller sees HT price only */}
                      {price && (
                        <div className="border-t border-border pt-3 space-y-1.5">
                          {retailPrice && parseFloat(retailPrice) > 0 && (
                            <div className="flex justify-between items-baseline">
                              <span className="text-[10px] text-muted-foreground">{t("lotDetail.retailValue", "Valeur retail")}</span>
                              <span className="text-xs text-muted-foreground line-through">{parseFloat(retailPrice).toLocaleString("fr-FR")} €</span>
                            </div>
                          )}
                          <div className="flex justify-between items-baseline">
                            <span className="font-heading font-bold text-foreground text-sm">{t("sellerDashboard.yourPrice", "Votre prix")}</span>
                            <div className="flex items-center gap-2">
                              {retailPrice && parseFloat(retailPrice) > 0 && (
                                <span className="text-xs font-bold text-green-600">
                                  -{Math.round((1 - parseFloat(price) / parseFloat(retailPrice)) * 100)}%
                                </span>
                              )}
                              <span className="font-heading font-bold text-primary text-lg">
                                {parseFloat(price).toLocaleString("fr-FR")} €
                              </span>
                            </div>
                          </div>
                          {units && parseInt(units) > 0 && (
                            <div className="flex justify-between items-baseline">
                              <span className="text-[10px] text-muted-foreground">{t("sellerDashboard.pricePerUnitHT", "Prix / pièce HT")}</span>
                              <span className="text-xs font-semibold text-foreground">
                                {(parseFloat(price) / parseInt(units)).toFixed(2)} €
                              </span>
                            </div>
                          )}
                          <p className="text-[10px] text-muted-foreground italic pt-1">
                            {t("sellerDashboard.commissionNote", "L'acheteur verra un prix avec commission Vary incluse")}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Live shipping reach preview */}
                    <ShippingReachPanel
                      originCountry={originCountry}
                      lotPrice={parseFloat(price) || 0}
                      pallets={Math.max(1, parseInt(pallets) || 1)}
                    />

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowForm(false)}
                        className="flex-1 py-2.5 border border-border rounded-xl hover:bg-muted transition-colors text-sm font-medium text-foreground"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        className="flex-1 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
                      >
                        {saveMutation.isPending ? t("common.loading") : editingLotId ? t("common.save") : t("sellerDashboard.publishLot")}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </main>
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
