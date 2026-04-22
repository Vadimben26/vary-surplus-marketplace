import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import AdminLayout from "./AdminLayout";

interface LotRow {
  id: string;
  title: string;
  brand: string;
  price: number;
  units: number;
  status: string;
  created_at: string;
  seller_company: string;
  has_active_order: boolean;
}

const ACTIVE_STATUSES = ["pending_payment", "paid", "preparing", "shipped"];

export default function AdminLots() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<"all" | "active" | "draft" | "sold">("all");
  const [search, setSearch] = useState("");
  const [lots, setLots] = useState<LotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<LotRow | null>(null);

  const localeMap: Record<string, string> = { fr: "fr-FR", en: "en-GB", es: "es-ES" };
  const dateLocale = localeMap[i18n.language] || "fr-FR";

  const statusBadge = (status: string) => {
    if (status === "active")
      return <Badge className="bg-green-600 hover:bg-green-700">{t("admin.status.active")}</Badge>;
    if (status === "draft") return <Badge variant="secondary">{t("admin.status.draft")}</Badge>;
    if (status === "sold") return <Badge>{t("admin.status.sold")}</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const load = async () => {
    setLoading(true);
    const { data: lotsData } = await supabase
      .from("lots")
      .select("id, title, brand, price, units, status, created_at, seller_id")
      .order("created_at", { ascending: false });

    const sellerIds = [...new Set((lotsData ?? []).map((l: any) => l.seller_id))];
    const lotIds = (lotsData ?? []).map((l: any) => l.id);

    const [{ data: sellers }, { data: orders }] = await Promise.all([
      sellerIds.length
        ? supabase.from("profiles").select("id, company_name, full_name").in("id", sellerIds)
        : Promise.resolve({ data: [] as any[] }),
      lotIds.length
        ? supabase.from("orders").select("lot_id, status").in("lot_id", lotIds).in("status", ACTIVE_STATUSES as any)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const sellersMap = new Map((sellers ?? []).map((s: any) => [s.id, s.company_name || s.full_name || "—"]));
    const activeOrdersSet = new Set((orders ?? []).map((o: any) => o.lot_id));

    setLots(
      (lotsData ?? []).map((l: any) => ({
        id: l.id,
        title: l.title,
        brand: l.brand,
        price: l.price,
        units: l.units,
        status: l.status,
        created_at: l.created_at,
        seller_company: sellersMap.get(l.seller_id) || "—",
        has_active_order: activeOrdersSet.has(l.id),
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return lots.filter((l) => {
      if (tab !== "all" && l.status !== tab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!l.title.toLowerCase().includes(q) && !l.brand.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [lots, tab, search]);

  const setDraft = async (l: LotRow) => {
    const { error } = await supabase.from("lots").update({ status: "draft" }).eq("id", l.id);
    if (error) {
      toast.error(t("admin.lots.genericError"));
      return;
    }
    toast.success(t("admin.lots.draftedToast"));
    load();
  };

  const publishLot = async (l: LotRow) => {
    const { error } = await supabase.from("lots").update({ status: "active" }).eq("id", l.id);
    if (error) {
      toast.error(t("admin.lots.genericError"));
      return;
    }
    toast.success(t("admin.lots.publishedToast"));
    supabase.functions.invoke("match-lot-to-buyers", {
      body: { lotId: l.id },
    }).catch((e) => console.warn("match-lot-to-buyers failed:", e));
    load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("lots").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error(t("admin.lots.deleteError"));
    } else {
      toast.success(t("admin.lots.deletedToast"));
    }
    setDeleteTarget(null);
    load();
  };

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-6">{t("admin.lots.title")}</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-shrink-0">
          <TabsList>
            <TabsTrigger value="all">{t("admin.lots.tabs.all")}</TabsTrigger>
            <TabsTrigger value="active">{t("admin.lots.tabs.active")}</TabsTrigger>
            <TabsTrigger value="draft">{t("admin.lots.tabs.draft")}</TabsTrigger>
            <TabsTrigger value="sold">{t("admin.lots.tabs.sold")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder={t("admin.lots.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="border rounded-md bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.lots.table.title")}</TableHead>
              <TableHead>{t("admin.lots.table.brand")}</TableHead>
              <TableHead>{t("admin.lots.table.seller")}</TableHead>
              <TableHead className="text-right">{t("admin.lots.table.price")}</TableHead>
              <TableHead className="text-right">{t("admin.lots.table.units")}</TableHead>
              <TableHead>{t("admin.lots.table.status")}</TableHead>
              <TableHead>{t("admin.lots.table.createdAt")}</TableHead>
              <TableHead className="text-right">{t("admin.lots.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {t("admin.loading")}
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {t("admin.lots.empty")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium max-w-xs truncate">{l.title}</TableCell>
                  <TableCell>{l.brand || "—"}</TableCell>
                  <TableCell className="text-sm">{l.seller_company}</TableCell>
                  <TableCell className="text-right">{Number(l.price).toLocaleString(dateLocale)} €</TableCell>
                  <TableCell className="text-right">{l.units}</TableCell>
                  <TableCell>{statusBadge(l.status)}</TableCell>
                  <TableCell className="text-sm">{new Date(l.created_at).toLocaleDateString(dateLocale)}</TableCell>
                  <TableCell className="text-right space-x-2 whitespace-nowrap">
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/lot/${l.id}`} target="_blank" rel="noreferrer">
                        {t("admin.lots.view")}
                      </a>
                    </Button>
                    {l.status === "active" && (
                      <Button size="sm" variant="secondary" onClick={() => setDraft(l)}>
                        {t("admin.lots.setDraft")}
                      </Button>
                    )}
                    {l.status === "draft" && (
                      <Button size="sm" onClick={() => publishLot(l)}>
                        {t("admin.lots.publish")}
                      </Button>
                    )}
                    {l.has_active_order ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block">
                            <Button size="sm" variant="destructive" disabled>
                              {t("admin.lots.delete")}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{t("admin.lots.activeOrder")}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(l)}>
                        {t("admin.lots.delete")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.lots.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.lots.deleteDesc", { title: deleteTarget?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.lots.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{t("admin.lots.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
