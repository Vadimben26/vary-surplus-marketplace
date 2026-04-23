import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, XCircle, FileText, Loader2 } from "lucide-react";
import AdminLayout from "./AdminLayout";

interface Appeal {
  id: string;
  seller_id: string;
  dispute_id: string | null;
  message: string;
  evidence_urls: string[];
  status: string;
  admin_decision: string | null;
  created_at: string;
  decided_at: string | null;
  seller_name: string;
  seller_company: string | null;
}

export default function AdminAppeals() {
  const { t, i18n } = useTranslation();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [working, setWorking] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const localeMap: Record<string, string> = { fr: "fr-FR", en: "en-GB", es: "es-ES" };
  const dateLocale = localeMap[i18n.language] || "fr-FR";

  const load = async () => {
    setLoading(true);
    const { data: rows } = await (supabase as any)
      .from("seller_appeals")
      .select("*")
      .order("created_at", { ascending: false });

    const sellerIds = [...new Set((rows || []).map((r: any) => r.seller_id))];
    const { data: profiles } = sellerIds.length
      ? await supabase.from("profiles").select("id, full_name, company_name").in("id", sellerIds as string[])
      : { data: [] };
    const map = new Map((profiles || []).map((p: any) => [p.id, p]));

    const enriched = (rows || []).map((r: any) => {
      const p = map.get(r.seller_id) as any;
      return {
        ...r,
        seller_name: p?.full_name || "—",
        seller_company: p?.company_name || null,
      } as Appeal;
    });
    setAppeals(enriched);
    setLoading(false);

    // Pre-sign evidence URLs for current tab
    const urls: Record<string, string> = {};
    for (const a of enriched) {
      for (const path of a.evidence_urls || []) {
        if (signedUrls[path]) continue;
        const { data: signed } = await supabase.storage
          .from("dispute-evidence")
          .createSignedUrl(path, 3600);
        if (signed?.signedUrl) urls[path] = signed.signedUrl;
      }
    }
    if (Object.keys(urls).length) setSignedUrls((prev) => ({ ...prev, ...urls }));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = appeals.filter((a) => a.status === tab);

  const decide = async (appeal: Appeal, decision: "approve" | "reject") => {
    const adminMessage = (decisions[appeal.id] || "").trim();
    if (adminMessage.length < 10) {
      toast.error(t("admin.dispute.noteRequired"));
      return;
    }
    setWorking(appeal.id);
    try {
      const { data, error } = await supabase.functions.invoke("resolve-appeal", {
        body: { appealId: appeal.id, decision, adminMessage },
      });
      if (error || (data && (data as any).error)) {
        throw new Error(error?.message || (data as any)?.error);
      }
      toast.success(
        decision === "approve"
          ? t("adminPanel.appeals.approvedToast")
          : t("adminPanel.appeals.rejectedToast")
      );
      await load();
    } catch (e: any) {
      toast.error(e?.message || t("admin.dispute.resolutionError"));
    } finally {
      setWorking(null);
    }
  };

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-600 hover:bg-green-700">{t("adminPanel.appeals.approved")}</Badge>;
    if (status === "rejected") return <Badge variant="destructive">{t("adminPanel.appeals.rejected")}</Badge>;
    return <Badge className="bg-amber-500 hover:bg-amber-600">{t("adminPanel.appeals.pending")}</Badge>;
  };

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-6">{t("adminPanel.appeals.title")}</h1>

      <div className="flex gap-2 mb-6">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <Button
            key={s}
            variant={tab === s ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(s)}
          >
            {t(`adminPanel.appeals.${s}`)} ({appeals.filter((a) => a.status === s).length})
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            {t("adminPanel.appeals.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">
                      {a.seller_company || a.seller_name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(a.created_at).toLocaleString(dateLocale)}
                    </p>
                  </div>
                  {statusBadge(a.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground tracking-wide mb-1">
                    {t("adminPanel.appeals.messageLabel")}
                  </p>
                  <p className="text-sm whitespace-pre-wrap bg-muted/40 p-3 rounded-md border border-border">
                    {a.message}
                  </p>
                </div>

                {a.evidence_urls?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground tracking-wide mb-2">
                      {t("adminPanel.appeals.evidenceLabel")} ({a.evidence_urls.length})
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {a.evidence_urls.map((path, i) => {
                        const url = signedUrls[path];
                        const isImage = /\.(jpe?g|png|gif|webp|heic)$/i.test(path);
                        return url ? (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block aspect-square rounded-md border border-border bg-background overflow-hidden hover:border-primary"
                          >
                            {isImage ? (
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2">
                                <FileText className="h-6 w-6" />
                              </div>
                            )}
                          </a>
                        ) : (
                          <div key={i} className="aspect-square bg-muted rounded-md animate-pulse" />
                        );
                      })}
                    </div>
                  </div>
                )}

                {a.status === "pending" ? (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <label className="text-xs font-semibold text-foreground">
                      {t("adminPanel.appeals.decisionLabel")}
                    </label>
                    <Textarea
                      value={decisions[a.id] || ""}
                      onChange={(e) =>
                        setDecisions((prev) => ({ ...prev, [a.id]: e.target.value }))
                      }
                      rows={3}
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        disabled={working === a.id || (decisions[a.id] || "").trim().length < 10}
                        onClick={() => decide(a, "approve")}
                      >
                        {working === a.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                        )}
                        {t("adminPanel.appeals.approve")}
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        disabled={working === a.id || (decisions[a.id] || "").trim().length < 10}
                        onClick={() => decide(a, "reject")}
                      >
                        {working === a.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1" />
                        )}
                        {t("adminPanel.appeals.reject")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  a.admin_decision && (
                    <div className="rounded-md border border-border bg-muted/40 p-3">
                      <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
                        {t("appeal.decisionLabel")}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{a.admin_decision}</p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
