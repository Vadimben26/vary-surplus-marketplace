import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Registration from "./pages/Registration.tsx";
import BuyerRegistration from "./pages/BuyerRegistration.tsx";
import SellerRegistration from "./pages/SellerRegistration.tsx";
import Login from "./pages/Login.tsx";
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
  const { isVerified, loading } = useAuth();
  if (loading) return null;
  if (!isVerified()) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const BuyerRoute = ({ children }: { children: React.ReactNode }) => {
  const { isVerified, canAccessBuyer, loading } = useAuth();
  if (loading) return null;
  if (!isVerified()) return <Navigate to="/" replace />;
  if (!canAccessBuyer()) return <Navigate to="/inscription/acheteur" replace />;
  return <>{children}</>;
};

const SellerRoute = ({ children }: { children: React.ReactNode }) => {
  const { isVerified, canAccessSeller, loading } = useAuth();
  if (loading) return null;
  if (!isVerified()) return <Navigate to="/" replace />;
  if (!canAccessSeller()) return <Navigate to="/inscription/vendeur" replace />;
  return <>{children}</>;
};

const HomeRedirect = () => {
  return <Navigate to="/marketplace" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <FavoritesProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/inscription" element={<Registration />} />
                <Route path="/inscription/acheteur" element={<BuyerRegistration />} />
                <Route path="/inscription/vendeur" element={<SellerRegistration />} />
                <Route path="/connexion" element={<Login />} />

                {/* Public pages */}
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/lot/:id" element={<LotDetail />} />
                <Route path="/contact" element={<ContactFAQ />} />

                {/* Protected (need login) */}
                <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                <Route path="/favoris" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
                <Route path="/panier" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
                <Route path="/seller" element={<SellerRoute><SellerDashboard /></SellerRoute>} />
                <Route path="/seller/vip" element={<SellerRoute><SellerVIP /></SellerRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </FavoritesProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
