import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle2, FileText, Loader2 } from "lucide-react";
import AdminLayout from "./AdminLayout";

interface Claim {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  description: string;
  evidence_urls: string[];
  claim_amount: number | null;
  status: string;
  resolution_note: string | null;
  opened_at: string;
  resolved_at: string | null;
  buyer_name: string;
  seller_name: string;
  lot_title: string;
}

export default function AdminTransportClaims() {
  const { t, i18n } = useTranslation();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [working, setWorking] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const localeMap: Record<string, string> = { fr: "fr-FR", en: "en-GB", es: "es-ES" };
  const dateLocale = localeMap[i18n.language] || "fr-FR";

  const load = async () => {
    setLoading(true);
    const { data: rows } = await (supabase as any)
      .from("transport_claims")
      .select("*")
      .order("opened_at", { ascending: false });

    const profileIds = [
      ...new Set([
        ...(rows || []).map((r: any) => r.buyer_id),
        ...(rows || []).map((r: any) => r.seller_id),
      ]),
    ];
    const orderIds = [...new Set((rows || []).map((r: any) => r.order_id))];
    const [{ data: profiles }, { data: orders }] = await Promise.all([
      profileIds.length
        ? supabase.from("profiles").select("id, full_name, company_name").in("id", profileIds as string[])
        : Promise.resolve({ data: [] as any[] }),
      orderIds.length
        ? supabase.from("orders").select("id, lot_id").in("id", orderIds as string[])
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const lotIds = [...new Set((orders || []).map((o: any) => o.lot_id))];
    const { data: lots } = lotIds.length
      ? await supabase.from("lots").select("id, title").in("id", lotIds as string[])
      : { data: [] };
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    const orderMap = new Map((orders || []).map((o: any) => [o.id, o]));
    const lotMap = new Map((lots || []).map((l: any) => [l.id, l]));

    const enriched: Claim[] = (rows || []).map((r: any) => {
      const buyer = profileMap.get(r.buyer_id) as any;
      const seller = profileMap.get(r.seller_id) as any;
      const order = orderMap.get(r.order_id) as any;
      const lot = order ? (lotMap.get(order.lot_id) as any) : null;
      return {
        ...r,
        buyer_name: buyer?.company_name || buyer?.full_name || "—",
        seller_name: seller?.company_name || seller?.full_name || "—",
        lot_title: lot?.title || "—",
      };
    });
    setClaims(enriched);
    setLoading(false);

    // Pre-sign evidence
    const urls: Record<string, string> = {};
    for (const c of enriched) {
      for (const path of c.evidence_urls || []) {
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

  const filtered = claims.filter((c) => c.status === tab);

  const resolve = async (claim: Claim) => {
    const note = (notes[claim.id] || "").trim();
    if (note.length < 10) {
      toast.error(t("admin.dispute.noteRequired"));
      return;
    }
    const amountStr = (amounts[claim.id] || "").trim().replace(",", ".");
    const amount = amountStr ? parseFloat(amountStr) : undefined;
    setWorking(claim.id);
    try {
      const { data, error } = await supabase.functions.invoke("resolve-transport-claim", {
        body: { claimId: claim.id, resolutionNote: note, claimAmount: amount },
      });
      if (error || (data && (data as any).error)) {
        throw new Error(error?.message || (data as any)?.error);
      }
      toast.success(t("adminPanel.transportClaims.resolvedToast"));
      await load();
    } catch (e: any) {
      toast.error(e?.message || t("admin.dispute.resolutionError"));
    } finally {
      setWorking(null);
    }
  };

  const statusBadge = (status: string) => {
    if (status === "resolved") return <Badge className="bg-green-600 hover:bg-green-700">{t("adminPanel.transportClaims.resolved")}</Badge>;
    return <Badge className="bg-amber-500 hover:bg-amber-600">{t("adminPanel.transportClaims.open")}</Badge>;
  };

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-6">{t("adminPanel.transportClaims.title")}</h1>

      <div className="flex gap-2 mb-6">
        {(["open", "resolved"] as const).map((s) => (
          <Button
            key={s}
            variant={tab === s ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(s)}
          >
            {t(`adminPanel.transportClaims.${s}`)} ({claims.filter((c) => c.status === s).length})
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            {t("adminPanel.transportClaims.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{c.lot_title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.buyer_name} → {c.seller_name} ·{" "}
                      {new Date(c.opened_at).toLocaleString(dateLocale)}
                    </p>
                  </div>
                  {statusBadge(c.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm whitespace-pre-wrap bg-muted/40 p-3 rounded-md border border-border">
                    {c.description}
                  </p>
                </div>

                {c.claim_amount != null && Number(c.claim_amount) > 0 && (
                  <div className="text-sm">
                    <span className="font-semibold">{t("adminPanel.transportClaims.amount")} : </span>
                    {Number(c.claim_amount).toFixed(2)} €
                  </div>
                )}

                {c.evidence_urls?.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {c.evidence_urls.map((path, i) => {
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
                )}

                {c.status === "open" ? (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <label className="text-xs font-semibold text-foreground">
                      {t("adminPanel.transportClaims.amount")} (€)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amounts[c.id] || ""}
                      onChange={(e) =>
                        setAmounts((prev) => ({ ...prev, [c.id]: e.target.value }))
                      }
                      placeholder="0.00"
                    />
                    <label className="text-xs font-semibold text-foreground">
                      {t("adminPanel.transportClaims.resolveLabel")}
                    </label>
                    <Textarea
                      value={notes[c.id] || ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      rows={3}
                    />
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                      disabled={working === c.id || (notes[c.id] || "").trim().length < 10}
                      onClick={() => resolve(c)}
                    >
                      {working === c.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                      )}
                      {t("adminPanel.transportClaims.resolve")}
                    </Button>
                  </div>
                ) : (
                  c.resolution_note && (
                    <div className="rounded-md border border-border bg-muted/40 p-3">
                      <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
                        {t("admin.dispute.noteLabel")}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{c.resolution_note}</p>
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
