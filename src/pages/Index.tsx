import MarketplaceHeader from "@/components/MarketplaceHeader";
import BottomNav from "@/components/BottomNav";
import LotCard from "@/components/LotCard";
import { mockLots } from "@/data/mockLots";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />

      <main className="px-4 md:px-8 py-6 pb-24 md:pb-6 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {mockLots.map((lot) => (
            <LotCard key={lot.id} {...lot} />
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
