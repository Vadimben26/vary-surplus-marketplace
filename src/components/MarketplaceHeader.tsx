import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, SlidersHorizontal, User, Search, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import varyLogo from "@/assets/vary-logo.png";

const categories = ["Tous", "Sneakers", "Vêtements", "Électronique", "Beauté", "Accessoires", "Sport"];

const MarketplaceHeader = () => {
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [showFilters, setShowFilters] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 md:px-8 h-16">
        <Link to="/" className="flex-shrink-0">
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
              />
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 border-r border-border cursor-pointer hover:bg-secondary-light/50 transition-colors">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Localisation</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
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
        <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-border hover:shadow-card transition-all bg-card">
          <User className="h-5 w-5 text-foreground" />
          <span className="hidden md:inline text-sm font-medium text-foreground">Mon compte</span>
        </button>
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-2 px-4 md:px-8 py-3 overflow-x-auto scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Mobile search */}
      <div className="md:hidden px-4 pb-3">
        <div className="flex items-center bg-muted rounded-full border border-border px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground mr-2" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground"
          />
          <SlidersHorizontal className="h-4 w-4 text-primary ml-2" />
        </div>
      </div>
    </header>
  );
};

export default MarketplaceHeader;
