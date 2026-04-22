import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Heart, ShoppingCart, MessageCircle, Truck, Package } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import varyLogo from "@/assets/vary-logo.png";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const SELLER_PATHS = ["/seller", "/seller/vip", "/seller/suivi"];
const LAST_VISIT_KEY = "vary_last_marketplace_visit";

const matchesCategory = (lotCategory: string | null, buyerCats: string[] | null): boolean => {
  if (!buyerCats || buyerCats.length === 0) return true;
  if (!lotCategory) return false;
  const lc = lotCategory.toLowerCase();
  return buyerCats.some((bc) => lc.includes(bc.toLowerCase()));
};

const budgetCeiling = (raw: string | null | undefined): number | null => {
  if (!raw) return null;
  const cleaned = raw.toLowerCase().replace(/\s|€|eur/g, "");
  if (cleaned.includes("<1000") || cleaned.includes("moins")) return 1000;
  if (cleaned.includes("1000") && cleaned.includes("5000")) return 5000;
  if (cleaned.includes("5000") && cleaned.includes("15000")) return 15000;
  if (cleaned.includes("15000") && cleaned.includes("50000")) return 50000;
  if (cleaned.includes(">50000") || cleaned.includes("plus")) return null;
  const nums = cleaned.match(/\d+/g);
  if (!nums) return null;
  return parseInt(nums[nums.length - 1]);
};

const BottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { favorites } = useFavorites();
  const { cartItems } = useCart();
  const { profile, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [matchingNewLots, setMatchingNewLots] = useState(0);

  // Track last interface in sessionStorage so /messages knows which side we're on
  const isOnSellerPath = SELLER_PATHS.some(p => location.pathname.startsWith(p));
  useEffect(() => {
    if (isOnSellerPath) {
      sessionStorage.setItem("vary_last_interface", "seller");
    } else if (location.pathname !== "/messages") {
      sessionStorage.setItem("vary_last_interface", "buyer");
    }
  }, [location.pathname, isOnSellerPath]);

  const lastInterface = sessionStorage.getItem("vary_last_interface") || sessionStorage.getItem("vary-active-role-tab");
  const isSellerInterface = isOnSellerPath || (location.pathname === "/messages" && lastInterface === "seller");

  // Fetch unread message count
  useEffect(() => {
    if (!profile?.id) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", profile.id)
        .eq("read", false);
      setUnreadCount(count || 0);
    };

    fetchUnread();

    const channel = supabase
      .channel("unread-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => fetchUnread()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  // Also listen for custom events from Messages page
  useEffect(() => {
    const handler = (e: Event) => {
      setUnreadCount((e as CustomEvent).detail);
    };
    window.addEventListener("vary-unread-count", handler);
    return () => window.removeEventListener("vary-unread-count", handler);
  }, []);

  // Count matching new lots since last marketplace visit (buyer interface only)
  useEffect(() => {
    if (!user?.id || isSellerInterface) {
      setMatchingNewLots(0);
      return;
    }
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
    if (!lastVisit) {
      // Never visited: don't show badge
      setMatchingNewLots(0);
      return;
    }

    const fetchMatching = async () => {
      const { data: prefs } = await supabase
        .from("buyer_preferences")
        .select("categories, budget, alerts_consent")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!prefs || prefs.alerts_consent === false) {
        setMatchingNewLots(0);
        return;
      }

      const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const sinceLastVisit = new Date(Math.max(new Date(lastVisit).getTime(), Date.now() - 48 * 60 * 60 * 1000)).toISOString();
      void since48h;

      const { data: lots } = await supabase
        .from("lots")
        .select("id, category, price")
        .eq("status", "active")
        .gt("created_at", sinceLastVisit)
        .limit(100);

      if (!lots) {
        setMatchingNewLots(0);
        return;
      }

      const ceiling = budgetCeiling(prefs.budget);
      const matched = lots.filter((l: any) => {
        if (!matchesCategory(l.category, prefs.categories)) return false;
        if (ceiling !== null && Number(l.price) > ceiling) return false;
        return true;
      });
      setMatchingNewLots(matched.length);
    };

    fetchMatching();
  }, [user?.id, isSellerInterface, location.pathname]);

  // Clear badge when visiting /marketplace
  useEffect(() => {
    if (location.pathname === "/marketplace") {
      localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
      setMatchingNewLots(0);
    }
  }, [location.pathname]);

  const buyerNavItems = [
    { icon: null, label: t("nav.home"), path: "/marketplace", isLogo: true },
    { icon: Heart, label: t("nav.favorites"), path: "/favoris", isLogo: false },
    { icon: ShoppingCart, label: t("nav.cart"), path: "/panier", isLogo: false },
    { icon: Package, label: t("nav.tracking"), path: "/commandes", isLogo: false },
    { icon: MessageCircle, label: t("nav.messages"), path: "/messages", isLogo: false },
  ];

  const sellerNavItems = [
    { icon: null, label: t("nav.home"), path: "/seller", isLogo: true },
    { icon: Truck, label: t("nav.tracking"), path: "/seller/suivi", isLogo: false },
    { icon: MessageCircle, label: t("nav.messages"), path: "/messages", isLogo: false },
  ];

  const navItems = isSellerInterface ? sellerNavItems : buyerNavItems;

  const getBadge = (path: string) => {
    if (path === "/favoris") return favorites.length;
    if (path === "/panier") return cartItems.length;
    if (path === "/messages") return unreadCount;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border">
      <div className="flex items-center justify-around h-14 md:h-16 px-4 max-w-[1600px] mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === "/messages" && location.pathname.startsWith("/messages"));
          const badge = getBadge(item.path);
          const showLogoDot = item.isLogo && !isSellerInterface && matchingNewLots > 0;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center gap-0.5 px-4 md:px-6 py-1.5 rounded-xl transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.isLogo ? (
                <span className="relative">
                  <motion.img
                    src={varyLogo}
                    alt="Vary"
                    className="h-6 md:h-7 w-auto"
                    whileHover={{ scale: 1.1, rotate: -3 }}
                    whileTap={{ scale: 0.9 }}
                  />
                  {showLogoDot && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-card"
                      aria-label={`${matchingNewLots} nouveaux lots correspondants`}
                    />
                  )}
                </span>
              ) : (
                <span className="relative">
                  {item.icon && <item.icon className={`h-5 w-5 md:h-6 md:w-6 ${isActive ? "text-primary" : ""}`} />}
                  {badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center"
                    >
                      {badge > 9 ? "9+" : badge}
                    </motion.span>
                  )}
                </span>
              )}
              <span className="text-[10px] md:text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
