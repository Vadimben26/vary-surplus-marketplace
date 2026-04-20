import { useEffect, useMemo, useState } from "react";
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
  return <Badge className={map[status] || ""}>{status}</Badge>;
};

const statusLabel: Record<string, string> = {
  disputed: "En litige",
  pending_payment: "En attente",
  paid: "Payé",
  preparing: "Préparation",
  shipped: "Expédié",
  delivered: "Livré",
  confirmed: "Confirmé",
  refunded: "Remboursé",
  cancelled: "Annulé",
};

export default function AdminOrders() {
  const [tab, setTab] = useState<string>("disputed");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    order: OrderRow;
    type: "refund" | "release";
  } | null>(null);

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
    toast.success("Copié");
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { order, type } = confirmAction;
    const newStatus = type === "refund" ? "refunded" : "confirmed";
    const { error } = await supabase.from("orders").update({ status: newStatus as any }).eq("id", order.id);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      setConfirmAction(null);
      return;
    }
    if (type === "refund") {
      toast.success("Remboursement à traiter manuellement via Stripe Dashboard");
    } else {
      toast.success("Fonds libérés — transfert à déclencher via Stripe Dashboard");
    }
    setConfirmAction(null);
    load();
  };

  const triggerDisputeAlert = async (orderId: string) => {
    await supabase.functions.invoke("send-dispute-alert", { body: { orderId } });
    toast.success("Alerte litige envoyée à l'équipe admin");
  };

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-6">Commandes</h1>

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">Toutes</TabsTrigger>
          {STATUSES.map((s) => (
            <TabsTrigger key={s} value={s}>
              {statusLabel[s]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="border rounded-md bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Lot</TableHead>
              <TableHead>Acheteur</TableHead>
              <TableHead>Vendeur</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Aucune commande.
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
                    <TableCell className="text-right">{Number(o.amount).toLocaleString("fr-FR")} €</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {Number(o.commission).toLocaleString("fr-FR")} €
                    </TableCell>
                    <TableCell>{statusBadge(o.status)}</TableCell>
                    <TableCell className="text-sm">{new Date(o.created_at).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="text-right space-x-2 whitespace-nowrap">
                      {o.status === "disputed" && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => triggerDisputeAlert(o.id)}>
                            Notifier
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmAction({ order: o, type: "refund" })}
                          >
                            Rembourser acheteur
                          </Button>
                          <Button size="sm" onClick={() => setConfirmAction({ order: o, type: "release" })}>
                            Libérer fonds vendeur
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                  {expanded === o.id && (
                    <TableRow key={`${o.id}-detail`}>
                      <TableCell colSpan={9} className="bg-muted/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Stripe PaymentIntent:</span>
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
                            <span className="font-medium">N° de suivi: </span>
                            {o.tracking_number || "—"}
                          </div>
                          <div>
                            <span className="font-medium">Expédié le: </span>
                            {o.shipped_at ? new Date(o.shipped_at).toLocaleString("fr-FR") : "—"}
                          </div>
                          <div>
                            <span className="font-medium">Livré le: </span>
                            {o.delivered_at ? new Date(o.delivered_at).toLocaleString("fr-FR") : "—"}
                          </div>
                          <div>
                            <span className="font-medium">Confirmé le: </span>
                            {o.confirmed_at ? new Date(o.confirmed_at).toLocaleString("fr-FR") : "—"}
                          </div>
                        </div>
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
