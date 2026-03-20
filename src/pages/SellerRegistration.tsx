import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Upload, Eye, Filter, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import varyLogo from "@/assets/vary-logo.png";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const productCategoryKeys = ["casual", "sport", "business", "luxury", "premium", "kids"] as const;
const volumeKeys = ["under100", "100_500", "500_2000", "2000_10000", "over10000"] as const;
const channelKeys = ["whatsapp", "email", "phone"] as const;

const referralSources = [
  "Google", "Facebook / Instagram", "TikTok", "LinkedIn",
  "Chat GPT / Claude / Gemini", "Blog", "Recommandation d'un ami",
  "Un responsable commercial m'a contacté",
];

const visibilityLocations = ["France", "Espagne", "Italie", "Allemagne", "Pays-Bas", "Portugal", "Belgique", "Royaume-Uni", "Pologne", "Roumanie", "Suède", "Autriche", "Grèce", "Tchéquie", "Danemark", "Irlande", "Hongrie", "Croatie", "Bulgarie", "Finlande", "Slovaquie", "Lituanie", "Lettonie", "Slovénie", "Estonie", "Chypre", "Luxembourg", "Malte"];
const visibilityStoreTypes = ["Magasin physique", "Magasin en ligne", "Revendeur marketplace", "Revendeur réseaux sociaux", "Grossiste / Distributeur"];
const visibilityRevenues = ["Moins de 50.000 €", "50.000 – 200.000 €", "200.000 – 500.000 €", "500.000 – 1M €", "Plus de 1M €"];

const SellerRegistration = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signUp, user, profile, updateProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedVolume, setSelectedVolume] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("");
  const [selectedReferral, setSelectedReferral] = useState("");
  const [warehouseFiles, setWarehouseFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "", password: "",
    companyName: "", vatCode: "", siret: "", address: "", city: "",
    country: "France", postalCode: "", website: "", description: "", warehouseLocation: "",
  });
  const [visibilityMode, setVisibilityMode] = useState<"all" | "filtered">("all");
  const [visLocations, setVisLocations] = useState<string[]>([]);
  const [visStoreTypes, setVisStoreTypes] = useState<string[]>([]);
  const [visRevenues, setVisRevenues] = useState<string[]>([]);

  const totalSteps = 5;
  const isAlreadyLoggedIn = !!user;

  const update = (field: string, value: string) => setFormData((prev) => ({ ...prev, [field]: value }));
  const toggle = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) return t("sellerReg.validation.firstLastName");
      if (!formData.phone.trim()) return t("sellerReg.validation.phone");
      if (!isAlreadyLoggedIn) {
        if (!formData.email.trim()) return t("sellerReg.validation.email");
        if (!formData.password || formData.password.length < 6) return t("sellerReg.validation.password");
      }
    }
    if (step === 2) {
      if (!formData.companyName.trim()) return t("sellerReg.validation.companyName");
      if (!formData.vatCode.trim()) return t("sellerReg.validation.vatCode");
      if (!formData.address.trim()) return t("sellerReg.validation.address");
      if (!formData.city.trim()) return t("sellerReg.validation.city");
    }
    if (step === 3) {
      if (selectedCategories.length === 0) return t("sellerReg.validation.productType");
      if (!selectedVolume) return t("sellerReg.validation.volume");
    }
    if (step === 4) {
      if (!selectedChannel) return t("sellerReg.validation.channel");
    }
    return null;
  };

  const nextStep = async () => {
    const error = validateStep();
    if (error) { toast.error(error); return; }

    if (step === totalSteps) {
      setSubmitting(true);
      try {
        if (isAlreadyLoggedIn) {
          const newType = profile?.user_type === "buyer" ? "both" : "seller";
          await updateProfile({ user_type: newType as any, full_name: `${formData.firstName} ${formData.lastName}`, phone: formData.phone, company_name: formData.companyName, company_description: formData.description, siret: formData.siret });
          toast.success(t("sellerReg.profileActivated"));
        } else {
          if (!formData.email || !formData.password) { toast.error(t("sellerReg.validation.email")); setSubmitting(false); return; }
          const { error } = await signUp(formData.email, formData.password);
          if (error) { toast.error(error.message); setSubmitting(false); return; }
          await new Promise((r) => setTimeout(r, 1000));
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser) {
            await supabase.from("profiles").update({ user_type: "seller", full_name: `${formData.firstName} ${formData.lastName}`, phone: formData.phone, company_name: formData.companyName, company_description: formData.description, siret: formData.siret }).eq("user_id", newUser.id);
          }
          toast.success(t("sellerReg.checkEmail"));
        }
      } catch (err: any) { toast.error(err.message || "Error"); setSubmitting(false); return; }
      setSubmitting(false);
      setStep(totalSteps + 1);
    } else {
      setStep((s) => Math.min(s + 1, totalSteps + 1));
    }
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const stepHeader = (
    <div className="mb-6">
      <p className="text-muted-foreground text-sm">{t("sellerReg.createAccount")}</p>
      <h2 className="font-heading text-xl font-bold text-foreground">{t("sellerReg.step")} {step} / {totalSteps}</h2>
      <div className="flex gap-1 mt-3">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <Link to="/"><img src={varyLogo} alt="Vary" className="h-10 w-auto" /></Link>
        <Link to="/inscription" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("common.backToChoice")}</Link>
      </header>

      <div className="flex-1 flex items-start justify-center py-8 px-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">{t("sellerReg.title")}</h1>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">{t("sellerReg.subtitle")}</p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {stepHeader}
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2"><label className="text-sm font-semibold text-foreground">{t("sellerReg.firstName")} *</label><Input placeholder="Jean" value={formData.firstName} onChange={(e) => update("firstName", e.target.value)} /></div>
                    <div className="space-y-2"><label className="text-sm font-semibold text-foreground">{t("sellerReg.lastName")} *</label><Input placeholder="Dupont" value={formData.lastName} onChange={(e) => update("lastName", e.target.value)} /></div>
                  </div>
                  {!isAlreadyLoggedIn && (
                    <>
                      <div className="space-y-2"><label className="text-sm font-semibold text-foreground">{t("sellerReg.email")} *</label><Input type="email" placeholder="jean@entreprise.com" value={formData.email} onChange={(e) => update("email", e.target.value)} /></div>
                      <div className="space-y-2"><label className="text-sm font-semibold text-foreground">{t("sellerReg.password")} *</label><Input type="password" placeholder={t("sellerReg.passwordPlaceholder")} value={formData.password} onChange={(e) => update("password", e.target.value)} /></div>
                    </>
                  )}
                  <div className="space-y-2"><label className="text-sm font-semibold text-foreground">{t("sellerReg.phone")} *</label><Input type="tel" placeholder="+33 6 12 34 56 78" value={formData.phone} onChange={(e) => update("phone", e.target.value)} /></div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {stepHeader}
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2"><label className="text-sm font-semibold text-foreground">{t("sellerReg.companyName")} *</label><Input placeholder="Mon Entreprise SAS" value={formData.companyName} onChange={(e) => update("companyName", e.target.value)} /></div>
                    <div className="space-y-2"><label className="text-sm font-semibold text-foreground">{t("sellerReg.vatCode")} *</label><Input placeholder="FR07830946877" value={formData.vatCode} onChange={(e) => update("vatCode", e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2"><label className="text-sm font-semibold text-foreground">{t("sellerReg.siret")}</label><Input placeholder="123 456 789 00001" value={formData.siret} onChange={(e) => update("siret", e.target.value)} /></div>
                    <div className="space-y-2"><label className="text-sm font-semibold text-foreground">{t("sellerReg.website")}</label><Input placeholder="https://monsite.com" value={formData.website} onChange={(e) => update("website", e.target.value)} /></div>
                  </div>
                  <div className="space-y-2"><label className="text-sm font-semibold text-foreground">{t("sellerReg.address")} *</label><Input placeholder="8 Avenue du Stade de France" value={formData.address} onChange={(e) => update("address", e.target.value)} /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2"><label className="text-sm font-semibold text-foreground">{t("sellerReg.city")} *</label><Input placeholder="Paris" value={formData.city} onChange={(e) => update("city", e.target.value)} /></div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t("sellerReg.country")} *</label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground" value={formData.country} onChange={(e) => update("country", e.target.value)}>
                        {["France", "Belgique", "Allemagne", "Espagne", "Italie", "Pays-Bas", "Portugal", "Autre"].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2"><label className="text-sm font-semibold text-foreground">{t("sellerReg.postalCode")}</label><Input placeholder="75001" className="max-w-[200px]" value={formData.postalCode} onChange={(e) => update("postalCode", e.target.value)} /></div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {stepHeader}
                <div className="space-y-8">
                  <div>
                    <label className="text-sm font-semibold text-foreground">{t("sellerReg.productTypes")} *</label>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                      {productCategoryKeys.map((c) => (
                        <label key={c} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={selectedCategories.includes(c)} onCheckedChange={() => toggle(selectedCategories, setSelectedCategories, c)} />
                          <span className="text-sm text-foreground">{t(`sellerReg.productCategories.${c}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground">{t("sellerReg.monthlyVolume")} *</label>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                      {volumeKeys.map((v) => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="volume" checked={selectedVolume === v} onChange={() => setSelectedVolume(v)} className="accent-primary w-4 h-4" />
                          <span className="text-sm text-foreground">{t(`sellerReg.volumeOptions.${v}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2"><label className="text-sm font-semibold text-foreground">{t("sellerReg.warehouseLocation")}</label><Input placeholder="Ex: Paris, France" value={formData.warehouseLocation} onChange={(e) => update("warehouseLocation", e.target.value)} /></div>
                  <div className="space-y-2"><label className="text-sm font-semibold text-foreground">{t("sellerReg.describeActivity")}</label><Textarea placeholder="..." className="resize-none" rows={3} value={formData.description} onChange={(e) => update("description", e.target.value)} /></div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("sellerReg.warehouseImage")}</label>
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/40 transition-colors cursor-pointer">
                      <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">{t("sellerReg.uploadImage")}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("sellerReg.uploadFormat")}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {stepHeader}
                <div className="space-y-8">
                  <div>
                    <label className="text-sm font-semibold text-foreground">{t("sellerReg.speakEnglish")} *</label>
                    <div className="flex gap-6 mt-3">
                      {["yes", "no"].map((v) => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="english" checked={speaksEnglish === v} onChange={() => setSpeaksEnglish(v)} className="accent-primary w-4 h-4" />
                          <span className="text-sm text-foreground">{t(`sellerReg.${v}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground">{t("sellerReg.preferredChannel")} *</label>
                    <div className="flex gap-6 mt-3">
                      {channelKeys.map((c) => (
                        <label key={c} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="channel" checked={selectedChannel === c} onChange={() => setSelectedChannel(c)} className="accent-primary w-4 h-4" />
                          <span className="text-sm text-foreground">{t(`buyerReg.channels.${c}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground">{t("sellerReg.howDidYouHear")} *</label>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                      {referralSources.map((r) => (
                        <label key={r} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="referral" checked={selectedReferral === r} onChange={() => setSelectedReferral(r)} className="accent-primary w-4 h-4" />
                          <span className="text-sm text-foreground">{r}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                      <div>
                        <span className="text-sm font-medium text-foreground">{t("sellerReg.emailWhatsappConsent")}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("sellerReg.consentText")}</p>
                      </div>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {stepHeader}
                <div className="space-y-8">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                      <Eye className="h-5 w-5 text-primary" />
                      {t("sellerReg.visibilityTitle")}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">{t("sellerReg.visibilityDesc")}</p>
                    <div className="space-y-4">
                      <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${visibilityMode === "all" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`} onClick={() => setVisibilityMode("all")}>
                        <input type="radio" name="visibility" checked={visibilityMode === "all"} onChange={() => setVisibilityMode("all")} className="accent-primary w-4 h-4 mt-1" />
                        <div>
                          <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /><span className="font-semibold text-foreground">{t("sellerReg.visibleAll")}</span></div>
                          <p className="text-xs text-muted-foreground mt-1">{t("sellerReg.visibleAllDesc")}</p>
                        </div>
                      </label>
                      <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${visibilityMode === "filtered" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`} onClick={() => setVisibilityMode("filtered")}>
                        <input type="radio" name="visibility" checked={visibilityMode === "filtered"} onChange={() => setVisibilityMode("filtered")} className="accent-primary w-4 h-4 mt-1" />
                        <div>
                          <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-primary" /><span className="font-semibold text-foreground">{t("sellerReg.filterBuyers")}</span></div>
                          <p className="text-xs text-muted-foreground mt-1">{t("sellerReg.filterBuyersDesc")}</p>
                        </div>
                      </label>
                    </div>
                  </div>
                  {visibilityMode === "filtered" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-6 pl-2 border-l-2 border-primary/20">
                      <div>
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.buyerLocation")}</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {visibilityLocations.map((loc) => (
                            <button key={loc} type="button" onClick={() => toggle(visLocations, setVisLocations, loc)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${visLocations.includes(loc) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:border-primary/40"}`}>
                              {loc}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.storeType")}</label>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                          {visibilityStoreTypes.map((st) => (
                            <label key={st} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox checked={visStoreTypes.includes(st)} onCheckedChange={() => toggle(visStoreTypes, setVisStoreTypes, st)} />
                              <span className="text-sm text-foreground">{st}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.minRevenue")}</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {visibilityRevenues.map((r) => (
                            <button key={r} type="button" onClick={() => toggle(visRevenues, setVisRevenues, r)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${visRevenues.includes(r) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:border-primary/40"}`}>
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {step === totalSteps + 1 && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-heading text-2xl font-bold text-foreground mb-3">{t("sellerReg.thanksTitle")}</h2>
                <p className="text-muted-foreground mb-2 max-w-md mx-auto">
                  {isAlreadyLoggedIn ? t("sellerReg.profileActivated") : t("sellerReg.checkEmail")}
                </p>
                <button
                  onClick={() => navigate(isAlreadyLoggedIn ? "/seller" : "/connexion")}
                  className="mt-6 px-8 py-3 bg-foreground text-background font-semibold rounded-md hover:opacity-90 transition-opacity"
                >
                  {isAlreadyLoggedIn ? t("sellerReg.goToSellerDashboard") : t("common.login")}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {step <= totalSteps && (
            <div className="flex items-center gap-4 mt-10">
              {step > 1 && (
                <button onClick={prevStep} className="px-8 py-3 bg-foreground text-background font-semibold rounded-md hover:opacity-90 transition-opacity">
                  {t("common.back_button")}
                </button>
              )}
              <button onClick={nextStep} disabled={submitting} className="px-8 py-3 bg-foreground text-background font-semibold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50">
                {submitting ? t("common.sending") : step === totalSteps ? t("common.submit") : t("common.next")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerRegistration;
