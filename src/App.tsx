import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { CartProvider } from "@/contexts/CartContext";
import { isVerified, canAccessBuyer, canAccessSeller, getUserType } from "@/lib/auth";
import Registration from "./pages/Registration.tsx";
import BuyerRegistration from "./pages/BuyerRegistration.tsx";
import SellerRegistration from "./pages/SellerRegistration.tsx";
import Marketplace from "./pages/Marketplace.tsx";
import SellerDashboard from "./pages/SellerDashboard.tsx";
import SellerVIP from "./pages/SellerVIP.tsx";
import ContactFAQ from "./pages/ContactFAQ.tsx";
import LotDetail from "./pages/LotDetail.tsx";
import Favorites from "./pages/Favorites.tsx";
import Cart from "./pages/Cart.tsx";
import Messages from "./pages/Messages.tsx";
import Profile from "./pages/Profile.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!isVerified()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const BuyerRoute = ({ children }: { children: React.ReactNode }) => {
  if (!isVerified()) return <Navigate to="/" replace />;
  if (!canAccessBuyer()) return <Navigate to="/inscription/acheteur" replace />;
  return <>{children}</>;
};

const SellerRoute = ({ children }: { children: React.ReactNode }) => {
  if (!isVerified()) return <Navigate to="/" replace />;
  if (!canAccessSeller()) return <Navigate to="/inscription/vendeur" replace />;
  return <>{children}</>;
};

const getDefaultRoute = () => {
  if (!isVerified()) return "/";
  const type = getUserType();
  if (type === "seller") return "/seller";
  return "/marketplace";
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <FavoritesProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={isVerified() ? <Navigate to={getDefaultRoute()} replace /> : <Registration />} />
              <Route path="/inscription" element={<Registration />} />
              <Route path="/inscription/acheteur" element={<BuyerRegistration />} />
              <Route path="/inscription/vendeur" element={<SellerRegistration />} />

              {/* Shared */}
              <Route path="/contact" element={<ProtectedRoute><ContactFAQ /></ProtectedRoute>} />
              <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />

              {/* Buyer routes */}
              <Route path="/marketplace" element={<BuyerRoute><Marketplace /></BuyerRoute>} />
              <Route path="/lot/:id" element={<BuyerRoute><LotDetail /></BuyerRoute>} />
              <Route path="/favoris" element={<BuyerRoute><Favorites /></BuyerRoute>} />
              <Route path="/panier" element={<BuyerRoute><Cart /></BuyerRoute>} />

              {/* Seller routes */}
              <Route path="/seller" element={<SellerRoute><SellerDashboard /></SellerRoute>} />
              <Route path="/seller/vip" element={<SellerRoute><SellerVIP /></SellerRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </FavoritesProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
