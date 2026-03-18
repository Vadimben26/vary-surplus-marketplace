import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, SlidersHorizontal, User, Search, ChevronDown, X, DollarSign, Palette, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import varyLogo from "@/assets/vary-logo.png";
import { logout } from "@/lib/auth";

interface Filters {
  location: string;
  priceRange: string;
  style: string;
  search: string;
}

interface MarketplaceHeaderProps {
  filters?: Filters;
  onFiltersChange?: (filters: Filters) => void;
}

const locations = ["", "France", "Espagne", "Italie", "Allemagne", "Pays-Bas", "Portugal", "Belgique"];
const priceRanges = [
  { value: "", label: "Tous les prix" },
  { value: "low", label: "< 5 000 €" },
  { value: "mid", label: "5 000 – 15 000 €" },
  { value: "high", label: "> 15 000 €" },
];
const styles = ["", "Casual", "Business", "Sport", "Premium", "Denim"];

const MarketplaceHeader = ({ filters, onFiltersChange }: MarketplaceHeaderProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const localFilters = filters || { location: "", priceRange: "", style: "", search: "" };

  const updateFilter = (key: keyof Filters, value: string) => {
    onFiltersChange?.({ ...localFilters, [key]: value });
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 md:px-8 h-16">
        <Link to="/marketplace" className="flex-shrink-0">
          <motion.img
            src={varyLogo}
            alt="Vary"
            className="h-10 w-auto cursor-pointer"
            whileHover={{ scale: 1.05, rotate: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400 }}
          />
        </Link>

        {/* Search bar */}
        <div className="hidden md:flex flex-1 max-w-xl mx-8">
          <div className="flex w-full items-center bg-muted rounded-full border border-border hover:shadow-card transition-shadow">
            <div className="flex items-center gap-2 px-4 py-2.5 border-r border-border flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher un lot, une marque..."
                className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground"
                value={localFilters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
              />
              {localFilters.search && (
                <button onClick={() => updateFilter("search", "")}>
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-r-full hover:bg-secondary-light/50 transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Filtres</span>
            </button>
          </div>
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-border hover:shadow-card transition-all bg-card"
          >
            <User className="h-5 w-5 text-foreground" />
            <span className="hidden md:inline text-sm font-medium text-foreground">Mon compte</span>
          </button>
          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute right-0 top-12 bg-card border border-border rounded-xl shadow-card-hover p-2 min-w-[180px]"
              >
                <Link
                  to="/profil"
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <User className="h-4 w-4" />
                  Mon profil
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Se déconnecter
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="px-4 md:px-8 py-4 flex flex-wrap gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Localisation
                </label>
                <select
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring"
                  value={localFilters.location}
                  onChange={(e) => updateFilter("location", e.target.value)}
                >
                  <option value="">Tous les pays</option>
                  {locations.filter(Boolean).map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Prix
                </label>
                <select
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring"
                  value={localFilters.priceRange}
                  onChange={(e) => updateFilter("priceRange", e.target.value)}
                >
                  {priceRanges.map((pr) => (
                    <option key={pr.value} value={pr.value}>{pr.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Palette className="h-3 w-3" /> Style
                </label>
                <select
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring"
                  value={localFilters.style}
                  onChange={(e) => updateFilter("style", e.target.value)}
                >
                  <option value="">Tous les styles</option>
                  {styles.filter(Boolean).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => onFiltersChange?.({ location: "", priceRange: "", style: "", search: "" })}
                className="h-9 px-4 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors font-medium"
              >
                Réinitialiser
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile search */}
      <div className="md:hidden px-4 pb-3">
        <div className="flex items-center bg-muted rounded-full border border-border px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground mr-2" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground"
            value={localFilters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
          />
          <button onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="h-4 w-4 text-primary ml-2" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default MarketplaceHeader;
