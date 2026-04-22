import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Upload, X, FileText, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import varyLogo from "@/assets/vary-logo.png";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import LegalFooter from "@/components/LegalFooter";

const STORAGE_KEY = "vary_buyer_reg_draft";

const EU_COUNTRIES = [
  "France", "Allemagne", "Espagne", "Italie", "Belgique", "Pays-Bas",
  "Portugal", "Autriche", "Pologne", "Suède", "Danemark", "Irlande",
  "Grèce", "Roumanie", "Hongrie", "Croatie", "Bulgarie", "Slovaquie",
  "Slovénie", "Finlande", "Lituanie", "Lettonie", "Estonie", "Luxembourg",
  "Malte", "Chypre", "République tchèque", "Royaume-Uni", "Suisse",
];

const CATEGORY_KEYS = ["clothing", "sneakers", "accessories"] as const;
const REVENUE_KEYS = ["none", "under50k", "50k250k", "250k1m", "over1m"] as const;

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  billingAddress1: string;
  billingAddress2: string;
  billingCity: string;
  billingPostalCode: string;
  billingCountry: string;
  sameShipping: boolean;
  shippingAddress1: string;
  shippingAddress2: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
  categories: string[];
  deliveryCountries: string[];
  annualRevenue: string;
  termsAccepted: boolean;
  infoCertified: boolean;
  alertsConsent: boolean;
}

const initialForm: FormData = {
  firstName: "", lastName: "", email: "", phone: "", password: "",
  billingAddress1: "", billingAddress2: "", billingCity: "", billingPostalCode: "", billingCountry: "France",
  sameShipping: true,
  shippingAddress1: "", shippingAddress2: "", shippingCity: "", shippingPostalCode: "", shippingCountry: "France",
  categories: [],
  deliveryCountries: [],
  annualRevenue: "none",
  termsAccepted: false, infoCertified: false, alertsConsent: false,
};

const BuyerRegistration = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("return") || "/marketplace";
  const { signUp, user, profile, updateProfile } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load draft
  useEffect(() => {
    try {
      const draft = localStorage.getItem(STORAGE_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        setForm(prev => ({ ...prev, ...parsed }));
      }
    } catch { /* ignore */ }
  }, []);

  // Prefill from auth
  useEffect(() => {
    if (user?.email) setForm(prev => ({ ...prev, email: prev.email || user.email || "" }));
    if (profile?.full_name) {
      const parts = profile.full_name.split(" ");
      setForm(prev => ({
        ...prev,
        firstName: prev.firstName || parts[0] || "",
        lastName: prev.lastName || parts.slice(1).join(" ") || "",
      }));
    }
    if (profile?.phone) setForm(prev => ({ ...prev, phone: prev.phone || profile.phone || "" }));
  }, [user, profile]);

  // Save draft
  useEffect(() => {
    const { password, ...safe } = form;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  }, [form]);

  // Sync shipping from billing when toggle is on
  useEffect(() => {
    if (form.sameShipping) {
      setForm(prev => ({
        ...prev,
        shippingAddress1: prev.billingAddress1,
        shippingAddress2: prev.billingAddress2,
        shippingCity: prev.billingCity,
        shippingPostalCode: prev.billingPostalCode,
        shippingCountry: prev.billingCountry,
      }));
    }
  }, [form.sameShipping, form.billingAddress1, form.billingAddress2, form.billingCity, form.billingPostalCode, form.billingCountry]);

  // Prefill delivery countries from shipping country
  useEffect(() => {
    const shippingCountry = form.sameShipping ? form.billingCountry : form.shippingCountry;
    if (shippingCountry && form.deliveryCountries.length === 0) {
      setForm(prev => ({ ...prev, deliveryCountries: [shippingCountry] }));
    }
  }, [form.sameShipping, form.billingCountry, form.shippingCountry]);

  const update = useCallback((key: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  const toggleCategory = (cat: string) => {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }));
    setErrors(prev => { const n = { ...prev }; delete n.categories; return n; });
  };

  const addDeliveryCountry = (country: string) => {
    if (form.deliveryCountries.length >= 3 || form.deliveryCountries.includes(country)) return;
    setForm(prev => ({ ...prev, deliveryCountries: [...prev.deliveryCountries, country] }));
    setCountrySearch("");
    setCountryDropdownOpen(false);
  };

  const removeDeliveryCountry = (country: string) => {
    setForm(prev => ({ ...prev, deliveryCountries: prev.deliveryCountries.filter(c => c !== country) }));
  };

  const validateStep1 = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = t("buyerReg.validation.firstName");
    if (!form.lastName.trim()) e.lastName = t("buyerReg.validation.lastName");
    if (!form.email.trim() || !form.email.includes("@")) e.email = t("buyerReg.validation.email");
    if (!form.phone.trim()) e.phone = t("buyerReg.validation.phone");
    if (!user && (!form.password || form.password.length < 6)) e.password = t("buyerReg.validation.password");
    if (!form.billingAddress1.trim()) e.billingAddress1 = t("buyerReg.validation.addressLine1");
    if (!form.billingCity.trim()) e.billingCity = t("buyerReg.validation.city");
    if (!form.billingPostalCode.trim()) e.billingPostalCode = t("buyerReg.validation.postalCode");
    if (!form.billingCountry.trim()) e.billingCountry = t("buyerReg.validation.country");
    if (!form.sameShipping) {
      if (!form.shippingAddress1.trim()) e.shippingAddress1 = t("buyerReg.validation.addressLine1");
      if (!form.shippingCity.trim()) e.shippingCity = t("buyerReg.validation.city");
      if (!form.shippingPostalCode.trim()) e.shippingPostalCode = t("buyerReg.validation.postalCode");
      if (!form.shippingCountry.trim()) e.shippingCountry = t("buyerReg.validation.country");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = (): boolean => {
    const e: Record<string, string> = {};
    if (form.categories.length === 0) e.categories = t("buyerReg.validation.category");
    if (!form.termsAccepted) e.termsAccepted = t("buyerReg.validation.terms");
    if (!form.infoCertified) e.infoCertified = t("buyerReg.validation.certified");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFileChange = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("buyerReg.errorFileTooLarge"));
      return;
    }
    setDocFile(file);
    setDocUploading(true);
    try {
      const userId = user?.id || "temp";
      const path = `${userId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("buyer-documents").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("buyer-documents").getPublicUrl(path);
      setDocUrl(urlData.publicUrl);
    } catch (err: any) {
      toast.error(t("buyerReg.errorUpload"));
      setDocFile(null);
    } finally {
      setDocUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  const saveBuyerPreferences = async (userId: string) => {
    const prefData = {
      user_id: userId,
      address: form.billingAddress1,
      billing_address_line2: form.billingAddress2,
      city: form.billingCity,
      postal_code: form.billingPostalCode,
      country: form.billingCountry,
      same_shipping_address: form.sameShipping,
      shipping_address_line1: form.sameShipping ? form.billingAddress1 : form.shippingAddress1,
      shipping_address_line2: form.sameShipping ? form.billingAddress2 : form.shippingAddress2,
      shipping_city: form.sameShipping ? form.billingCity : form.shippingCity,
      shipping_postal_code: form.sameShipping ? form.billingPostalCode : form.shippingPostalCode,
      shipping_country: form.sameShipping ? form.billingCountry : form.shippingCountry,
      // Phase 6: explicit field used by the marketplace transport-reach filter.
      shipping_country_for_filter: form.sameShipping ? form.billingCountry : form.shippingCountry,
      categories: form.categories,
      delivery_countries: form.deliveryCountries,
      annual_revenue: form.annualRevenue,
      revenue_document_url: docUrl,
      terms_accepted: form.termsAccepted,
      info_certified: form.infoCertified,
      alerts_consent: form.alertsConsent,
    };

    const { data: existing } = await supabase
      .from("buyer_preferences")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase.from("buyer_preferences").update(prefData).eq("id", existing.id);
    } else {
      await supabase.from("buyer_preferences").insert(prefData);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      let userId = user?.id;

      if (!user) {
        const { error } = await signUp(form.email, form.password);
        if (error) throw error;
        // Get the new user
        const { data: sessionData } = await supabase.auth.getSession();
        userId = sessionData.session?.user?.id;
      }

      if (!userId) throw new Error("User creation failed");

      // Update profile
      const fullName = `${form.firstName} ${form.lastName}`.trim();
      await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: form.phone,
          user_type: "buyer",
        })
        .eq("user_id", userId);

      await saveBuyerPreferences(userId);
      localStorage.removeItem(STORAGE_KEY);
      // Phase 5: refresh the buyer-prefs cache so any gate clears immediately.
      await queryClient.invalidateQueries({ queryKey: ["buyer-prefs-check"] });
      setDone(true);
    } catch (err: any) {
      toast.error(err.message || t("buyerReg.errorRegistration"));
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && validateStep1()) setStep(2);
  };

  const FieldError = ({ field }: { field: string }) => (
    errors[field] ? <p className="text-xs text-destructive mt-1">{errors[field]}</p> : null
  );

  const filteredCountries = EU_COUNTRIES.filter(c =>
    c.toLowerCase().includes(countrySearch.toLowerCase()) && !form.deliveryCountries.includes(c)
  );

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{t("buyerReg.thanksTitle")}</h2>
          <p className="text-muted-foreground">{t("buyerReg.profileActivated")}</p>
          <p className="text-sm text-muted-foreground">{t("buyerReg.checkEmail")}</p>
          <Link to={returnTo} className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition">
            {t("buyerReg.continue", "Continuer")}
          </Link>
        </motion.div>
      </div>
    );
  }

  const AddressBlock = ({
    prefix,
    disabled = false,
  }: {
    prefix: "billing" | "shipping";
    disabled?: boolean;
  }) => {
    const keys = {
      address1: prefix === "billing" ? "billingAddress1" : "shippingAddress1",
      address2: prefix === "billing" ? "billingAddress2" : "shippingAddress2",
      city: prefix === "billing" ? "billingCity" : "shippingCity",
      postalCode: prefix === "billing" ? "billingPostalCode" : "shippingPostalCode",
      country: prefix === "billing" ? "billingCountry" : "shippingCountry",
    } as const;

    return (
      <div className={`space-y-3 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
        <div>
          <Label className="text-sm font-medium">{t("buyerReg.addressLine1")} *</Label>
          <Input
            value={form[keys.address1]}
            onChange={e => update(keys.address1, e.target.value)}
            autoComplete={prefix === "billing" ? "address-line1" : "shipping address-line1"}
            className="mt-1"
          />
          <FieldError field={keys.address1} />
        </div>
        <div>
          <Label className="text-sm font-medium">{t("buyerReg.addressLine2")}</Label>
          <Input
            value={form[keys.address2]}
            onChange={e => update(keys.address2, e.target.value)}
            autoComplete={prefix === "billing" ? "address-line2" : "shipping address-line2"}
            className="mt-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-sm font-medium">{t("buyerReg.city")} *</Label>
            <Input
              value={form[keys.city]}
              onChange={e => update(keys.city, e.target.value)}
              autoComplete={prefix === "billing" ? "address-level2" : "shipping address-level2"}
              className="mt-1"
            />
            <FieldError field={keys.city} />
          </div>
          <div>
            <Label className="text-sm font-medium">{t("buyerReg.postalCode")} *</Label>
            <Input
              value={form[keys.postalCode]}
              onChange={e => update(keys.postalCode, e.target.value)}
              autoComplete={prefix === "billing" ? "postal-code" : "shipping postal-code"}
              className="mt-1"
            />
            <FieldError field={keys.postalCode} />
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium">{t("buyerReg.country")} *</Label>
          <select
            value={form[keys.country]}
            onChange={e => update(keys.country, e.target.value)}
            autoComplete={prefix === "billing" ? "country-name" : "shipping country-name"}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {EU_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <FieldError field={keys.country} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={varyLogo} alt="Vary" className="h-7" />
          </Link>
          <span className="text-sm text-muted-foreground">
            {t("buyerReg.step")} {step}/2
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <Progress value={step * 50} className="h-1.5" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Title */}
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("buyerReg.title")}</h1>
                <p className="text-muted-foreground mt-1">{t("buyerReg.subtitle")}</p>
              </div>

              {/* Personal info */}
              <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("buyerReg.step1Title")}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("buyerReg.firstName")} *</Label>
                    <Input value={form.firstName} onChange={e => update("firstName", e.target.value)} autoComplete="given-name" className="mt-1" />
                    <FieldError field="firstName" />
                  </div>
                  <div>
                    <Label>{t("buyerReg.lastName")} *</Label>
                    <Input value={form.lastName} onChange={e => update("lastName", e.target.value)} autoComplete="family-name" className="mt-1" />
                    <FieldError field="lastName" />
                  </div>
                </div>
                <div>
                  <Label>{t("buyerReg.email")} *</Label>
                  <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} autoComplete="email" className="mt-1" />
                  <FieldError field="email" />
                </div>
                <div>
                  <Label>{t("buyerReg.phone")} *</Label>
                  <Input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} autoComplete="tel" className="mt-1" />
                  <FieldError field="phone" />
                </div>
                {!user && (
                  <div>
                    <Label>{t("buyerReg.password")} *</Label>
                    <Input type="password" value={form.password} onChange={e => update("password", e.target.value)} placeholder={t("buyerReg.passwordPlaceholder")} autoComplete="new-password" className="mt-1" />
                    <FieldError field="password" />
                  </div>
                )}
              </div>

              {/* Billing address */}
              <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("buyerReg.billingAddressTitle")}
                </h3>
                <AddressBlock prefix="billing" />
              </div>

              {/* Shipping address */}
              <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("buyerReg.shippingAddressTitle")}
                </h3>
                <div className="flex items-center gap-3 py-2">
                  <Switch
                    checked={form.sameShipping}
                    onCheckedChange={v => update("sameShipping", v)}
                  />
                  <span className="text-sm text-foreground">{t("buyerReg.sameAsBilling")}</span>
                </div>
                <AddressBlock prefix="shipping" disabled={form.sameShipping} />
              </div>

              {/* CTA */}
              <button
                onClick={nextStep}
                className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition text-sm"
              >
                {t("buyerReg.continue")}
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Title */}
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("buyerReg.step2Title")}</h1>
                <p className="text-muted-foreground mt-1">{t("buyerReg.subtitle")}</p>
              </div>

              {/* Categories */}
              <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{t("buyerReg.categoriesTitle")}</h3>
                  <p className="text-xs text-muted-foreground">{t("buyerReg.categoriesSubtitle")}</p>
                </div>
                <div className="flex gap-3">
                  {CATEGORY_KEYS.map(key => {
                    const selected = form.categories.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleCategory(key)}
                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {t(`buyerReg.categoryOptions.${key}`)}
                      </button>
                    );
                  })}
                </div>
                <FieldError field="categories" />
              </div>

              {/* Delivery countries */}
              <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{t("buyerReg.deliveryCountriesTitle")}</h3>
                  <p className="text-xs text-muted-foreground">{t("buyerReg.deliveryCountriesSubtitle")}</p>
                </div>
                {/* Selected tags */}
                <div className="flex flex-wrap gap-2">
                  {form.deliveryCountries.map(c => (
                    <span key={c} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium">
                      {c}
                      <button onClick={() => removeDeliveryCountry(c)} className="hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                {/* Search input */}
                {form.deliveryCountries.length < 3 && (
                  <div className="relative">
                    <Input
                      placeholder="Rechercher un pays..."
                      value={countrySearch}
                      onChange={e => { setCountrySearch(e.target.value); setCountryDropdownOpen(true); }}
                      onFocus={() => setCountryDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setCountryDropdownOpen(false), 200)}
                    />
                    {countryDropdownOpen && countrySearch && filteredCountries.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredCountries.slice(0, 8).map(c => (
                          <button
                            key={c}
                            onMouseDown={() => addDeliveryCountry(c)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition"
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Annual revenue */}
              <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{t("buyerReg.annualRevenueTitle")}</h3>
                  <p className="text-xs text-muted-foreground">{t("buyerReg.annualRevenueSubtitle")}</p>
                </div>
                <div className="space-y-2">
                  {REVENUE_KEYS.map(key => (
                    <label
                      key={key}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                        form.annualRevenue === key
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="revenue"
                        checked={form.annualRevenue === key}
                        onChange={() => update("annualRevenue", key)}
                        className="accent-primary w-4 h-4"
                      />
                      <span className="text-sm text-foreground">{t(`buyerReg.revenueOptions.${key}`)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Revenue document */}
              {form.annualRevenue !== "none" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-card rounded-2xl border border-border p-6 space-y-4"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t("buyerReg.revenueDocTitle")}</h3>
                    <p className="text-xs text-muted-foreground">{t("buyerReg.revenueDocSubtitle")}</p>
                  </div>

                  {docFile ? (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{docFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(docFile.size / 1024 / 1024).toFixed(1)} Mo</p>
                      </div>
                      {docUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <button onClick={() => { setDocFile(null); setDocUrl(null); }} className="text-muted-foreground hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div
                      onDrop={handleDrop}
                      onDragOver={e => e.preventDefault()}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {t("buyerReg.dragDropText")} <span className="text-primary font-medium">{t("buyerReg.browseText")}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{t("buyerReg.revenueDocFormats")}</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                  />
                  <p className="text-xs text-muted-foreground italic">{t("buyerReg.revenueDocExamples")}</p>
                </motion.div>
              )}

              {/* Checkboxes */}
              <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={form.termsAccepted}
                    onCheckedChange={v => update("termsAccepted", !!v)}
                    id="terms"
                  />
                  <label htmlFor="terms" className="text-sm text-foreground cursor-pointer leading-tight">
                    {t("buyerReg.termsAccept")} *
                  </label>
                </div>
                <FieldError field="termsAccepted" />

                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={form.infoCertified}
                    onCheckedChange={v => update("infoCertified", !!v)}
                    id="certified"
                  />
                  <label htmlFor="certified" className="text-sm text-foreground cursor-pointer leading-tight">
                    {t("buyerReg.infoCertified")} *
                  </label>
                </div>
                <FieldError field="infoCertified" />

                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={form.alertsConsent}
                    onCheckedChange={v => update("alertsConsent", !!v)}
                    id="alerts"
                  />
                  <label htmlFor="alerts" className="text-sm text-foreground cursor-pointer leading-tight">
                    {t("buyerReg.alertsConsent")}
                  </label>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-border text-foreground font-semibold rounded-xl hover:bg-accent transition text-sm"
                >
                  {t("buyerReg.back")}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-[2] py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("buyerReg.createAccount")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <LegalFooter />
    </div>
  );
};

export default BuyerRegistration;
