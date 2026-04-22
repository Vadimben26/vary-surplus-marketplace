import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { DisputeResolutionPanel } from "@/components/admin/DisputeResolutionPanel";

interface OrderRow {
  id: string;
  lot_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  commission: number;
  status: string;
  created_at: string;
  stripe_payment_intent_id: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  confirmed_at: string | null;
  lot_title: string;
  buyer_name: string;
  seller_name: string;
}

const STATUSES = [
  "disputed",
  "pending_payment",
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "confirmed",
  "refunded",
  "cancelled",
];

export default function AdminOrders() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<string>("disputed");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const localeMap: Record<string, string> = { fr: "fr-FR", en: "en-GB", es: "es-ES" };
  const dateLocale = localeMap[i18n.language] || "fr-FR";

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending_payment: "bg-gray-500 hover:bg-gray-600",
      paid: "bg-blue-500 hover:bg-blue-600",
      preparing: "bg-blue-500 hover:bg-blue-600",
      shipped: "bg-amber-500 hover:bg-amber-600",
      delivered: "bg-amber-500 hover:bg-amber-600",
      confirmed: "bg-green-600 hover:bg-green-700",
      disputed: "bg-red-600 hover:bg-red-700",
      refunded: "bg-gray-500 hover:bg-gray-600",
      cancelled: "bg-gray-500 hover:bg-gray-600",
    };
    return <Badge className={map[status] || ""}>{t(`admin.status.${status}`, status)}</Badge>;
  };

  const load = async () => {
    setLoading(true);
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    const lotIds = [...new Set((ordersData ?? []).map((o: any) => o.lot_id))];
    const profileIds = [
      ...new Set([
        ...(ordersData ?? []).map((o: any) => o.buyer_id),
        ...(ordersData ?? []).map((o: any) => o.seller_id),
      ]),
    ];

    const [{ data: lots }, { data: profiles }] = await Promise.all([
      lotIds.length ? supabase.from("lots").select("id, title").in("id", lotIds) : Promise.resolve({ data: [] as any[] }),
      profileIds.length
        ? supabase.from("profiles").select("id, company_name, full_name").in("id", profileIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const lotsMap = new Map((lots ?? []).map((l: any) => [l.id, l.title]));
    const profilesMap = new Map(
      (profiles ?? []).map((p: any) => [p.id, p.company_name || p.full_name || "—"])
    );

    setOrders(
      (ordersData ?? []).map((o: any) => ({
        id: o.id,
        lot_id: o.lot_id,
        buyer_id: o.buyer_id,
        seller_id: o.seller_id,
        amount: o.amount,
        commission: o.commission,
        status: o.status,
        created_at: o.created_at,
        stripe_payment_intent_id: o.stripe_payment_intent_id,
        tracking_number: o.tracking_number,
        shipped_at: o.shipped_at,
        delivered_at: o.delivered_at,
        confirmed_at: o.confirmed_at,
        lot_title: lotsMap.get(o.lot_id) || "—",
        buyer_name: profilesMap.get(o.buyer_id) || "—",
        seller_name: profilesMap.get(o.seller_id) || "—",
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (tab === "all") return orders;
    return orders.filter((o) => o.status === tab);
  }, [orders, tab]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("admin.orders.copied"));
  };

  const triggerDisputeAlert = async (orderId: string) => {
    await supabase.functions.invoke("send-dispute-alert", { body: { orderId } });
    toast.success(t("admin.orders.alertSent"));
  };

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-6">{t("admin.orders.title")}</h1>

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">{t("admin.orders.tabs.all")}</TabsTrigger>
          {STATUSES.map((s) => (
            <TabsTrigger key={s} value={s}>
              {t(`admin.status.${s}`, s)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="border rounded-md bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>{t("admin.orders.table.lot")}</TableHead>
              <TableHead>{t("admin.orders.table.buyer")}</TableHead>
              <TableHead>{t("admin.orders.table.seller")}</TableHead>
              <TableHead className="text-right">{t("admin.orders.table.amount")}</TableHead>
              <TableHead className="text-right">{t("admin.orders.table.commission")}</TableHead>
              <TableHead>{t("admin.orders.table.status")}</TableHead>
              <TableHead>{t("admin.orders.table.date")}</TableHead>
              <TableHead className="text-right">{t("admin.orders.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  {t("admin.loading")}
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  {t("admin.orders.empty")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => (
                <>
                  <TableRow key={o.id}>
                    <TableCell>
                      <button
                        onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                        className="p-1 hover:bg-accent rounded"
                      >
                        {expanded === o.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{o.lot_title}</TableCell>
                    <TableCell className="text-sm">{o.buyer_name}</TableCell>
                    <TableCell className="text-sm">{o.seller_name}</TableCell>
                    <TableCell className="text-right">{Number(o.amount).toLocaleString(dateLocale)} €</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {Number(o.commission).toLocaleString(dateLocale)} €
                    </TableCell>
                    <TableCell>{statusBadge(o.status)}</TableCell>
                    <TableCell className="text-sm">{new Date(o.created_at).toLocaleDateString(dateLocale)}</TableCell>
                    <TableCell className="text-right space-x-2 whitespace-nowrap">
                      {o.status === "disputed" && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => triggerDisputeAlert(o.id)}>
                            {t("admin.orders.notify")}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setResolvingId(resolvingId === o.id ? null : o.id);
                              setExpanded(o.id);
                            }}
                          >
                            {resolvingId === o.id ? t("admin.orders.close") : t("admin.orders.resolveDispute")}
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                  {expanded === o.id && (
                    <TableRow key={`${o.id}-detail`}>
                      <TableCell colSpan={9} className="bg-muted/50">
                        {resolvingId === o.id && o.status === "disputed" ? (
                          <DisputeResolutionPanel
                            order={o}
                            onResolved={() => {
                              setResolvingId(null);
                              load();
                            }}
                          />
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{t("admin.orders.details.stripePI")}</span>
                              <code className="text-xs">{o.stripe_payment_intent_id || "—"}</code>
                              {o.stripe_payment_intent_id && (
                                <button
                                  onClick={() => copyToClipboard(o.stripe_payment_intent_id!)}
                                  className="p-1 hover:bg-accent rounded"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            <div>
                              <span className="font-medium">{t("admin.orders.details.trackingNumber")} </span>
                              {o.tracking_number || "—"}
                            </div>
                            <div>
                              <span className="font-medium">{t("admin.orders.details.shippedAt")} </span>
                              {o.shipped_at ? new Date(o.shipped_at).toLocaleString(dateLocale) : "—"}
                            </div>
                            <div>
                              <span className="font-medium">{t("admin.orders.details.deliveredAt")} </span>
                              {o.delivered_at ? new Date(o.delivered_at).toLocaleString(dateLocale) : "—"}
                            </div>
                            <div>
                              <span className="font-medium">{t("admin.orders.details.confirmedAt")} </span>
                              {o.confirmed_at ? new Date(o.confirmed_at).toLocaleString(dateLocale) : "—"}
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
