import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Upload, Eye, Filter, Globe, Package, Truck, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import varyLogo from "@/assets/vary-logo.png";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LegalFooter from "@/components/LegalFooter";

const STORAGE_KEY = "vary_seller_reg_draft";

const EU_COUNTRIES = ["France", "Belgique", "Allemagne", "Espagne", "Italie", "Pays-Bas", "Portugal", "Royaume-Uni", "Pologne", "Roumanie", "Suède", "Autriche", "Grèce", "Tchéquie", "Danemark", "Irlande", "Hongrie", "Croatie", "Bulgarie", "Finlande", "Slovaquie", "Lituanie", "Lettonie", "Slovénie", "Estonie", "Chypre", "Luxembourg", "Malte"];

const RadioOption = ({ name, value, selected, onSelect, label }: { name: string; value: string; selected: string; onSelect: (v: string) => void; label: string }) => (
  <label className="flex items-center gap-2 cursor-pointer">
    <input type="radio" name={name} checked={selected === value} onChange={() => onSelect(value)} className="accent-primary w-4 h-4" />
    <span className="text-sm text-foreground">{label}</span>
  </label>
);

const ChipSelect = ({ options, selected, onToggle, multi = false }: { options: string[]; selected: string | string[]; onToggle: (v: string) => void; multi?: boolean }) => (
  <div className="flex flex-wrap gap-2 mt-2">
    {options.map((o) => {
      const isActive = multi ? (selected as string[]).includes(o) : selected === o;
      return (
        <button key={o} type="button" onClick={() => onToggle(o)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${isActive ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:border-primary/40"}`}>
          {o}
        </button>
      );
    })}
  </div>
);

const SectionTitle = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2 mt-2">{icon} {label}</h3>
);

const referralSources = [
  "Google", "Facebook / Instagram", "TikTok", "LinkedIn",
  "Chat GPT / Claude / Gemini", "Blog", "Recommandation d'un ami",
  "Un responsable commercial m'a contacté",
];

const SellerRegistration = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signUp, user, profile, updateProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const totalSteps = 5;
  const isAlreadyLoggedIn = !!user;

  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  };

  const draft = loadDraft();

  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email || "" }));
    }
  }, [user]);

  const [formData, setFormData] = useState(draft?.formData ?? {
    firstName: "", lastName: "", email: "", phone: "", password: "",
    companyName: "", vatCode: "", siret: "", website: "", address: "", city: "",
    country: "France", postalCode: "", warehouseLocation: "", description: "", avgRetailPrice: "",
  });

  const [businessType, setBusinessType] = useState(draft?.businessType ?? "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(draft?.selectedCategories ?? []);
  const [monthlyVolume, setMonthlyVolume] = useState(draft?.monthlyVolume ?? "");
  const [lotSize, setLotSize] = useState(draft?.lotSize ?? "");
  const [brandsText, setBrandsText] = useState(draft?.brandsText ?? "");
  const [sellsUnbranded, setSellsUnbranded] = useState(draft?.sellsUnbranded ?? "");
  const [yearsInBusiness, setYearsInBusiness] = useState(draft?.yearsInBusiness ?? "");
  const [clientTypes, setClientTypes] = useState<string[]>(draft?.clientTypes ?? []);
  const [warehouseFiles, setWarehouseFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(draft?.consent ?? false);
  const [selectedReferral, setSelectedReferral] = useState(draft?.selectedReferral ?? "");
  const [buyerTypes, setBuyerTypes] = useState<string[]>(draft?.buyerTypes ?? []);
  const [buyerBudget, setBuyerBudget] = useState(draft?.buyerBudget ?? "");
  const [minOrderSize, setMinOrderSize] = useState(draft?.minOrderSize ?? "");
  const [targetMarket, setTargetMarket] = useState(draft?.targetMarket ?? "");
  const [targetCountries, setTargetCountries] = useState<string[]>(draft?.targetCountries ?? []);
  const [visibilityMode, setVisibilityMode] = useState<"all" | "filtered">(draft?.visibilityMode ?? "all");

  // Auto-save
  useEffect(() => {
    const data = {
      formData, businessType, selectedCategories, monthlyVolume, lotSize, brandsText,
      sellsUnbranded, yearsInBusiness, clientTypes, consent, selectedReferral,
      buyerTypes, buyerBudget, minOrderSize, targetMarket, targetCountries, visibilityMode, step,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [step, formData, businessType, selectedCategories, monthlyVolume, lotSize, brandsText,
    sellsUnbranded, yearsInBusiness, clientTypes, consent, selectedReferral,
    buyerTypes, buyerBudget, minOrderSize, targetMarket, targetCountries, visibilityMode]);

  useEffect(() => {
    if (draft?.step && draft.step <= totalSteps) setStep(draft.step);
  }, []);

  const update = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: "" }));
  };
  const toggle = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const validateField = (field: string, value: string) => {
    if (!value.trim()) {
      setFieldErrors(prev => ({ ...prev, [field]: t("sellerReg.validation.required") || "Ce champ est requis" }));
    } else {
      setFieldErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const FieldError = ({ field }: { field: string }) => {
    if (!fieldErrors[field]) return null;
    return <p className="text-xs text-destructive mt-1">{fieldErrors[field]}</p>;
  };

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) return t("sellerReg.validation.firstLastName");
      if (!formData.email.trim() && !isAlreadyLoggedIn) return t("sellerReg.validation.email");
      if (!formData.phone.trim()) return t("sellerReg.validation.phone");
      if (!isAlreadyLoggedIn && (!formData.password || formData.password.length < 6)) return t("sellerReg.validation.password");
    }
    if (step === 2) {
      if (!formData.companyName.trim()) return t("sellerReg.validation.companyName");
      if (!businessType) return t("sellerReg.validation.businessType");
      if (!formData.vatCode.trim()) return t("sellerReg.validation.vatCode");
      if (!formData.address.trim()) return t("sellerReg.validation.address");
      if (!formData.city.trim()) return t("sellerReg.validation.city");
    }
    if (step === 3) {
      if (selectedCategories.length === 0) return t("sellerReg.validation.productType");
      if (!monthlyVolume) return t("sellerReg.validation.volume");
      if (!lotSize) return t("sellerReg.validation.lotSize");
    }
    if (step === 4) {
      if (!formData.warehouseLocation.trim()) return t("sellerReg.validation.warehouse");
      if (warehouseFiles.length === 0) return t("sellerReg.validation.warehouseImage");
    }
    return null;
  };

  const saveSellerPreferences = async (userId: string) => {
    const { error } = await supabase.from("seller_preferences" as any).upsert({
      user_id: userId,
      business_type: businessType,
      website: formData.website,
      categories: selectedCategories,
      monthly_volume: monthlyVolume,
      lot_size: lotSize,
      avg_retail_price: formData.avgRetailPrice,
      brands_text: brandsText,
      sells_unbranded: sellsUnbranded,
      warehouse_location: formData.warehouseLocation,
      years_in_business: yearsInBusiness,
      client_types: clientTypes,
      description: formData.description,
      consent,
      buyer_types: buyerTypes,
      buyer_budget: buyerBudget,
      min_order_size: minOrderSize,
      target_market: targetMarket,
      target_countries: targetCountries,
      visibility_mode: visibilityMode,
      referral_source: selectedReferral,
      country: formData.country,
      vat_code: formData.vatCode,
      address: formData.address,
      city: formData.city,
      postal_code: formData.postalCode,
    } as any, { onConflict: "user_id" } as any);
    if (error) console.error("Error saving seller preferences:", error);
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
          await saveSellerPreferences(user!.id);
          toast.success(t("sellerReg.profileActivated"));
        } else {
          const { error } = await signUp(formData.email, formData.password);
          if (error) { toast.error(error.message); setSubmitting(false); return; }
          await new Promise((r) => setTimeout(r, 1000));
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser) {
            await supabase.from("profiles").update({ user_type: "seller", full_name: `${formData.firstName} ${formData.lastName}`, phone: formData.phone, company_name: formData.companyName, company_description: formData.description, siret: formData.siret }).eq("user_id", newUser.id);
            await saveSellerPreferences(newUser.id);
          }
          toast.success(t("sellerReg.checkEmail"));
        }
        localStorage.removeItem(STORAGE_KEY);
      } catch (err: any) { toast.error(err.message || "Error"); setSubmitting(false); return; }
      setSubmitting(false);
      setStep(totalSteps + 1);
    } else {
      setStep((s) => Math.min(s + 1, totalSteps + 1));
    }
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const stepTitlesArr = [
    t("sellerReg.stepTitles.identity"),
    t("sellerReg.stepTitles.company"),
    t("sellerReg.stepTitles.products"),
    t("sellerReg.stepTitles.logistics"),
    t("sellerReg.stepTitles.preferences"),
  ];

  const progressPercent = Math.round((step / totalSteps) * 100);

  const stepHeader = (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        {stepTitlesArr.map((title, i) => (
          <div key={i} className={`flex items-center gap-1.5 ${i + 1 === step ? "text-primary" : i + 1 < step ? "text-primary/60" : "text-muted-foreground/40"}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i + 1 === step ? "bg-primary text-primary-foreground" : i + 1 < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
              {i + 1 < step ? "✓" : i + 1}
            </div>
            <span className="text-xs font-medium hidden md:inline">{title}</span>
            {i < stepTitlesArr.length - 1 && <div className={`w-8 h-px ${i + 1 < step ? "bg-primary/40" : "bg-border"}`} />}
          </div>
        ))}
      </div>
      <div className="mt-1 mb-1">
        <Progress value={progressPercent} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1">{progressPercent}% {t("common.completed") || "complété"}</p>
      </div>
      <h2 className="font-heading text-lg font-bold text-foreground mt-3">{stepTitlesArr[step - 1]}</h2>
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
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t("sellerReg.firstName")} *</label>
                      <Input placeholder="Jean" value={formData.firstName} onChange={(e) => update("firstName", e.target.value)} onBlur={() => validateField("firstName", formData.firstName)} />
                      <FieldError field="firstName" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t("sellerReg.lastName")} *</label>
                      <Input placeholder="Dupont" value={formData.lastName} onChange={(e) => update("lastName", e.target.value)} onBlur={() => validateField("lastName", formData.lastName)} />
                      <FieldError field="lastName" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("sellerReg.email")} *</label>
                    <Input type="email" placeholder="jean@entreprise.com" value={formData.email} onChange={(e) => update("email", e.target.value)} onBlur={() => validateField("email", formData.email)} />
                    <FieldError field="email" />
                  </div>
                  {!isAlreadyLoggedIn && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t("sellerReg.password")} *</label>
                      <Input type="password" placeholder={t("sellerReg.passwordPlaceholder")} value={formData.password} onChange={(e) => update("password", e.target.value)} onBlur={() => validateField("password", formData.password)} />
                      <FieldError field="password" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("sellerReg.phone")} *</label>
                    <Input type="tel" placeholder="+33 6 12 34 56 78" value={formData.phone} onChange={(e) => update("phone", e.target.value)} onBlur={() => validateField("phone", formData.phone)} />
                    <FieldError field="phone" />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {stepHeader}
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("sellerReg.companyName")} *</label>
                    <Input placeholder="Mon Entreprise SAS" value={formData.companyName} onChange={(e) => update("companyName", e.target.value)} onBlur={() => validateField("companyName", formData.companyName)} />
                    <FieldError field="companyName" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground">{t("sellerReg.businessType")} *</label>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                      {["brand", "wholesaler", "distributor", "retailer", "marketplace_seller"].map((bt) => (
                        <RadioOption key={bt} name="businessType" value={bt} selected={businessType} onSelect={setBusinessType} label={t(`sellerReg.businessTypes.${bt}`)} />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t("sellerReg.vatCode")} *</label>
                      <Input placeholder="FR07830946877" value={formData.vatCode} onChange={(e) => update("vatCode", e.target.value)} onBlur={() => validateField("vatCode", formData.vatCode)} />
                      <FieldError field="vatCode" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t("sellerReg.siret")}</label>
                      <Input placeholder="123 456 789 00001" value={formData.siret} onChange={(e) => update("siret", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2"><label className="text-sm font-semibold text-foreground">{t("sellerReg.website")}</label><Input placeholder="https://monsite.com" value={formData.website} onChange={(e) => update("website", e.target.value)} /></div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("sellerReg.address")} *</label>
                    <Input placeholder="8 Avenue du Stade de France" value={formData.address} onChange={(e) => update("address", e.target.value)} onBlur={() => validateField("address", formData.address)} />
                    <FieldError field="address" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t("sellerReg.city")} *</label>
                      <Input placeholder="Paris" value={formData.city} onChange={(e) => update("city", e.target.value)} onBlur={() => validateField("city", formData.city)} />
                      <FieldError field="city" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t("sellerReg.country")} *</label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground" value={formData.country} onChange={(e) => update("country", e.target.value)}>
                        {["France", "Belgique", "Allemagne", "Espagne", "Italie", "Pays-Bas", "Portugal", "Autre"].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2"><label className="text-sm font-semibold text-foreground">{t("sellerReg.postalCode")}</label><Input placeholder="75001" value={formData.postalCode} onChange={(e) => update("postalCode", e.target.value)} /></div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {stepHeader}
                <div className="space-y-8">
                  <div>
                    <SectionTitle icon="🧥" label={t("sellerReg.productCategories.title")} />
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                      {["casual", "sport", "business", "luxury", "premium", "kids"].map((c) => (
                        <label key={c} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={selectedCategories.includes(c)} onCheckedChange={() => toggle(selectedCategories, setSelectedCategories, c)} />
                          <span className="text-sm text-foreground">{t(`sellerReg.productCategories.${c}`)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <SectionTitle icon="📦" label={t("sellerReg.volumeSection")} />
                    <label className="text-sm font-semibold text-foreground mt-3 block">{t("sellerReg.monthlyVolume")} *</label>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                      {["under100", "100_500", "500_2000", "2000_10000", "over10000"].map((v) => (
                        <RadioOption key={v} name="volume" value={v} selected={monthlyVolume} onSelect={setMonthlyVolume} label={t(`sellerReg.volumeOptions.${v}`)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <SectionTitle icon="💰" label={t("sellerReg.avgRetailPrice")} />
                    <div className="space-y-2 mt-3">
                      <label className="text-sm font-semibold text-foreground">{t("sellerReg.avgRetailPriceLabel")}</label>
                      <Input type="text" placeholder="Ex: 45 €" value={formData.avgRetailPrice} onChange={(e) => update("avgRetailPrice", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <SectionTitle icon="📦" label={t("sellerReg.lotStructure")} />
                    <div className="space-y-4 mt-3">
                      <div>
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.lotSize")} *</label>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                          {["100_300", "300_500", "500_1000", "over1000"].map((v) => (
                            <RadioOption key={v} name="lotSize" value={v} selected={lotSize} onSelect={setLotSize} label={t(`sellerReg.lotSizeOptions.${v}`)} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <SectionTitle icon="🏷️" label={t("sellerReg.brandsSection")} />
                    <div className="space-y-4 mt-3">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.brandsYouSell")}</label>
                        <Input placeholder={t("sellerReg.brandsPlaceholder")} value={brandsText} onChange={(e) => setBrandsText(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.sellUnbranded")}</label>
                        <div className="flex gap-6 mt-2">
                          <RadioOption name="unbranded" value="yes" selected={sellsUnbranded} onSelect={setSellsUnbranded} label={t("sellerReg.yes")} />
                          <RadioOption name="unbranded" value="no" selected={sellsUnbranded} onSelect={setSellsUnbranded} label={t("sellerReg.no")} />
                        </div>
                      </div>
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
                    <SectionTitle icon={<Truck className="h-5 w-5 text-primary" />} label={t("sellerReg.logisticsSection")} />
                    <div className="space-y-4 mt-3">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.warehouseLocation")} *</label>
                        <Input placeholder="Ex: Paris, France" value={formData.warehouseLocation} onChange={(e) => update("warehouseLocation", e.target.value)} onBlur={() => validateField("warehouseLocation", formData.warehouseLocation)} />
                        <FieldError field="warehouseLocation" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <SectionTitle icon="🏢" label={t("sellerReg.credibilitySection")} />
                    <div className="space-y-4 mt-3">
                      <div>
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.yearsInBusiness")}</label>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                          {["under1", "1_3", "3_10", "over10"].map((v) => (
                            <RadioOption key={v} name="years" value={v} selected={yearsInBusiness} onSelect={setYearsInBusiness} label={t(`sellerReg.yearsOptions.${v}`)} />
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.clientType")}</label>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                          {["small_retailers", "chains", "online_sellers", "export"].map((c) => (
                            <label key={c} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox checked={clientTypes.includes(c)} onCheckedChange={() => toggle(clientTypes, setClientTypes, c)} />
                              <span className="text-sm text-foreground">{t(`sellerReg.clientTypes.${c}`)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <SectionTitle icon="📷" label={t("sellerReg.uploadsSection")} />
                    <div className="space-y-2 mt-3">
                      <label className="text-sm font-semibold text-foreground">{t("sellerReg.warehouseImage")} *</label>
                      <label className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/40 transition-colors cursor-pointer block">
                        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
                          onChange={(e) => { if (e.target.files) setWarehouseFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} />
                        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">{t("sellerReg.uploadImage")}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t("sellerReg.uploadFormat")}</p>
                      </label>
                      {warehouseFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {warehouseFiles.map((f, i) => (
                            <div key={i} className="flex items-center gap-1 bg-muted rounded-lg px-3 py-1.5 text-sm text-foreground">
                              <span className="truncate max-w-[150px]">{f.name}</span>
                              <button type="button" onClick={() => setWarehouseFiles(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground ml-1">✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">📝 {t("sellerReg.describeActivity")}</label>
                    <Textarea placeholder={t("sellerReg.descriptionPlaceholder")} className="resize-none" rows={3} value={formData.description} onChange={(e) => update("description", e.target.value)} />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {stepHeader}
                <div className="space-y-8">
                  <div>
                    <SectionTitle icon="📩" label={t("sellerReg.marketingConsent")} />
                    <div className="mt-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                        <div>
                          <span className="text-sm font-medium text-foreground">{t("sellerReg.consentLabel")}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{t("sellerReg.consentDesc")}</p>
                        </div>
                      </label>
                    </div>
                  </div>
                  <div>
                    <SectionTitle icon={<Target className="h-5 w-5 text-primary" />} label={t("sellerReg.buyerTargeting")} />
                    <div className="space-y-4 mt-3">
                      <div>
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.targetBuyerType")}</label>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                          {["small_boutiques", "online_resellers", "wholesalers", "export_buyers"].map((bt) => (
                            <label key={bt} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox checked={buyerTypes.includes(bt)} onCheckedChange={() => toggle(buyerTypes, setBuyerTypes, bt)} />
                              <span className="text-sm text-foreground">{t(`sellerReg.buyerTypeOptions.${bt}`)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.buyerBudget")}</label>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                          {["under500", "500_2k", "2k_5k", "over5k"].map((v) => (
                            <RadioOption key={v} name="buyerBudget" value={v} selected={buyerBudget} onSelect={setBuyerBudget} label={t(`sellerReg.buyerBudgetOptions.${v}`)} />
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.minOrderSize")}</label>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                          {["50pcs", "100pcs", "300pcs", "500pcs"].map((v) => (
                            <RadioOption key={v} name="minOrder" value={v} selected={minOrderSize} onSelect={setMinOrderSize} label={t(`sellerReg.minOrderOptions.${v}`)} />
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.targetMarkets")}</label>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                          <RadioOption name="targetMarket" value="europe" selected={targetMarket} onSelect={setTargetMarket} label={t("sellerReg.europe")} />
                          <RadioOption name="targetMarket" value="specific" selected={targetMarket} onSelect={setTargetMarket} label={t("sellerReg.specificCountries")} />
                        </div>
                        {targetMarket === "specific" && (
                          <ChipSelect options={EU_COUNTRIES} selected={targetCountries} onToggle={(c) => toggle(targetCountries, setTargetCountries, c)} multi />
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <SectionTitle icon={<Eye className="h-5 w-5 text-primary" />} label={t("sellerReg.visibilityTitle")} />
                    <div className="space-y-4 mt-3">
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
                  <div>
                    <label className="text-sm font-semibold text-foreground">{t("sellerReg.howDidYouHear")}</label>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                      {referralSources.map((r) => (
                        <RadioOption key={r} name="referral" value={r} selected={selectedReferral} onSelect={setSelectedReferral} label={r} />
                      ))}
                    </div>
                  </div>
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
                <button onClick={() => navigate(isAlreadyLoggedIn ? "/seller" : "/connexion")} className="mt-6 px-8 py-3 bg-foreground text-background font-semibold rounded-md hover:opacity-90 transition-opacity">
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

      <LegalFooter />
    </div>
  );
};

export default SellerRegistration;
