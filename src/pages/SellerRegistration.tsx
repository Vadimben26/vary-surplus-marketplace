import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Upload, Eye, Filter, Globe, FileText, Shield, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import varyLogo from "@/assets/vary-logo.png";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LegalFooter from "@/components/LegalFooter";

const STORAGE_KEY = "vary_seller_reg_draft";
const EU_COUNTRIES = ["France","Belgique","Allemagne","Espagne","Italie","Pays-Bas","Portugal","Royaume-Uni","Pologne","Roumanie","Suède","Autriche","Grèce","Tchéquie","Danemark","Irlande","Hongrie","Croatie","Bulgarie","Finlande","Slovaquie","Lituanie","Lettonie","Slovénie","Estonie","Chypre","Luxembourg","Malte"];
const CATEGORIES = ["Vêtements", "Sneakers", "Accessoires"];
const BUSINESS_TYPES = ["brand","wholesaler","distributor","liquidator","marketplace_seller","other"];

const RadioCard = ({ value, selected, onSelect, label, description, icon }: { value: string; selected: string; onSelect: (v: string) => void; label: string; description?: string; icon?: React.ReactNode }) => (
  <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${selected === value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`} onClick={() => onSelect(value)}>
    <input type="radio" checked={selected === value} onChange={() => onSelect(value)} className="accent-primary w-4 h-4 mt-1" />
    <div>
      <div className="flex items-center gap-2">{icon}<span className="font-semibold text-foreground">{label}</span></div>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </div>
  </label>
);

const ChipSelect = ({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) => (
  <div className="flex flex-wrap gap-2 mt-2">
    {options.map((o) => {
      const isActive = selected.includes(o);
      return (
        <button key={o} type="button" onClick={() => onToggle(o)}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${isActive ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:border-primary/40"}`}>
          {o}
        </button>
      );
    })}
  </div>
);

interface UploadState { file: File | null; url: string; uploading: boolean; error: string }

const FileUploadZone = ({ state, onFile, onRemove, label, examples }: { state: UploadState; onFile: (f: File) => void; onRemove: () => void; label: string; examples: string[] }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      {state.file || state.url ? (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
          <FileText className="h-5 w-5 text-primary flex-shrink-0" />
          <span className="text-sm text-foreground truncate flex-1">{state.file?.name || "Document"}</span>
          {state.uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {!state.uploading && <CheckCircle2 className="h-4 w-4 text-primary" />}
          <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
        >
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />
          <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Glissez un fichier ou cliquez pour téléverser</p>
          <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (max 10 Mo)</p>
        </div>
      )}
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      <div className="text-xs text-muted-foreground space-y-0.5">
        {examples.map((ex, i) => <p key={i}>• {ex}</p>)}
      </div>
    </div>
  );
};

const SellerRegistration = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signUp, user, profile, updateProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const totalSteps = 3;
  const isAlreadyLoggedIn = !!user;

  const loadDraft = () => { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s); } catch {} return null; };
  const draft = loadDraft();

  const [formData, setFormData] = useState(draft?.formData ?? {
    firstName: "", lastName: "", email: "", phone: "", password: "",
    siret: "", companyName: "", vatCode: "",
    billingAddress1: "", billingAddress2: "", billingCity: "", billingPostalCode: "", billingCountry: "France",
    pickupAddress1: "", pickupAddress2: "", pickupCity: "", pickupPostalCode: "", pickupCountry: "France",
  });
  const [businessType, setBusinessType] = useState(draft?.businessType ?? "");
  const [samePickupAddress, setSamePickupAddress] = useState(draft?.samePickupAddress ?? true);

  // Step 2
  const [companyDoc, setCompanyDoc] = useState<UploadState>({ file: null, url: "", uploading: false, error: "" });
  const [authDoc, setAuthDoc] = useState<UploadState>({ file: null, url: "", uploading: false, error: "" });
  const [certifiedSeller, setCertifiedSeller] = useState(draft?.certifiedSeller ?? false);
  const [certifiedDocs, setCertifiedDocs] = useState(draft?.certifiedDocs ?? false);
  const [termsAccepted, setTermsAccepted] = useState(draft?.termsAccepted ?? false);

  // Step 3
  const [buyerGeography, setBuyerGeography] = useState(draft?.buyerGeography ?? "all_verified");
  const [targetCountries, setTargetCountries] = useState<string[]>(draft?.targetCountries ?? []);
  const [buyerCategories, setBuyerCategories] = useState<string[]>(draft?.buyerCategories ?? []);
  const [buyerMinRevenue, setBuyerMinRevenue] = useState(draft?.buyerMinRevenue ?? "all");
  const [visibilityMode, setVisibilityMode] = useState<"filtered" | "all">(draft?.visibilityMode ?? "all");
  const [countrySearch, setCountrySearch] = useState("");

  useEffect(() => { if (user?.email) setFormData((p: any) => ({ ...p, email: user.email || "" })); }, [user]);

  // Auto-save draft
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      formData, businessType, samePickupAddress, certifiedSeller, certifiedDocs, termsAccepted,
      buyerGeography, targetCountries, buyerCategories, buyerMinRevenue, visibilityMode, step,
    }));
  }, [formData, businessType, samePickupAddress, certifiedSeller, certifiedDocs, termsAccepted, buyerGeography, targetCountries, buyerCategories, buyerMinRevenue, visibilityMode, step]);

  useEffect(() => { if (draft?.step && draft.step <= totalSteps) setStep(draft.step); }, []);

  const update = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: "" }));
  };

  const FieldError = ({ field }: { field: string }) => fieldErrors[field] ? <p className="text-xs text-destructive mt-1">{fieldErrors[field]}</p> : null;

  const uploadDoc = async (file: File, setDoc: React.Dispatch<React.SetStateAction<UploadState>>, folder: string) => {
    setDoc(prev => ({ ...prev, file, uploading: true, error: "" }));
    const userId = user?.id || "temp";
    const path = `${userId}/${folder}-${Date.now()}-${file.name}`;
    const { error, data } = await supabase.storage.from("seller-documents").upload(path, file);
    if (error) {
      setDoc(prev => ({ ...prev, uploading: false, error: "Erreur d'upload" }));
    } else {
      const { data: urlData } = supabase.storage.from("seller-documents").getPublicUrl(path);
      setDoc(prev => ({ ...prev, uploading: false, url: urlData.publicUrl }));
    }
  };

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) return t("sellerReg.validation.firstLastName");
      if (!formData.email.trim() && !isAlreadyLoggedIn) return t("sellerReg.validation.email");
      if (!formData.phone.trim()) return t("sellerReg.validation.phone");
      if (!isAlreadyLoggedIn && (!formData.password || formData.password.length < 6)) return t("sellerReg.validation.password");
      if (!formData.siret.trim()) return t("sellerReg.validation.siret");
      if (!businessType) return t("sellerReg.validation.businessType");
      if (!formData.billingAddress1.trim()) return t("sellerReg.validation.address");
      if (!formData.billingCity.trim()) return t("sellerReg.validation.city");
      if (!formData.billingPostalCode.trim()) return t("sellerReg.validation.postalCode");
    }
    if (step === 2) {
      if (!certifiedSeller) return t("sellerReg.validation.certifySeller");
      if (!certifiedDocs) return t("sellerReg.validation.certifyDocs");
      if (!termsAccepted) return t("sellerReg.validation.terms");
    }
    if (step === 3) {
      if (buyerCategories.length === 0) return t("sellerReg.validation.categories");
    }
    return null;
  };

  const saveSellerPreferences = async (userId: string) => {
    await supabase.from("seller_preferences" as any).upsert({
      user_id: userId,
      business_type: businessType,
      vat_code: formData.vatCode,
      billing_address_line1: formData.billingAddress1,
      billing_address_line2: formData.billingAddress2,
      billing_city: formData.billingCity,
      billing_postal_code: formData.billingPostalCode,
      billing_country: formData.billingCountry,
      same_pickup_address: samePickupAddress,
      pickup_address_line1: samePickupAddress ? formData.billingAddress1 : formData.pickupAddress1,
      pickup_address_line2: samePickupAddress ? formData.billingAddress2 : formData.pickupAddress2,
      pickup_city: samePickupAddress ? formData.billingCity : formData.pickupCity,
      pickup_postal_code: samePickupAddress ? formData.billingPostalCode : formData.pickupPostalCode,
      pickup_country: samePickupAddress ? formData.billingCountry : formData.pickupCountry,
      company_document_url: companyDoc.url || null,
      auth_document_url: authDoc.url || null,
      seller_certified: certifiedSeller,
      terms_accepted: termsAccepted,
      buyer_geography: buyerGeography,
      target_countries: buyerGeography === "specific" ? targetCountries : [],
      buyer_categories: buyerCategories,
      buyer_min_revenue: buyerMinRevenue,
      visibility_mode: "filtered",
    } as any, { onConflict: "user_id" } as any);
  };

  const nextStep = async () => {
    const error = validateStep();
    if (error) { toast.error(error); return; }

    if (step === totalSteps) {
      setSubmitting(true);
      try {
        if (isAlreadyLoggedIn) {
          const newType = profile?.user_type === "buyer" ? "both" : "seller";
          await updateProfile({ user_type: newType as any, full_name: `${formData.firstName} ${formData.lastName}`, phone: formData.phone, company_name: formData.companyName, siret: formData.siret });
          await saveSellerPreferences(user!.id);
          toast.success(t("sellerReg.profileActivated"));
        } else {
          const { error } = await signUp(formData.email, formData.password);
          if (error) { toast.error(error.message); setSubmitting(false); return; }
          await new Promise((r) => setTimeout(r, 1000));
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser) {
            await supabase.from("profiles").update({ user_type: "seller", full_name: `${formData.firstName} ${formData.lastName}`, phone: formData.phone, company_name: formData.companyName, siret: formData.siret }).eq("user_id", newUser.id);
            await saveSellerPreferences(newUser.id);
          }
          toast.success(t("sellerReg.checkEmail"));
        }
        localStorage.removeItem(STORAGE_KEY);
      } catch (err: any) { toast.error(err.message || "Error"); setSubmitting(false); return; }
      setSubmitting(false);
      setStep(totalSteps + 1);
    } else {
      setStep((s) => s + 1);
    }
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const stepTitles = [
    t("sellerReg.stepTitles.info"),
    t("sellerReg.stepTitles.verification"),
    t("sellerReg.stepTitles.visibility"),
  ];

  const stepSubtitles = [
    t("sellerReg.subtitles.step1"),
    t("sellerReg.subtitles.step2"),
    t("sellerReg.subtitles.step3"),
  ];

  const progressPercent = Math.round((step / totalSteps) * 100);

  const filteredCountries = EU_COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()) && !targetCountries.includes(c));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <Link to="/"><img src={varyLogo} alt="Vary" className="h-10 w-auto" /></Link>
        <Link to="/inscription" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("common.backToChoice")}</Link>
      </header>

      <div className="flex-1 flex items-start justify-center py-8 px-4">
        <div className="w-full max-w-2xl">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">{t("sellerReg.title")}</h1>
            {step <= totalSteps && <p className="text-muted-foreground text-sm max-w-lg mx-auto">{stepSubtitles[step - 1]}</p>}
          </div>

          {/* Progress */}
          {step <= totalSteps && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                {stepTitles.map((title, i) => (
                  <div key={i} className={`flex items-center gap-1.5 ${i + 1 === step ? "text-primary" : i + 1 < step ? "text-primary/60" : "text-muted-foreground/40"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i + 1 === step ? "bg-primary text-primary-foreground" : i + 1 < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {i + 1 < step ? "✓" : i + 1}
                    </div>
                    <span className="text-xs font-medium hidden md:inline">{title}</span>
                    {i < stepTitles.length - 1 && <div className={`w-8 h-px ${i + 1 < step ? "bg-primary/40" : "bg-border"}`} />}
                  </div>
                ))}
              </div>
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">Étape {step} sur {totalSteps}</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ── STEP 1: Contact + Company + Addresses ── */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                {/* Contact */}
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground mb-4">👤 {t("sellerReg.contactTitle")}</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.firstName")} *</label>
                        <Input autoComplete="given-name" placeholder="Jean" value={formData.firstName} onChange={(e) => update("firstName", e.target.value)} />
                        <FieldError field="firstName" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.lastName")} *</label>
                        <Input autoComplete="family-name" placeholder="Dupont" value={formData.lastName} onChange={(e) => update("lastName", e.target.value)} />
                        <FieldError field="lastName" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground">{t("sellerReg.email")} *</label>
                      <Input type="email" autoComplete="email" placeholder="jean@entreprise.com" value={formData.email} onChange={(e) => update("email", e.target.value)} disabled={isAlreadyLoggedIn} />
                      <FieldError field="email" />
                    </div>
                    {!isAlreadyLoggedIn && (
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.password")} *</label>
                        <Input type="password" autoComplete="new-password" placeholder={t("sellerReg.passwordPlaceholder")} value={formData.password} onChange={(e) => update("password", e.target.value)} />
                        <FieldError field="password" />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground">{t("sellerReg.phone")} *</label>
                      <Input type="tel" autoComplete="tel" placeholder="+33 6 12 34 56 78" value={formData.phone} onChange={(e) => update("phone", e.target.value)} />
                      <FieldError field="phone" />
                    </div>
                  </div>
                </div>

                {/* Company */}
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground mb-4">🏢 {t("sellerReg.companyTitle")}</h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground">SIRET *</label>
                      <Input placeholder="123 456 789 00001" value={formData.siret} onChange={(e) => update("siret", e.target.value)} />
                      <p className="text-xs text-muted-foreground">{t("sellerReg.siretHint")}</p>
                      <FieldError field="siret" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground">{t("sellerReg.companyName")}</label>
                      <Input placeholder={t("sellerReg.companyNamePlaceholder")} value={formData.companyName} onChange={(e) => update("companyName", e.target.value)} />
                      <p className="text-xs text-muted-foreground">{t("sellerReg.companyNameHint")}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-foreground">{t("sellerReg.businessType")} *</label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground mt-1.5" value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
                        <option value="">{t("sellerReg.selectBusinessType")}</option>
                        {BUSINESS_TYPES.map(bt => <option key={bt} value={bt}>{t(`sellerReg.businessTypes.${bt}`)}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground">{t("sellerReg.vatCode")}</label>
                      <Input placeholder="FR07830946877" value={formData.vatCode} onChange={(e) => update("vatCode", e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Billing Address */}
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground mb-4">📍 {t("sellerReg.billingAddressTitle")}</h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground">{t("sellerReg.addressLine1")} *</label>
                      <Input autoComplete="address-line1" placeholder="8 Avenue du Stade de France" value={formData.billingAddress1} onChange={(e) => update("billingAddress1", e.target.value)} />
                      <FieldError field="billingAddress1" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground">{t("sellerReg.addressLine2")}</label>
                      <Input autoComplete="address-line2" placeholder="Bâtiment B, 2ème étage" value={formData.billingAddress2} onChange={(e) => update("billingAddress2", e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.city")} *</label>
                        <Input autoComplete="address-level2" placeholder="Paris" value={formData.billingCity} onChange={(e) => update("billingCity", e.target.value)} />
                        <FieldError field="billingCity" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.postalCode")} *</label>
                        <Input autoComplete="postal-code" placeholder="75001" value={formData.billingPostalCode} onChange={(e) => update("billingPostalCode", e.target.value)} />
                        <FieldError field="billingPostalCode" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.country")} *</label>
                        <select autoComplete="country-name" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground" value={formData.billingCountry} onChange={(e) => update("billingCountry", e.target.value)}>
                          {EU_COUNTRIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pickup Address */}
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground mb-4">🚚 {t("sellerReg.pickupAddressTitle")}</h3>
                  <label className="flex items-center gap-3 cursor-pointer mb-4">
                    <Checkbox checked={samePickupAddress} onCheckedChange={(v) => setSamePickupAddress(v === true)} />
                    <span className="text-sm text-foreground">{t("sellerReg.sameAsBilling")}</span>
                  </label>
                  {!samePickupAddress && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.addressLine1")} *</label>
                        <Input autoComplete="address-line1" placeholder="12 Rue de la Logistique" value={formData.pickupAddress1} onChange={(e) => update("pickupAddress1", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-foreground">{t("sellerReg.addressLine2")}</label>
                        <Input autoComplete="address-line2" value={formData.pickupAddress2} onChange={(e) => update("pickupAddress2", e.target.value)} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-foreground">{t("sellerReg.city")} *</label>
                          <Input autoComplete="address-level2" placeholder="Lyon" value={formData.pickupCity} onChange={(e) => update("pickupCity", e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-foreground">{t("sellerReg.postalCode")} *</label>
                          <Input autoComplete="postal-code" placeholder="69001" value={formData.pickupPostalCode} onChange={(e) => update("pickupPostalCode", e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-foreground">{t("sellerReg.country")} *</label>
                          <select autoComplete="country-name" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground" value={formData.pickupCountry} onChange={(e) => update("pickupCountry", e.target.value)}>
                            {EU_COUNTRIES.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Documents + Verification ── */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground mb-4">📄 {t("sellerReg.documentsTitle")}</h3>
                  <div className="space-y-6">
                    <FileUploadZone
                      state={companyDoc}
                      onFile={(f) => uploadDoc(f, setCompanyDoc, "company")}
                      onRemove={() => setCompanyDoc({ file: null, url: "", uploading: false, error: "" })}
                      label={t("sellerReg.companyDocLabel")}
                      examples={[t("sellerReg.companyDocEx1"), t("sellerReg.companyDocEx2"), t("sellerReg.companyDocEx3")]}
                    />
                    <FileUploadZone
                      state={authDoc}
                      onFile={(f) => uploadDoc(f, setAuthDoc, "auth")}
                      onRemove={() => setAuthDoc({ file: null, url: "", uploading: false, error: "" })}
                      label={t("sellerReg.authDocLabel")}
                      examples={[t("sellerReg.authDocEx1"), t("sellerReg.authDocEx2"), t("sellerReg.authDocEx3"), t("sellerReg.authDocEx4")]}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="font-heading text-base font-bold text-foreground mb-4">✅ {t("sellerReg.validationTitle")}</h3>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox checked={certifiedSeller} onCheckedChange={(v) => setCertifiedSeller(v === true)} className="mt-0.5" />
                      <span className="text-sm text-foreground">{t("sellerReg.certifySeller")}</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox checked={certifiedDocs} onCheckedChange={(v) => setCertifiedDocs(v === true)} className="mt-0.5" />
                      <span className="text-sm text-foreground">{t("sellerReg.certifyDocs")}</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox checked={termsAccepted} onCheckedChange={(v) => setTermsAccepted(v === true)} className="mt-0.5" />
                      <span className="text-sm text-foreground">{t("sellerReg.termsAccept")}</span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Access Control ── */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                {/* Intro note */}
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-sm text-foreground">{t("sellerReg.accessIntro")}</p>
                </div>

                {/* Geography */}
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground mb-1">🌍 {t("sellerReg.geographyTitle")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{t("sellerReg.geographyHelp")}</p>
                  <div className="space-y-3">
                    <RadioCard value="all_verified" selected={buyerGeography} onSelect={setBuyerGeography} label={t("sellerReg.allVerifiedBuyers")} icon={<Globe className="h-4 w-4 text-primary" />} />
                    <RadioCard value="specific" selected={buyerGeography} onSelect={setBuyerGeography} label={t("sellerReg.specificCountries")} icon={<Filter className="h-4 w-4 text-primary" />} />
                  </div>
                  {buyerGeography === "specific" && (
                    <div className="mt-4 space-y-3">
                      <Input placeholder={t("sellerReg.addCountriesPlaceholder")} value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} />
                      {targetCountries.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {targetCountries.map(c => (
                            <span key={c} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                              {c}
                              <button type="button" onClick={() => setTargetCountries(prev => prev.filter(x => x !== c))} className="hover:text-primary/70"><X className="h-3 w-3" /></button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                        {filteredCountries.map(c => (
                          <button key={c} type="button" onClick={() => { setTargetCountries(prev => [...prev, c]); setCountrySearch(""); }} className="px-3 py-1.5 rounded-full text-sm border border-border bg-card text-foreground hover:border-primary/40 transition-all">{c}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Categories */}
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground mb-1">🏷️ {t("sellerReg.buyerCategoriesTitle")}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{t("sellerReg.buyerCategoriesHelp")}</p>
                  <ChipSelect options={CATEGORIES} selected={buyerCategories} onToggle={(c) => setBuyerCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])} />
                </div>

                {/* Buyer min revenue */}
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground mb-1">💰 {t("sellerReg.buyerMinRevenueTitle")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{t("sellerReg.buyerMinRevenueHelp")}</p>
                  <div className="space-y-2">
                    {["all", "under100k", "100k_500k", "500k_1m", "1m_plus"].map(v => (
                      <label key={v} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${buyerMinRevenue === v ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`} onClick={() => setBuyerMinRevenue(v)}>
                        <input type="radio" name="buyerMinRevenue" checked={buyerMinRevenue === v} onChange={() => setBuyerMinRevenue(v)} className="accent-primary w-4 h-4" />
                        <span className="text-sm text-foreground">{t(`sellerReg.revenueOptions.${v}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Recap */}
                <div className="p-5 rounded-xl border border-border bg-muted/30 space-y-2">
                  <p className="text-sm font-semibold text-foreground">{t("sellerReg.recapTitle")}</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      🌍 {buyerGeography === "specific" && targetCountries.length > 0
                        ? t("sellerReg.recapGeoSpecific", { countries: targetCountries.join(", ") })
                        : t("sellerReg.recapGeoAll")}
                    </li>
                    <li>
                      🏷️ {t("sellerReg.recapCategories", { list: buyerCategories.length > 0 ? buyerCategories.join(", ") : t("sellerReg.recapNone") })}
                    </li>
                    <li>
                      💰 {t("sellerReg.recapMinRevenue", { value: t(`sellerReg.revenueOptions.${buyerMinRevenue}`) })}
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}

            {/* ── SUCCESS ── */}
            {step === totalSteps + 1 && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-heading text-2xl font-bold text-foreground mb-3">{t("sellerReg.thanksTitle")}</h2>
                <p className="text-muted-foreground mb-2 max-w-md mx-auto">{t("sellerReg.thanksDesc")}</p>
                <button onClick={() => navigate(isAlreadyLoggedIn ? "/seller" : "/connexion")} className="mt-6 px-8 py-3 bg-foreground text-background font-semibold rounded-md hover:opacity-90 transition-opacity">
                  {isAlreadyLoggedIn ? t("sellerReg.goToSellerDashboard") : t("common.login")}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          {step <= totalSteps && (
            <div className="flex items-center gap-4 mt-10">
              {step > 1 && (
                <button onClick={prevStep} className="px-8 py-3 bg-muted text-foreground font-semibold rounded-md hover:opacity-90 transition-opacity">
                  {t("common.back_button")}
                </button>
              )}
              <button onClick={nextStep} disabled={submitting} className="px-8 py-3 bg-foreground text-background font-semibold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50">
                {submitting ? t("common.sending") : step === totalSteps ? t("sellerReg.submitRequest") : t("common.next")}
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
