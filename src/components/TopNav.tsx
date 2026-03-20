import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { User, LogOut, HelpCircle, Store, ShoppingBag, ArrowRightLeft, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import varyLogo from "@/assets/vary-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface TopNavProps {
  filters?: {
    location: string;
    priceRange: string;
    style: string;
    search: string;
  };
  onFiltersChange?: (filters: { location: string; priceRange: string; style: string; search: string }) => void;
  showSearch?: boolean;
}

const TopNav = ({ filters, onFiltersChange, showSearch = false }: TopNavProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeRoleTab, setActiveRoleTab] = useState<"buyer" | "seller" | null>(() => {
    if (typeof window === "undefined") return null;
    const savedRole = window.sessionStorage.getItem("vary-active-role-tab");
    return savedRole === "buyer" || savedRole === "seller" ? savedRole : null;
  });
  const profileRef = useRef<HTMLDivElement>(null);
  const { profile, signOut, canAccessBuyer, canAccessSeller, getUserType } = useAuth();
  const isBuyer = canAccessBuyer();
  const isSeller = canAccessSeller();
  const userType = getUserType();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const buyerPages = ["/marketplace", "/lot/", "/buyer/vip", "/devenir/acheteur", "/inscription/acheteur"];
  const sellerPages = ["/seller", "/seller/vip", "/devenir/vendeur", "/inscription/vendeur"];
  const sharedPages = ["/favoris", "/panier", "/messages", "/checkout", "/commandes", "/profil"];

  useEffect(() => {
    if (buyerPages.some((path) => location.pathname.startsWith(path))) {
      setActiveRoleTab("buyer");
      window.sessionStorage.setItem("vary-active-role-tab", "buyer");
      return;
    }

    if (sellerPages.some((path) => location.pathname.startsWith(path))) {
      setActiveRoleTab("seller");
      window.sessionStorage.setItem("vary-active-role-tab", "seller");
      return;
    }

    if (!sharedPages.some((path) => location.pathname.startsWith(path))) {
      setActiveRoleTab(null);
      window.sessionStorage.removeItem("vary-active-role-tab");
      return;
    }

    const savedRole = window.sessionStorage.getItem("vary-active-role-tab");
    if ((savedRole === "buyer" && isBuyer) || (savedRole === "seller" && isSeller)) {
      setActiveRoleTab(savedRole);
      return;
    }

    if (isSeller && !isBuyer) {
      setActiveRoleTab("seller");
      window.sessionStorage.setItem("vary-active-role-tab", "seller");
      return;
    }

    if (isBuyer) {
      setActiveRoleTab("buyer");
      window.sessionStorage.setItem("vary-active-role-tab", "buyer");
    }
  }, [location.pathname, isBuyer, isSeller]);

  const handleLogout = async () => {
    await signOut();
    window.sessionStorage.removeItem("vary-active-role-tab");
    window.location.href = "/";
  };

  const handleRequestDual = () => {
    setShowProfileMenu(false);
    if (isBuyer && !isSeller) {
      navigate("/devenir/vendeur");
    } else if (isSeller && !isBuyer) {
      navigate("/devenir/acheteur");
    }
  };

  const isActive = (path: string) => {
    const onSharedPage = sharedPages.some((sharedPath) => location.pathname.startsWith(sharedPath));

    if (path === "/marketplace" || path === "/devenir/acheteur") {
      return buyerPages.some((buyerPath) => location.pathname.startsWith(buyerPath)) || (onSharedPage && activeRoleTab === "buyer");
    }

    if (path === "/seller" || path === "/devenir/vendeur") {
      return sellerPages.some((sellerPath) => location.pathname.startsWith(sellerPath)) || (onSharedPage && activeRoleTab === "seller");
    }

    return location.pathname.startsWith(path);
  };

  const tabs = [
    { label: t("nav.contactFaq"), path: "/contact", icon: HelpCircle },
    { label: t("nav.buyer"), path: isBuyer ? "/marketplace" : "/devenir/acheteur", icon: ShoppingBag },
    { label: t("nav.seller"), path: isSeller ? "/seller" : "/devenir/vendeur", icon: Store },
  ];

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between px-4 md:px-8 h-16">
        <Link to={isSeller && !isBuyer ? "/seller" : "/marketplace"} className="flex-shrink-0">
          <motion.img
            src={varyLogo}
            alt="Vary"
            className="h-10 w-auto cursor-pointer"
            whileHover={{ scale: 1.05, rotate: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400 }}
          />
        </Link>

        <nav className="hidden md:flex items-center gap-1 mx-6">
          {tabs.map((tab) => {
            const active = isActive(tab.path);
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {showSearch && filters && onFiltersChange && (
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="flex w-full items-center bg-muted rounded-full border border-border hover:shadow-card transition-shadow">
              <div className="flex items-center gap-2 px-4 py-2 flex-1">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("common.search")}
                  className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground"
                  value={filters.search}
                  onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                />
                {filters.search && (
                  <button onClick={() => onFiltersChange({ ...filters, search: "" })}>
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-border hover:shadow-card transition-all bg-card"
            >
              <User className="h-5 w-5 text-foreground" />
              <span className="hidden md:inline text-sm font-medium text-foreground">
                {profile?.full_name || t("common.myAccount")}
              </span>
            </button>
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 top-12 bg-card border border-border rounded-xl shadow-card-hover p-2 min-w-[220px]"
                >
                  <Link
                    to="/profil"
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <User className="h-4 w-4" /> {t("common.myProfile")}
                  </Link>

                  <div className="md:hidden border-t border-border my-1 pt-1">
                    {tabs.map((tab) => (
                      <Link
                        key={tab.path}
                        to={tab.path}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <tab.icon className="h-4 w-4" /> {tab.label}
                      </Link>
                    ))}
                  </div>

                  <div className="border-t border-border my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> {t("common.logout")}
                  </button>

                  {userType !== "both" && (
                    <>
                      <div className="border-t border-border my-1" />
                      <button
                        onClick={handleRequestDual}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                        {isBuyer ? t("nav.becomeAlsoSeller") : t("nav.becomeAlsoBuyer")}
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
