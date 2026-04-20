import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Package, ShoppingCart, AlertTriangle } from "lucide-react";
import AdminLayout from "./AdminLayout";

interface Metrics {
  totalSellers: number;
  pendingValidations: number;
  activeLots: number;
  disputedOrders: number;
}

interface RecentSeller {
  id: string;
  full_name: string | null;
  company_name: string | null;
  created_at: string;
  validation_status: string;
}

interface DisputedOrder {
  id: string;
  amount: number;
  created_at: string;
  lot_title: string;
  buyer_name: string;
}

const statusBadge = (status: string) => {
  if (status === "approved") return <Badge className="bg-green-600 hover:bg-green-700">Approuvé</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejeté</Badge>;
  return <Badge className="bg-amber-500 hover:bg-amber-600">En attente</Badge>;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics>({
    totalSellers: 0,
    pendingValidations: 0,
    activeLots: 0,
    disputedOrders: 0,
  });
  const [recentSellers, setRecentSellers] = useState<RecentSeller[]>([]);
  const [disputedOrders, setDisputedOrders] = useState<DisputedOrder[]>([]);

  useEffect(() => {
    const load = async () => {
      const [
        { count: totalSellers },
        { count: pendingValidations },
        { count: activeLots },
        { count: disputedCount },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).in("user_type", ["seller", "both"]),
        (supabase.from("seller_preferences") as any).select("*", { count: "exact", head: true }).eq("validation_status", "pending"),
        supabase.from("lots").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "disputed"),
      ]);

      setMetrics({
        totalSellers: totalSellers ?? 0,
        pendingValidations: pendingValidations ?? 0,
        activeLots: activeLots ?? 0,
        disputedOrders: disputedCount ?? 0,
      });

      // Recent sellers — join with seller_preferences for validation_status
      const { data: sellers } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, created_at, user_id")
        .in("user_type", ["seller", "both"])
        .order("created_at", { ascending: false })
        .limit(5);

      if (sellers && sellers.length > 0) {
        const userIds = sellers.map((s: any) => s.user_id);
        const { data: prefs } = await (supabase.from("seller_preferences") as any)
          .select("user_id, validation_status")
          .in("user_id", userIds);

        const prefsMap = new Map((prefs ?? []).map((p: any) => [p.user_id, p.validation_status]));
        setRecentSellers(
          sellers.map((s: any) => ({
            id: s.id,
            full_name: s.full_name,
            company_name: s.company_name,
            created_at: s.created_at,
            validation_status: (prefsMap.get(s.user_id) as string) || "pending",
          }))
        );
      }

      // Disputed orders
      const { data: disputed } = await supabase
        .from("orders")
        .select("id, amount, created_at, lot_id, buyer_id")
        .eq("status", "disputed")
        .order("created_at", { ascending: false })
        .limit(5);

      if (disputed && disputed.length > 0) {
        const lotIds = disputed.map((o: any) => o.lot_id);
        const buyerIds = disputed.map((o: any) => o.buyer_id);
        const [{ data: lots }, { data: buyers }] = await Promise.all([
          supabase.from("lots").select("id, title").in("id", lotIds),
          supabase.from("profiles").select("id, full_name, company_name").in("id", buyerIds),
        ]);
        const lotsMap = new Map((lots ?? []).map((l: any) => [l.id, l.title]));
        const buyersMap = new Map((buyers ?? []).map((b: any) => [b.id, b.company_name || b.full_name || "—"]));
        setDisputedOrders(
          disputed.map((o: any) => ({
            id: o.id,
            amount: o.amount,
            created_at: o.created_at,
            lot_title: lotsMap.get(o.lot_id) || "—",
            buyer_name: buyersMap.get(o.buyer_id) || "—",
          }))
        );
      }
    };
    load();
  }, []);

  const cards = [
    { title: "Total vendeurs", value: metrics.totalSellers, icon: Users },
    { title: "Validations en attente", value: metrics.pendingValidations, icon: AlertTriangle },
    { title: "Lots actifs", value: metrics.activeLots, icon: Package },
    { title: "Commandes en litige", value: metrics.disputedOrders, icon: ShoppingCart },
  ];

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-8">Vue d'ensemble</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{c.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vendeurs récents</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSellers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun vendeur récent.</p>
            ) : (
              <div className="space-y-2">
                {recentSellers.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => navigate("/admin/vendeurs")}
                    className="flex items-center justify-between p-3 rounded-md hover:bg-accent cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.company_name || s.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    {statusBadge(s.validation_status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commandes en litige</CardTitle>
          </CardHeader>
          <CardContent>
            {disputedOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune commande en litige.</p>
            ) : (
              <div className="space-y-2">
                {disputedOrders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => navigate("/admin/commandes")}
                    className="flex items-center justify-between p-3 rounded-md hover:bg-accent cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{o.lot_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.buyer_name} · {new Date(o.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{Number(o.amount).toLocaleString("fr-FR")} €</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
