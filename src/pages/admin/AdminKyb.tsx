import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ExternalLink, FileText, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "./AdminLayout";

type KybStatus = "none" | "pending" | "verified" | "rejected";

interface KybRow {
  id: string;
  user_id: string;
  kyb_status: KybStatus;
  kyb_trust_score: number | null;
  kyb_submitted_at: string | null;
  kyb_documents: string[] | null;
  kyb_storefront_url: string | null;
  kyb_vat_number: string | null;
  kyb_rejection_reason: string | null;
  kyb_extracted_data: Record<string, unknown> | null;
  // joined profile
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  buyer_access_level: number;
}

const getSignedUrl = async (path: string): Promise<string | null> => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage
    .from("buyer-kyb-documents")
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
};

export default function AdminKyb() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<"all" | "pending" | "verified" | "rejected">("pending");
  const [rows, setRows] = useState<KybRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRow, setOpenRow] = useState<KybRow | null>(null);
  const [docUrls, setDocUrls] = useState<string[]>([]);

  const localeMap: Record<string, string> = { fr: "fr-FR", en: "en-GB", es: "es-ES" };
  const dateLocale = localeMap[i18n.language] || "fr-FR";

  const load = async () => {
    setLoading(true);
    // RLS allows admins to read every row (policy added in matching migration).
    const { data: prefs, error: prefsErr } = await supabase
      .from("buyer_preferences")
      .select(
        "id, user_id, kyb_status, kyb_trust_score, kyb_submitted_at, kyb_documents, kyb_storefront_url, kyb_vat_number, kyb_rejection_reason, kyb_extracted_data"
      )
      .neq("kyb_status", "none")
      .order("kyb_submitted_at", { ascending: false, nullsFirst: false });

    if (prefsErr) {
      toast.error(prefsErr.message);
      setLoading(false);
      return;
    }

    const userIds = (prefs ?? []).map((p) => p.user_id);
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name, company_name, email, buyer_access_level")
      .in("user_id", userIds);

    const profileMap: Record<string, any> = {};
    (profilesData ?? []).forEach((p) => {
      profileMap[p.user_id] = p;
    });

    const merged: KybRow[] = (prefs ?? []).map((p: any) => ({
      id: p.id,
      user_id: p.user_id,
      kyb_status: (p.kyb_status as KybStatus) ?? "none",
      kyb_trust_score: p.kyb_trust_score,
      kyb_submitted_at: p.kyb_submitted_at,
      kyb_documents: p.kyb_documents,
      kyb_storefront_url: p.kyb_storefront_url,
      kyb_vat_number: p.kyb_vat_number,
      kyb_rejection_reason: p.kyb_rejection_reason,
      kyb_extracted_data: p.kyb_extracted_data,
      full_name: profileMap[p.user_id]?.full_name ?? null,
      company_name: profileMap[p.user_id]?.company_name ?? null,
      email: profileMap[p.user_id]?.email ?? null,
      buyer_access_level: profileMap[p.user_id]?.buyer_access_level ?? 1,
    }));

    setRows(merged);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (tab === "all" ? rows : rows.filter((r) => r.kyb_status === tab)),
    [rows, tab]
  );

  const counts = useMemo(
    () => ({
      all: rows.length,
      pending: rows.filter((r) => r.kyb_status === "pending").length,
      verified: rows.filter((r) => r.kyb_status === "verified").length,
      rejected: rows.filter((r) => r.kyb_status === "rejected").length,
    }),
    [rows]
  );

  const statusBadge = (s: KybStatus) => {
    if (s === "verified")
      return <Badge className="bg-green-600 hover:bg-green-700">{t("adminKyb.status.verified", "Vérifié")}</Badge>;
    if (s === "rejected")
      return <Badge variant="destructive">{t("adminKyb.status.rejected", "Rejeté")}</Badge>;
    if (s === "pending")
      return <Badge className="bg-amber-500 hover:bg-amber-600">{t("adminKyb.status.pending", "En cours")}</Badge>;
    return <Badge variant="secondary">{t("adminKyb.status.none", "Aucun")}</Badge>;
  };

  const openReview = async (row: KybRow) => {
    setOpenRow(row);
    const urls: string[] = [];
    for (const path of row.kyb_documents ?? []) {
      const u = await getSignedUrl(path);
      if (u) urls.push(u);
    }
    setDocUrls(urls);
  };

  const overrideAccess = async (row: KybRow, level: 1 | 2, status: KybStatus) => {
    const { error: profErr } = await supabase
      .from("profiles")
      .update({ buyer_access_level: level })
      .eq("user_id", row.user_id);
    const { error: prefsErr } = await supabase
      .from("buyer_preferences")
      .update({ kyb_status: status })
      .eq("user_id", row.user_id);
    if (profErr || prefsErr) {
      toast.error((profErr || prefsErr)?.message || "Erreur");
      return;
    }
    toast.success(
      level === 2
        ? t("adminKyb.overrideApproved", "Acheteur passé au Niveau 2 vérifié.")
        : t("adminKyb.overrideRejected", "Acheteur ramené au Niveau 1.")
    );
    setOpenRow(null);
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("adminKyb.title", "Vérifications KYB acheteurs")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              "adminKyb.subtitle",
              "Tout est automatique. N'intervenez ici qu'en cas de contestation d'un acheteur."
            )}
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="pending">
              {t("adminKyb.tabs.pending", "En cours")} ({counts.pending})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              {t("adminKyb.tabs.rejected", "Rejetés")} ({counts.rejected})
            </TabsTrigger>
            <TabsTrigger value="verified">
              {t("adminKyb.tabs.verified", "Vérifiés")} ({counts.verified})
            </TabsTrigger>
            <TabsTrigger value="all">
              {t("adminKyb.tabs.all", "Tous")} ({counts.all})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("adminKyb.col.buyer", "Acheteur")}</TableHead>
                <TableHead>{t("adminKyb.col.email", "Email")}</TableHead>
                <TableHead>{t("adminKyb.col.status", "Statut")}</TableHead>
                <TableHead>{t("adminKyb.col.score", "Score")}</TableHead>
                <TableHead>{t("adminKyb.col.level", "Niveau")}</TableHead>
                <TableHead>{t("adminKyb.col.submitted", "Soumis le")}</TableHead>
                <TableHead className="text-right">{t("adminKyb.col.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t("common.loading", "Chargement…")}
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t("adminKyb.empty", "Aucune soumission dans cette catégorie.")}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.company_name || row.full_name || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.email || "—"}</TableCell>
                  <TableCell>{statusBadge(row.kyb_status)}</TableCell>
                  <TableCell>
                    {row.kyb_trust_score != null ? `${row.kyb_trust_score}/100` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.buyer_access_level >= 2 ? "default" : "secondary"}>
                      {t("adminKyb.level", "Niveau")} {row.buyer_access_level}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.kyb_submitted_at
                      ? new Date(row.kyb_submitted_at).toLocaleDateString(dateLocale)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openReview(row)}>
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      {t("adminKyb.review", "Examiner")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={!!openRow} onOpenChange={(o) => !o && setOpenRow(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {openRow?.company_name || openRow?.full_name || "—"}
              </DialogTitle>
              <DialogDescription>{openRow?.email}</DialogDescription>
            </DialogHeader>

            {openRow && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("adminKyb.col.status", "Statut")}
                    </p>
                    <div className="mt-1">{statusBadge(openRow.kyb_status)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("adminKyb.col.score", "Score")}
                    </p>
                    <p className="font-medium mt-1">
                      {openRow.kyb_trust_score != null ? `${openRow.kyb_trust_score}/100` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("adminKyb.vat", "Numéro de TVA")}
                    </p>
                    <p className="font-medium mt-1">{openRow.kyb_vat_number || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("adminKyb.storefront", "Vitrine")}
                    </p>
                    <p className="font-medium mt-1 truncate">
                      {openRow.kyb_storefront_url ? (
                        <a
                          href={openRow.kyb_storefront_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {openRow.kyb_storefront_url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                </div>

                {openRow.kyb_rejection_reason && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-xs font-semibold text-destructive">
                      {t("adminKyb.rejectionReason", "Motif du rejet automatique")}
                    </p>
                    <p className="text-foreground mt-1">{openRow.kyb_rejection_reason}</p>
                  </div>
                )}

                {docUrls.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {t("adminKyb.documents", "Documents soumis")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {docUrls.map((u, i) => (
                        <a
                          key={u}
                          href={u}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/40 text-xs hover:bg-muted transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {t("adminKyb.document", "Document")} {i + 1}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {openRow.kyb_extracted_data && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("adminKyb.extracted", "Données extraites par l'IA")}
                    </p>
                    <pre className="text-xs bg-muted/40 rounded-lg p-3 overflow-x-auto border border-border">
                      {JSON.stringify(openRow.kyb_extracted_data, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                  <Button
                    size="sm"
                    onClick={() => overrideAccess(openRow, 2, "verified")}
                    disabled={openRow.kyb_status === "verified" && openRow.buyer_access_level >= 2}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                    {t("adminKyb.forceApprove", "Forcer Niveau 2")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => overrideAccess(openRow, 1, "rejected")}
                    disabled={openRow.buyer_access_level === 1 && openRow.kyb_status === "rejected"}
                  >
                    <ShieldX className="h-3.5 w-3.5 mr-1.5" />
                    {t("adminKyb.forceReject", "Ramener Niveau 1")}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
