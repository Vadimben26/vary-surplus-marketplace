import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Users, Package, ShoppingCart, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navItems = [
    { to: "/admin", label: t("admin.nav.overview"), icon: LayoutDashboard, end: true },
    { to: "/admin/vendeurs", label: t("admin.nav.sellers"), icon: Users },
    { to: "/admin/lots", label: t("admin.nav.lots"), icon: Package },
    { to: "/admin/commandes", label: t("admin.nav.orders"), icon: ShoppingCart },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex w-full bg-muted/30">
      <aside className="w-64 bg-background border-r flex flex-col">
        <div className="p-6 border-b flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vary</h1>
            <p className="text-xs text-muted-foreground mt-1">{t("admin.title")}</p>
          </div>
          <LanguageSwitcher />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t space-y-2">
          <div className="px-3 py-2">
            <p className="text-sm font-medium truncate">{profile?.full_name || "Admin"}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            {t("admin.logout")}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
