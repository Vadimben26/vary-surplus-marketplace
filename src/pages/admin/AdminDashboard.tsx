import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Package, AlertTriangle, CheckCircle2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import AdminLayout from "./AdminLayout";

interface Metrics {
  totalSellers: number;
  pendingValidations: number;
  activeLots: number;
  openDisputes: number;
  resolvedThisMonth: number;
}

interface RecentSeller {
  id: string;
  full_name: string | null;
  company_name: string | null;
  created_at: string;
  validation_status: string;
}

interface OpenDispute {
  id: string;
  reason: string;
  opened_at: string;
  amount: number;
  buyer_name: string;
  seller_company: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [metrics, setMetrics] = useState<Metrics>({
    totalSellers: 0,
    pendingValidations: 0,
    activeLots: 0,
    openDisputes: 0,
    resolvedThisMonth: 0,
  });
  const [recentSellers, setRecentSellers] = useState<RecentSeller[]>([]);
  const [openDisputes, setOpenDisputes] = useState<OpenDispute[]>([]);
  const [registrationData, setRegistrationData] = useState<{ date: string; count: number }[]>([]);
  const [ordersData, setOrdersData] = useState<{ date: string; count: number }[]>([]);

  const localeMap: Record<string, string> = { fr: "fr-FR", en: "en-GB", es: "es-ES" };
  const dateLocale = localeMap[i18n.language] || "fr-FR";

  const statusBadge = (status: string) => {
    if (status === "approved")
      return <Badge className="bg-green-600 hover:bg-green-700">{t("admin.status.approved")}</Badge>;
    if (status === "rejected")
      return <Badge variant="destructive">{t("admin.status.rejected")}</Badge>;
    return <Badge className="bg-amber-500 hover:bg-amber-600">{t("admin.status.pending")}</Badge>;
  };

  const relativeDate = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return t("admin.time.today");
    if (days === 1) return t("admin.time.yesterday");
    if (days < 30) return t("admin.time.daysAgo", { count: days });
    return new Date(iso).toLocaleDateString(dateLocale);
  };

  useEffect(() => {
    const load = async () => {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const [
        { count: totalSellers },
        { count: pendingValidations },
        { count: activeLots },
        { count: openCount },
        { count: resolvedCount },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).in("user_type", ["seller", "both"]),
        (supabase.from("seller_preferences") as any).select("*", { count: "exact", head: true }).eq("validation_status", "pending"),
        supabase.from("lots").select("*", { count: "exact", head: true }).eq("status", "active"),
        (supabase as any).from("disputes").select("*", { count: "exact", head: true }).in("status", ["open", "admin_review"]),
        (supabase as any)
          .from("disputes")
          .select("*", { count: "exact", head: true })
          .in("status", ["resolved_refund", "resolved_release"])
          .gte("resolved_at", monthStart),
      ]);

      setMetrics({
        totalSellers: totalSellers ?? 0,
        pendingValidations: pendingValidations ?? 0,
        activeLots: activeLots ?? 0,
        openDisputes: openCount ?? 0,
        resolvedThisMonth: resolvedCount ?? 0,
      });

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

      const { data: disputes } = await (supabase as any)
        .from("disputes")
        .select("id, reason, opened_at, order_id, buyer_id, seller_id")
        .in("status", ["open", "admin_review"])
        .order("opened_at", { ascending: false })
        .limit(5);

      if (disputes && disputes.length > 0) {
        const orderIds = disputes.map((d: any) => d.order_id);
        const buyerIds = disputes.map((d: any) => d.buyer_id);
        const sellerIds = disputes.map((d: any) => d.seller_id);
        const profileIds = [...new Set([...buyerIds, ...sellerIds])];

        const [{ data: orders }, { data: profiles }] = await Promise.all([
          supabase.from("orders").select("id, amount").in("id", orderIds),
          supabase.from("profiles").select("id, full_name, company_name").in("id", profileIds),
        ]);

        const ordersMap = new Map((orders ?? []).map((o: any) => [o.id, o.amount]));
        const profilesMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

        setOpenDisputes(
          disputes.map((d: any) => {
            const buyer = profilesMap.get(d.buyer_id) as any;
            const seller = profilesMap.get(d.seller_id) as any;
            return {
              id: d.id,
              reason: d.reason,
              opened_at: d.opened_at,
              amount: Number(ordersMap.get(d.order_id) || 0),
              buyer_name: buyer?.full_name || buyer?.company_name || "—",
              seller_company: seller?.company_name || seller?.full_name || "—",
            };
          })
        );
      } else {
        setOpenDisputes([]);
      }

      // 30-day analytics
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [{ data: recentProfiles }, { data: recentOrders }] = await Promise.all([
        supabase
          .from("profiles")
          .select("created_at")
          .in("user_type", ["seller", "both"])
          .gte("created_at", thirtyDaysAgo)
          .order("created_at"),
        supabase
          .from("orders")
          .select("created_at")
          .gte("created_at", thirtyDaysAgo)
          .order("created_at"),
      ]);

      const groupByDay = (rows: { created_at: string }[] | null) => {
        const byDay: Record<string, number> = {};
        (rows || []).forEach((p) => {
          const d = new Date(p.created_at).toLocaleDateString(dateLocale, {
            day: "2-digit",
            month: "2-digit",
          });
          byDay[d] = (byDay[d] || 0) + 1;
        });
        return Object.entries(byDay).map(([date, count]) => ({ date, count }));
      };

      setRegistrationData(groupByDay(recentProfiles as any));
      setOrdersData(groupByDay(recentOrders as any));
    };
    load();
  }, [dateLocale]);

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-8">{t("admin.dashboard.title")}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin.dashboard.totalSellers")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalSellers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin.dashboard.activeLots")}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.activeLots}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin.dashboard.openDisputes")}</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${metrics.openDisputes > 0 ? "text-destructive" : "text-green-600"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${metrics.openDisputes > 0 ? "text-destructive" : "text-green-600"}`}>
              {metrics.openDisputes}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin.dashboard.resolvedThisMonth")}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.resolvedThisMonth}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.dashboard.recentSellers")}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSellers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("admin.dashboard.noRecentSellers")}</p>
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
                        {new Date(s.created_at).toLocaleDateString(dateLocale)}
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
            <CardTitle>{t("admin.dashboard.openDisputesTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {openDisputes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("admin.dashboard.noOpenDisputes")}</p>
            ) : (
              <div className="space-y-2">
                {openDisputes.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-md hover:bg-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{d.reason}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {d.buyer_name} → {d.seller_company} · {relativeDate(d.opened_at)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold whitespace-nowrap">
                      {d.amount.toLocaleString(dateLocale)} €
                    </p>
                    <button
                      onClick={() => navigate("/admin/commandes")}
                      className="text-xs font-medium text-primary hover:underline whitespace-nowrap"
                    >
                      {t("admin.dashboard.resolve")} →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              {t("admin.dashboard.registrationsChart")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={registrationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.15)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              {t("admin.dashboard.ordersChart")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ordersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
