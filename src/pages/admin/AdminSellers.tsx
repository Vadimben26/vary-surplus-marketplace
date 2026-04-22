import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import AdminLayout from "./AdminLayout";

interface SellerRow {
  profile_id: string;
  user_id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  created_at: string;
  validation_status: string;
  company_document_url: string | null;
  auth_document_url: string | null;
}

const getSignedUrl = async (bucket: string, path: string): Promise<string | null> => {
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
};

export default function AdminSellers() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [tab, setTab] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [docsOpen, setDocsOpen] = useState(false);
  const [docsUrls, setDocsUrls] = useState<{ company?: string | null; auth?: string | null } | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<SellerRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const localeMap: Record<string, string> = { fr: "fr-FR", en: "en-GB", es: "es-ES" };
  const dateLocale = localeMap[i18n.language] || "fr-FR";

  const statusBadge = (status: string) => {
    if (status === "approved")
      return <Badge className="bg-green-600 hover:bg-green-700">{t("admin.status.approved")}</Badge>;
    if (status === "rejected")
      return <Badge variant="destructive">{t("admin.status.rejected")}</Badge>;
    return <Badge className="bg-amber-500 hover:bg-amber-600">{t("admin.status.pending")}</Badge>;
  };

  const load = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, company_name, email, created_at")
      .in("user_type", ["seller", "both"])
      .order("created_at", { ascending: false });

    const userIds = (profiles ?? []).map((p: any) => p.user_id);
    let prefsMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: prefs } = await (supabase.from("seller_preferences") as any)
        .select("user_id, validation_status, company_document_url, auth_document_url")
        .in("user_id", userIds);
      prefsMap = new Map((prefs ?? []).map((p: any) => [p.user_id, p]));
    }

    const rows: SellerRow[] = (profiles ?? []).map((p: any) => {
      const pref = prefsMap.get(p.user_id) || {};
      return {
        profile_id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        company_name: p.company_name,
        email: p.email,
        created_at: p.created_at,
        validation_status: pref.validation_status || "pending",
        company_document_url: pref.company_document_url || null,
        auth_document_url: pref.auth_document_url || null,
      };
    });
    setSellers(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = sellers.filter((s) => tab === "all" || s.validation_status === tab);

  const viewDocs = async (s: SellerRow) => {
    const [company, auth] = await Promise.all([
      s.company_document_url ? getSignedUrl("seller-documents", s.company_document_url) : null,
      s.auth_document_url ? getSignedUrl("seller-documents", s.auth_document_url) : null,
    ]);
    setDocsUrls({ company, auth });
    setDocsOpen(true);
  };

  const approve = async (s: SellerRow) => {
    const { data, error } = await supabase.functions.invoke("send-seller-approved", {
      body: { sellerUserId: s.user_id },
    });
    if (error || (data as any)?.error) {
      toast.error(t("admin.sellers.approveError"));
      return;
    }
    toast.success(t("admin.sellers.approvedToast", { name: s.company_name || s.full_name || "" }));
    load();
  };

  const openReject = (s: SellerRow) => {
    setRejectTarget(s);
    setRejectReason("");
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      toast.error(t("admin.sellers.reasonRequired"));
      return;
    }
    const { error } = await (supabase.from("seller_preferences") as any)
      .update({
        validation_status: "rejected",
        validation_note: rejectReason,
        validated_at: new Date().toISOString(),
        validated_by: profile?.id,
        approval_status: "rejected",
        rejection_reason: rejectReason,
      })
      .eq("user_id", rejectTarget.user_id);
    if (error) {
      toast.error(t("admin.sellers.rejectError"));
      return;
    }
    toast.success(t("admin.sellers.rejected"));
    setRejectOpen(false);
    setRejectTarget(null);
    load();
  };

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-6">{t("admin.sellers.title")}</h1>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">{t("admin.sellers.tabs.all")}</TabsTrigger>
          <TabsTrigger value="pending">{t("admin.sellers.tabs.pending")}</TabsTrigger>
          <TabsTrigger value="approved">{t("admin.sellers.tabs.approved")}</TabsTrigger>
          <TabsTrigger value="rejected">{t("admin.sellers.tabs.rejected")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="border rounded-md bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.sellers.table.company")}</TableHead>
              <TableHead>{t("admin.sellers.table.name")}</TableHead>
              <TableHead>{t("admin.sellers.table.email")}</TableHead>
              <TableHead>{t("admin.sellers.table.registration")}</TableHead>
              <TableHead>{t("admin.sellers.table.status")}</TableHead>
              <TableHead className="text-right">{t("admin.sellers.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t("admin.loading")}
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t("admin.sellers.empty")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow key={s.profile_id}>
                  <TableCell className="font-medium">{s.company_name || "—"}</TableCell>
                  <TableCell>{s.full_name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.email || "—"}</TableCell>
                  <TableCell>{new Date(s.created_at).toLocaleDateString(dateLocale)}</TableCell>
                  <TableCell>{statusBadge(s.validation_status)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => viewDocs(s)}>
                      {t("admin.sellers.viewDocs")}
                    </Button>
                    {s.validation_status !== "approved" && (
                      <Button size="sm" onClick={() => approve(s)}>
                        {t("admin.sellers.approve")}
                      </Button>
                    )}
                    {s.validation_status !== "rejected" && (
                      <Button size="sm" variant="destructive" onClick={() => openReject(s)}>
                        {t("admin.sellers.reject")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.sellers.docsTitle")}</DialogTitle>
          </DialogHeader>
          {docsUrls?.company || docsUrls?.auth ? (
            <div className="space-y-3">
              {docsUrls?.company && (
                <a
                  href={docsUrls.company}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-3 border rounded-md hover:bg-accent"
                >
                  {t("admin.sellers.docsCompany")}
                </a>
              )}
              {docsUrls?.auth && (
                <a
                  href={docsUrls.auth}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-3 border rounded-md hover:bg-accent"
                >
                  {t("admin.sellers.docsAuth")}
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("admin.sellers.docsEmpty")}</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.sellers.rejectTitle")}</DialogTitle>
            <DialogDescription>{t("admin.sellers.rejectDesc")}</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t("admin.sellers.rejectPlaceholder")}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              {t("admin.sellers.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              {t("admin.sellers.confirmReject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
