import { useRef } from "react";
import { Shirt, Footprints, Watch, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const categories = [
  { label: "Tous", value: "", icon: null },
  { label: "Vêtements", value: "Vêtements", icon: Shirt },
  { label: "Sneakers", value: "Sneakers", icon: Footprints },
  { label: "Accessoires", value: "Accessoires", icon: Watch },
];

interface CategoryBarProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoryBar = ({ activeCategory, onCategoryChange }: CategoryBarProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <div className="relative group">
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-card/90 border border-border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ChevronLeft className="h-4 w-4 text-foreground" />
      </button>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide py-2 px-1"
      >
        {categories.map((cat) => {
          const isActive = activeCategory === cat.value;
          const Icon = cat.icon;
          return (
            <motion.button
              key={cat.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => onCategoryChange(cat.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted text-muted-foreground border-transparent hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {cat.label}
            </motion.button>
          );
        })}
      </div>

      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-card/90 border border-border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ChevronRight className="h-4 w-4 text-foreground" />
      </button>
    </div>
  );
};

export default CategoryBar;
