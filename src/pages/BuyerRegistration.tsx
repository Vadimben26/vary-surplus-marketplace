import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import varyLogo from "@/assets/vary-logo.png";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const storeTypeKeys = ["physical", "online", "marketplace", "social", "wholesale"] as const;
const storeTypesRequiringPhotosKeys = ["physical"];
const storeTypesRequiringLinkKeys = ["online", "marketplace", "social"];

const euCountries = [
  "Allemagne", "Autriche", "Belgique", "Bulgarie", "Chypre", "Croatie",
  "Danemark", "Espagne", "Estonie", "Finlande", "France", "Grèce",
  "Hongrie", "Irlande", "Italie", "Lettonie", "Lituanie", "Luxembourg",
  "Malte", "Pays-Bas", "Pologne", "Portugal", "République tchèque",
  "Roumanie", "Slovaquie", "Slovénie", "Suède",
];

const genderKeys = ["women", "men", "kids"] as const;
const revenueKeys = ["none", "under50k", "50k200k", "200k500k", "500k1m", "over1m"] as const;
const channelKeys = ["whatsapp", "email", "phone"] as const;

const referralSources = [
  "Google", "Facebook / Instagram", "TikTok", "LinkedIn",
  "Chat GPT / Claude / Gemini", "Blog", "Recommandation d'un ami",
  "Un responsable commercial m'a contacté",
];

const BuyerRegistration = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signUp, user, profile, updateProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStoreTypes, setSelectedStoreTypes] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [selectedRevenue, setSelectedRevenue] = useState("");
  const [storeLink, setStoreLink] = useState("");
  const [storePhotos, setStorePhotos] = useState<File[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [selectedReferral, setSelectedReferral] = useState("");
  const [consent, setConsent] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "", password: "",
    companyName: "", vatCode: "", address: "", city: "", country: "France", postalCode: "", specialRequests: "",
  });

  const totalSteps = 4;
  const isAlreadyLoggedIn = !!user;

  const update = (field: string, value: string) => setFormData((prev) => ({ ...prev, [field]: value }));
  const toggle = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) return t("buyerReg.validation.firstLastName");
      if (!formData.phone.trim()) return t("buyerReg.validation.phone");
      if (!isAlreadyLoggedIn) {
        if (!formData.email.trim()) return t("buyerReg.validation.email");
        if (!formData.password || formData.password.length < 6) return t("buyerReg.validation.password");
      }
    }
    if (step === 2) {
      if (!formData.companyName.trim()) return t("buyerReg.validation.companyName");
      if (!formData.vatCode.trim()) return t("buyerReg.validation.vatCode");
      if (!formData.address.trim()) return t("buyerReg.validation.address");
      if (!formData.city.trim()) return t("buyerReg.validation.city");
    }
    if (step === 3) {
      if (selectedGenders.length === 0) return t("buyerReg.validation.category");
      if (!selectedRevenue) return t("buyerReg.validation.revenue");
      if (selectedStoreTypes.length === 0) return t("buyerReg.validation.storeType");
      if (selectedStoreTypes.some((st) => storeTypesRequiringLinkKeys.includes(st)) && !storeLink.trim()) return t("buyerReg.validation.storeLink");
      if (selectedStoreTypes.some((st) => storeTypesRequiringPhotosKeys.includes(st)) && storePhotos.length === 0) return t("buyerReg.validation.storePhotos");
    }
    if (step === 4) {
      if (!selectedChannel) return t("buyerReg.validation.channel");
      if (!selectedReferral) return t("buyerReg.validation.referral");
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
          const newType = profile?.user_type === "seller" ? "both" : "buyer";
          await updateProfile({ user_type: newType as any, full_name: `${formData.firstName} ${formData.lastName}`, phone: formData.phone, company_name: formData.companyName });
          toast.success(t("buyerReg.profileActivated"));
        } else {
          const { error } = await signUp(formData.email, formData.password);
          if (error) { toast.error(error.message); setSubmitting(false); return; }
          await new Promise((r) => setTimeout(r, 1000));
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser) {
            await supabase.from("profiles").update({ user_type: "buyer", full_name: `${formData.firstName} ${formData.lastName}`, phone: formData.phone, company_name: formData.companyName }).eq("user_id", newUser.id);
          }
          toast.success(t("buyerReg.checkEmail"));
        }
      } catch (err: any) { toast.error(err.message || "Error"); setSubmitting(false); return; }
      setSubmitting(false);
      setStep(totalSteps + 1);
    } else {
      setStep((s) => Math.min(s + 1, totalSteps + 1));
    }
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const stepContent = (
    <div className="mb-6">
      <p className="text-muted-foreground text-sm">{t("buyerReg.createAccount")}</p>
      <h2 className="font-heading text-xl font-bold text-foreground">{t("buyerReg.step")} {step}</h2>
      <div className="h-px bg-border mt-3" />
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
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">{t("buyerReg.title")}</h1>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">{t("buyerReg.subtitle")}</p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {stepContent}
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t("buyerReg.firstName")} *</label>
                      <Input placeholder="Jean" value={formData.firstName} onChange={(e) => update("firstName", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t("buyerReg.lastName")} *</label>
                      <Input placeholder="Dupont" value={formData.lastName} onChange={(e) => update("lastName", e.target.value)} />
                    </div>
                  </div>
                  {!isAlreadyLoggedIn && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">{t("buyerReg.email")} *</label>
                        <Input type="email" placeholder="jean@entreprise.com" value={formData.email} onChange={(e) => update("email", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">{t("buyerReg.password")} *</label>
                        <Input type="password" placeholder={t("buyerReg.passwordPlaceholder")} value={formData.password} onChange={(e) => update("password", e.target.value)} />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("buyerReg.phone")} *</label>
                    <Input type="tel" placeholder="+33 6 12 34 56 78" value={formData.phone} onChange={(e) => update("phone", e.target.value)} />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {stepContent}
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t("buyerReg.companyName")} *</label>
                      <Input placeholder="Mon Entreprise SAS" value={formData.companyName} onChange={(e) => update("companyName", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t("buyerReg.vatCode")} *</label>
                      <Input placeholder="FR07830946877" value={formData.vatCode} onChange={(e) => update("vatCode", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("buyerReg.billingAddress")} *</label>
                    <Input placeholder="8 Avenue du Stade de France" value={formData.address} onChange={(e) => update("address", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t("buyerReg.city")} *</label>
                      <Input placeholder="Paris" value={formData.city} onChange={(e) => update("city", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t("buyerReg.country")} *</label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground"
                        value={formData.country}
                        onChange={(e) => update("country", e.target.value)}
                      >
                        {euCountries.map((c) => (<option key={c}>{c}</option>))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("buyerReg.postalCode")}</label>
                    <Input placeholder="75001" className="max-w-[200px]" value={formData.postalCode} onChange={(e) => update("postalCode", e.target.value)} />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {stepContent}
                <div className="space-y-8">
                  <div>
                    <label className="text-sm font-semibold text-foreground">{t("buyerReg.whatCategories")} *</label>
                    <div className="flex flex-wrap gap-4 mt-3">
                      {genderKeys.map((g) => (
                        <label key={g} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={selectedGenders.includes(g)} onCheckedChange={() => toggle(selectedGenders, setSelectedGenders, g)} />
                          <span className="text-sm text-foreground">{t(`buyerReg.genders.${g}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground">{t("buyerReg.annualRevenue")} *</label>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                      {revenueKeys.map((r) => (
                        <label key={r} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="revenue" checked={selectedRevenue === r} onChange={() => setSelectedRevenue(r)} className="accent-primary w-4 h-4" />
                          <span className="text-sm text-foreground">{t(`buyerReg.revenueOptions.${r}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground">{t("buyerReg.selectStoreType")} *</label>
                    <div className="space-y-2 mt-3">
                      {storeTypeKeys.map((st) => (
                        <label key={st} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={selectedStoreTypes.includes(st)} onCheckedChange={() => toggle(selectedStoreTypes, setSelectedStoreTypes, st)} />
                          <span className="text-sm text-foreground">{t(`buyerReg.storeTypes.${st}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {selectedStoreTypes.some((st) => storeTypesRequiringLinkKeys.includes(st)) && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t("buyerReg.storeLink")} *</label>
                      <Input placeholder="https://www.monsite.com" value={storeLink} onChange={(e) => setStoreLink(e.target.value)} />
                    </div>
                  )}
                  {selectedStoreTypes.some((st) => storeTypesRequiringPhotosKeys.includes(st)) && (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-foreground">{t("buyerReg.storePhotos")} *</label>
                      <input type="file" accept="image/*" multiple onChange={(e) => setStorePhotos(Array.from(e.target.files || []))}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                      {storePhotos.length > 0 && <p className="text-xs text-muted-foreground">{storePhotos.length} {t("buyerReg.photosSelected")}</p>}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">{t("buyerReg.storeLinkOptional")}</label>
                        <Input placeholder="https://www.monsite.com" value={storeLink} onChange={(e) => setStoreLink(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {stepContent}
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("buyerReg.specialRequests")}</label>
                    <Textarea placeholder="Text..." className="resize-none" rows={4} value={formData.specialRequests} onChange={(e) => update("specialRequests", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground">{t("buyerReg.preferredChannel")} *</label>
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
                    <label className="text-sm font-semibold text-foreground">{t("buyerReg.howDidYouHear")} *</label>
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
                        <span className="text-sm font-medium text-foreground">{t("buyerReg.emailWhatsappConsent")}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("buyerReg.consentText")}</p>
                      </div>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {step === totalSteps + 1 && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-heading text-2xl font-bold text-foreground mb-3">{t("buyerReg.thanksTitle")}</h2>
                <p className="text-muted-foreground mb-2 max-w-md mx-auto">
                  {isAlreadyLoggedIn ? t("buyerReg.profileActivated") : t("buyerReg.checkEmail")}
                </p>
                <button
                  onClick={() => navigate(isAlreadyLoggedIn ? "/marketplace" : "/connexion")}
                  className="mt-6 px-8 py-3 bg-foreground text-background font-semibold rounded-md hover:opacity-90 transition-opacity"
                >
                  {isAlreadyLoggedIn ? t("buyerReg.goToMarketplace") : t("common.login")}
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

export default BuyerRegistration;
