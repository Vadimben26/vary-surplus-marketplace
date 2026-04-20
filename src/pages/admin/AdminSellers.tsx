import { useEffect, useState } from "react";
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

const statusBadge = (status: string) => {
  if (status === "approved") return <Badge className="bg-green-600 hover:bg-green-700">Approuvé</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejeté</Badge>;
  return <Badge className="bg-amber-500 hover:bg-amber-600">En attente</Badge>;
};

const getSignedUrl = async (bucket: string, path: string): Promise<string | null> => {
  // path may already be a full URL
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
};

export default function AdminSellers() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [docsOpen, setDocsOpen] = useState(false);
  const [docsUrls, setDocsUrls] = useState<{ company?: string | null; auth?: string | null } | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<SellerRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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
      toast.error("Erreur lors de l'approbation");
      return;
    }
    toast.success(`${s.company_name || s.full_name} approuvé — email envoyé`);
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
      toast.error("Motif requis");
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
      toast.error("Erreur lors du rejet");
      return;
    }
    toast.success("Vendeur rejeté");
    setRejectOpen(false);
    setRejectTarget(null);
    load();
  };

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-6">Vendeurs</h1>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Tous</TabsTrigger>
          <TabsTrigger value="pending">En attente</TabsTrigger>
          <TabsTrigger value="approved">Approuvés</TabsTrigger>
          <TabsTrigger value="rejected">Rejetés</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="border rounded-md bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Société</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Inscription</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Aucun vendeur dans cette catégorie.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow key={s.profile_id}>
                  <TableCell className="font-medium">{s.company_name || "—"}</TableCell>
                  <TableCell>{s.full_name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.email || "—"}</TableCell>
                  <TableCell>{new Date(s.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>{statusBadge(s.validation_status)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => viewDocs(s)}>
                      Voir documents
                    </Button>
                    {s.validation_status !== "approved" && (
                      <Button size="sm" onClick={() => approve(s)}>
                        Approuver
                      </Button>
                    )}
                    {s.validation_status !== "rejected" && (
                      <Button size="sm" variant="destructive" onClick={() => openReject(s)}>
                        Rejeter
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
            <DialogTitle>Documents du vendeur</DialogTitle>
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
                  📄 Document société (Kbis / extrait)
                </a>
              )}
              {docsUrls?.auth && (
                <a
                  href={docsUrls.auth}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-3 border rounded-md hover:bg-accent"
                >
                  📄 Document d'authenticité (autorisation marque)
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun document fourni.</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter le vendeur</DialogTitle>
            <DialogDescription>
              Précisez le motif du rejet. Il sera enregistré dans le dossier du vendeur.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motif du rejet…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
