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
import ResetPassword from "./pages/ResetPassword.tsx";
import Marketplace from "./pages/Marketplace.tsx";
import SellerDashboard from "./pages/SellerDashboard.tsx";
import SellerVIP from "./pages/SellerVIP.tsx";
import SellerTracking from "./pages/SellerTracking.tsx";
import SellerDisputes from "./pages/SellerDisputes.tsx";
import ContactFAQ from "./pages/ContactFAQ.tsx";
import LotDetail from "./pages/LotDetail.tsx";
import Favorites from "./pages/Favorites.tsx";
import Cart from "./pages/Cart.tsx";
import Checkout from "./pages/Checkout.tsx";
import Orders from "./pages/Orders.tsx";
import Messages from "./pages/Messages.tsx";
import Profile from "./pages/Profile.tsx";
import BuyerVIP from "./pages/BuyerVIP.tsx";
import RoleGateway from "./pages/RoleGateway.tsx";
import NotFound from "./pages/NotFound.tsx";
import Welcome from "./pages/Welcome.tsx";
import BuyerWelcome from "./pages/BuyerWelcome.tsx";
import CGV from "./pages/CGV.tsx";
import MentionsLegales from "./pages/MentionsLegales.tsx";
import PolitiqueConfidentialite from "./pages/PolitiqueConfidentialite.tsx";
import PolitiqueCookies from "./pages/PolitiqueCookies.tsx";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isVerified, loading } = useAuth();
  if (loading) return null;
  if (!isVerified()) return <GuestGate />;
  return <>{children}</>;
};

const BuyerRoute = ({ children }: { children: React.ReactNode }) => {
  const { isVerified, canAccessBuyer, loading } = useAuth();
  if (loading) return null;
  if (!isVerified()) return <Navigate to="/" replace />;
  if (!canAccessBuyer()) return <Navigate to="/devenir/acheteur" replace />;
  return <>{children}</>;
};

const SellerRoute = ({ children }: { children: React.ReactNode }) => {
  const { isVerified, canAccessSeller, loading } = useAuth();
  if (loading) return null;
  if (!isVerified()) return <Navigate to="/" replace />;
  if (!canAccessSeller()) return <Navigate to="/devenir/vendeur" replace />;
  return <>{children}</>;
};

const HomeRedirect = () => {
  const { isVerified, canAccessSeller, loading } = useAuth();
  if (loading) return null;
  // Logged-in users skip the welcome screen
  if (isVerified()) {
    return <Navigate to={canAccessSeller() ? "/seller" : "/marketplace"} replace />;
  }
  return <Welcome />;
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
                <Route path="/bienvenue/acheteur" element={<BuyerWelcome />} />
                <Route path="/inscription" element={<Registration />} />
                <Route path="/inscription/acheteur" element={<BuyerRegistration />} />
                <Route path="/inscription/vendeur" element={<SellerRegistration />} />
                <Route path="/connexion" element={<Login />} />
                <Route path="/mot-de-passe-oublie" element={<ResetPassword />} />

                {/* Public pages */}
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/lot/:id" element={<LotDetail />} />
                <Route path="/contact" element={<ContactFAQ />} />
                <Route path="/devenir/:role" element={<RoleGateway />} />
                <Route path="/cgv" element={<CGV />} />
                <Route path="/mentions-legales" element={<MentionsLegales />} />
                <Route path="/confidentialite" element={<PolitiqueConfidentialite />} />
                <Route path="/cookies" element={<PolitiqueCookies />} />

                {/* Protected (need login) */}
                <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                <Route path="/favoris" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
                <Route path="/panier" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
                <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                <Route path="/commandes" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                <Route path="/buyer/vip" element={<BuyerRoute><BuyerVIP /></BuyerRoute>} />
                <Route path="/seller" element={<SellerRoute><SellerDashboard /></SellerRoute>} />
                <Route path="/seller/vip" element={<SellerRoute><SellerVIP /></SellerRoute>} />
                <Route path="/seller/suivi" element={<SellerRoute><SellerTracking /></SellerRoute>} />
                <Route path="/seller/litiges" element={<Navigate to="/seller/suivi" replace />} />

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
