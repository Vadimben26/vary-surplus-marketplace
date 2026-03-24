import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
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

const STORAGE_KEY = "vary_buyer_reg_draft";

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
const categoryKeys = ["clothing", "shoes", "accessories", "bags", "lingerie", "sportswear"] as const;
const styleKeys = ["streetwear", "casual", "sport", "chic"] as const;

const RadioOption = ({ name, value, selected, onChange, label }: { name: string; value: string; selected: string; onChange: (v: string) => void; label: string }) => (
  <label className="flex items-center gap-2 cursor-pointer">
    <input type="radio" name={name} checked={selected === value} onChange={() => onChange(value)} className="accent-primary w-4 h-4" />
    <span className="text-sm text-foreground">{label}</span>
  </label>
);

const referralSources = [
  "Google", "Facebook / Instagram", "TikTok", "LinkedIn",
  "Chat GPT / Claude / Gemini", "Blog", "Recommandation d'un ami",
  "Un responsable commercial m'a contacté",
];

const stepTitles = [
  "Identité",
  "Entreprise",
  "Votre activité",
  "Vos besoins d'achat",
  "Logistique & préférences",
];

const BuyerRegistration = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signUp, user, profile, updateProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const isAlreadyLoggedIn = !!user;

  // Restore draft from localStorage
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
    firstName: "", lastName: "", phone: "", email: "", password: "",
    companyName: "", vatCode: "", address: "", city: "", country: "France", postalCode: "",
    deliveryAddress: "", perfectLot: "",
  });

  const [selectedStoreTypes, setSelectedStoreTypes] = useState<string[]>(draft?.selectedStoreTypes ?? []);
  const [storeLink, setStoreLink] = useState(draft?.storeLink ?? "");
  const [storePhotos, setStorePhotos] = useState<File[]>([]);
  const [selectedRevenue, setSelectedRevenue] = useState(draft?.selectedRevenue ?? "");
  const [selectedActivityDuration, setSelectedActivityDuration] = useState(draft?.selectedActivityDuration ?? "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(draft?.selectedCategories ?? []);
  const [selectedGenders, setSelectedGenders] = useState<string[]>(draft?.selectedGenders ?? []);
  const [selectedBudget, setSelectedBudget] = useState(draft?.selectedBudget ?? "");
  const [selectedPricePerPiece, setSelectedPricePerPiece] = useState(draft?.selectedPricePerPiece ?? "");
  const [selectedPiecesPerLot, setSelectedPiecesPerLot] = useState(draft?.selectedPiecesPerLot ?? "");
  const [searchedBrands, setSearchedBrands] = useState(draft?.searchedBrands ?? "");
  const [selectedStyles, setSelectedStyles] = useState<string[]>(draft?.selectedStyles ?? []);
  const [selectedReferral, setSelectedReferral] = useState(draft?.selectedReferral ?? "");
  const [marketingConsent, setMarketingConsent] = useState(draft?.marketingConsent ?? false);

  const totalSteps = 5;

  // Auto-save to localStorage on step change
  useEffect(() => {
    const data = {
      formData, selectedStoreTypes, storeLink, selectedRevenue, selectedActivityDuration,
      selectedCategories, selectedGenders, selectedBudget, selectedPricePerPiece,
      selectedPiecesPerLot, searchedBrands, selectedStyles, selectedReferral, marketingConsent,
      step,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [step, formData, selectedStoreTypes, storeLink, selectedRevenue, selectedActivityDuration,
    selectedCategories, selectedGenders, selectedBudget, selectedPricePerPiece,
    selectedPiecesPerLot, searchedBrands, selectedStyles, selectedReferral, marketingConsent]);

  // Restore step
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
      setFieldErrors(prev => ({ ...prev, [field]: "Ce champ est requis" }));
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
      if (!formData.firstName.trim() || !formData.lastName.trim()) return "Prénom et nom requis";
      if (!formData.phone.trim()) return "Téléphone requis";
      if (!isAlreadyLoggedIn) {
        if (!formData.email.trim()) return "Email requis";
        if (!formData.password || formData.password.length < 6) return "Mot de passe requis (6 caractères min.)";
      }
    }
    if (step === 2) {
      if (!formData.companyName.trim()) return "Nom d'entreprise requis";
      if (!formData.vatCode.trim()) return "Code TVA requis";
      if (!formData.address.trim()) return "Adresse requise";
      if (!formData.city.trim()) return "Ville requise";
    }
    if (step === 3) {
      if (selectedStoreTypes.length === 0) return "Sélectionnez un type de magasin";
      if (selectedStoreTypes.some((st) => storeTypesRequiringLinkKeys.includes(st)) && !storeLink.trim()) return "Lien du site requis";
      if (selectedStoreTypes.some((st) => storeTypesRequiringPhotosKeys.includes(st)) && storePhotos.length === 0) return "Photos du magasin requises";
      if (!selectedRevenue) return "Chiffre d'affaires requis";
      if (!selectedActivityDuration) return "Ancienneté requise";
      if (selectedCategories.length === 0) return "Sélectionnez au moins une catégorie";
      if (selectedGenders.length === 0) return "Sélectionnez au moins un segment";
    }
    if (step === 4) {
      if (!selectedBudget) return "Budget moyen requis";
      if (!selectedPricePerPiece) return "Prix cible par pièce requis";
      if (!selectedPiecesPerLot) return "Nombre de pièces par lot requis";
    }
    if (step === 5) {
      if (!selectedReferral) return "Comment avez-vous entendu parler de nous ?";
    }
    return null;
  };

  const saveBuyerPreferences = async (userId: string) => {
    const { error } = await supabase.from("buyer_preferences" as any).upsert({
      user_id: userId,
      store_types: selectedStoreTypes,
      store_link: storeLink,
      revenue: selectedRevenue,
      activity_duration: selectedActivityDuration,
      categories: selectedCategories,
      genders: selectedGenders,
      budget: selectedBudget,
      price_per_piece: selectedPricePerPiece,
      pieces_per_lot: selectedPiecesPerLot,
      searched_brands: searchedBrands,
      styles: selectedStyles,
      delivery_address: formData.deliveryAddress,
      perfect_lot: formData.perfectLot,
      referral_source: selectedReferral,
      marketing_consent: marketingConsent,
      country: formData.country,
      vat_code: formData.vatCode,
      address: formData.address,
      city: formData.city,
      postal_code: formData.postalCode,
    } as any, { onConflict: "user_id" } as any);
    if (error) console.error("Error saving buyer preferences:", error);
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
          await saveBuyerPreferences(user!.id);
          toast.success("Profil acheteur activé !");
        } else {
          const { error } = await signUp(formData.email, formData.password);
          if (error) { toast.error(error.message); setSubmitting(false); return; }
          await new Promise((r) => setTimeout(r, 1000));
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser) {
            await supabase.from("profiles").update({ user_type: "buyer", full_name: `${formData.firstName} ${formData.lastName}`, phone: formData.phone, company_name: formData.companyName }).eq("user_id", newUser.id);
            await saveBuyerPreferences(newUser.id);
          }
          toast.success("Vérifiez votre email pour confirmer votre compte.");
        }
        localStorage.removeItem(STORAGE_KEY);
      } catch (err: any) { toast.error(err.message || "Erreur"); setSubmitting(false); return; }
      setSubmitting(false);
      setStep(totalSteps + 1);
    } else {
      setStep((s) => s + 1);
    }
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const progressPercent = Math.round((step / totalSteps) * 100);

  const renderStepHeader = () => (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        {stepTitles.map((title, i) => (
          <div key={i} className={`flex items-center gap-1.5 ${i + 1 === step ? "text-primary" : i + 1 < step ? "text-primary/60" : "text-muted-foreground/40"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i + 1 === step ? "bg-primary text-primary-foreground" : i + 1 < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
              {i + 1 < step ? "✓" : i + 1}
            </div>
            <span className="text-xs font-medium hidden md:inline">{title}</span>
            {i < stepTitles.length - 1 && <div className={`w-6 h-px ${i + 1 < step ? "bg-primary/40" : "bg-border"}`} />}
          </div>
        ))}
      </div>
      <div className="mt-3 mb-1">
        <Progress value={progressPercent} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1">{progressPercent}% complété</p>
      </div>
      <h2 className="font-heading text-xl font-bold text-foreground mt-3">{stepTitles[step - 1]}</h2>
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
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">Inscription Acheteur</h1>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">Créez votre compte pour accéder au marketplace B2B</p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {renderStepHeader()}
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Prénom *</label>
                      <Input placeholder="Jean" value={formData.firstName} onChange={(e) => update("firstName", e.target.value)} onBlur={() => validateField("firstName", formData.firstName)} />
                      <FieldError field="firstName" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Nom *</label>
                      <Input placeholder="Dupont" value={formData.lastName} onChange={(e) => update("lastName", e.target.value)} onBlur={() => validateField("lastName", formData.lastName)} />
                      <FieldError field="lastName" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Téléphone *</label>
                    <Input type="tel" placeholder="+33 6 12 34 56 78" value={formData.phone} onChange={(e) => update("phone", e.target.value)} onBlur={() => validateField("phone", formData.phone)} />
                    <FieldError field="phone" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Email *</label>
                    <Input type="email" placeholder="jean@entreprise.com" value={formData.email} onChange={(e) => update("email", e.target.value)} onBlur={() => validateField("email", formData.email)} />
                    <FieldError field="email" />
                  </div>
                  {!isAlreadyLoggedIn && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Mot de passe *</label>
                      <Input type="password" placeholder="6 caractères minimum" value={formData.password} onChange={(e) => update("password", e.target.value)} onBlur={() => validateField("password", formData.password)} />
                      <FieldError field="password" />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {renderStepHeader()}
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Nom de l'entreprise *</label>
                      <Input placeholder="Mon Entreprise SAS" value={formData.companyName} onChange={(e) => update("companyName", e.target.value)} onBlur={() => validateField("companyName", formData.companyName)} />
                      <FieldError field="companyName" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Code TVA *</label>
                      <Input placeholder="FR07830946877" value={formData.vatCode} onChange={(e) => update("vatCode", e.target.value)} onBlur={() => validateField("vatCode", formData.vatCode)} />
                      <FieldError field="vatCode" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Adresse de facturation *</label>
                    <Input placeholder="8 Avenue du Stade de France" value={formData.address} onChange={(e) => update("address", e.target.value)} onBlur={() => validateField("address", formData.address)} />
                    <FieldError field="address" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Ville *</label>
                      <Input placeholder="Paris" value={formData.city} onChange={(e) => update("city", e.target.value)} onBlur={() => validateField("city", formData.city)} />
                      <FieldError field="city" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Pays *</label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground" value={formData.country} onChange={(e) => update("country", e.target.value)}>
                        {euCountries.map((c) => (<option key={c}>{c}</option>))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Code postal</label>
                      <Input placeholder="75001" value={formData.postalCode} onChange={(e) => update("postalCode", e.target.value)} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {renderStepHeader()}
                <div className="space-y-7">
                  <div>
                    <label className="text-sm font-semibold text-foreground">Type de magasin *</label>
                    <div className="space-y-2 mt-3">
                      {storeTypeKeys.map((st) => (
                        <label key={st} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={selectedStoreTypes.includes(st)} onCheckedChange={() => toggle(selectedStoreTypes, setSelectedStoreTypes, st)} />
                          <span className="text-sm text-foreground">
                            {st === "physical" && "Magasin physique"}
                            {st === "online" && "Magasin en ligne"}
                            {st === "marketplace" && "Marketplace (Amazon, eBay…)"}
                            {st === "social" && "Réseaux sociaux"}
                            {st === "wholesale" && "Grossiste / Distributeur"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {selectedStoreTypes.some((st) => storeTypesRequiringLinkKeys.includes(st)) && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Lien de votre site / page *</label>
                      <Input placeholder="https://www.monsite.com" value={storeLink} onChange={(e) => setStoreLink(e.target.value)} />
                    </div>
                  )}
                  {selectedStoreTypes.some((st) => storeTypesRequiringPhotosKeys.includes(st)) && (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-foreground">Photos de votre magasin *</label>
                      <input type="file" accept="image/*" multiple onChange={(e) => setStorePhotos(Array.from(e.target.files || []))}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                      {storePhotos.length > 0 && <p className="text-xs text-muted-foreground">{storePhotos.length} photo(s) sélectionnée(s)</p>}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">Lien de votre site (optionnel)</label>
                        <Input placeholder="https://www.monsite.com" value={storeLink} onChange={(e) => setStoreLink(e.target.value)} />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-semibold text-foreground">Chiffre d'affaires annuel *</label>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                      <RadioOption name="revenue" value="under50k" selected={selectedRevenue} onChange={setSelectedRevenue} label="Moins de 50 000 €" />
                      <RadioOption name="revenue" value="50k200k" selected={selectedRevenue} onChange={setSelectedRevenue} label="50 000 – 200 000 €" />
                      <RadioOption name="revenue" value="200k500k" selected={selectedRevenue} onChange={setSelectedRevenue} label="200 000 – 500 000 €" />
                      <RadioOption name="revenue" value="500k1m" selected={selectedRevenue} onChange={setSelectedRevenue} label="500 000 – 1 M€" />
                      <RadioOption name="revenue" value="over1m" selected={selectedRevenue} onChange={setSelectedRevenue} label="Plus de 1 M€" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-foreground">Depuis combien de temps êtes-vous actif ? *</label>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                      <RadioOption name="duration" value="lessThan1y" selected={selectedActivityDuration} onChange={setSelectedActivityDuration} label="Moins d'1 an" />
                      <RadioOption name="duration" value="1to3y" selected={selectedActivityDuration} onChange={setSelectedActivityDuration} label="1 à 3 ans" />
                      <RadioOption name="duration" value="3to5y" selected={selectedActivityDuration} onChange={setSelectedActivityDuration} label="3 à 5 ans" />
                      <RadioOption name="duration" value="moreThan5y" selected={selectedActivityDuration} onChange={setSelectedActivityDuration} label="Plus de 5 ans" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-foreground">Quelles catégories vendez-vous actuellement ? *</label>
                    <div className="flex flex-wrap gap-4 mt-3">
                      {categoryKeys.map((c) => (
                        <label key={c} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={selectedCategories.includes(c)} onCheckedChange={() => toggle(selectedCategories, setSelectedCategories, c)} />
                          <span className="text-sm text-foreground">
                            {c === "clothing" && "Vêtements"}
                            {c === "shoes" && "Chaussures"}
                            {c === "accessories" && "Accessoires"}
                            {c === "bags" && "Sacs"}
                            {c === "lingerie" && "Lingerie"}
                            {c === "sportswear" && "Sportswear"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-foreground">Segment principal *</label>
                    <div className="flex flex-wrap gap-4 mt-3">
                      {genderKeys.map((g) => (
                        <label key={g} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={selectedGenders.includes(g)} onCheckedChange={() => toggle(selectedGenders, setSelectedGenders, g)} />
                          <span className="text-sm text-foreground">
                            {g === "women" && "Femme"}
                            {g === "men" && "Homme"}
                            {g === "kids" && "Enfants"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {renderStepHeader()}
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 mb-6">
                  <p className="text-xs text-primary font-medium">🔥 Ces réponses nous permettent de vous proposer les meilleurs lots automatiquement</p>
                </div>
                <div className="space-y-7">
                  <div>
                    <label className="text-sm font-semibold text-foreground">Budget moyen par commande *</label>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                      <RadioOption name="budget" value="under1k" selected={selectedBudget} onChange={setSelectedBudget} label="Moins de 1 000 €" />
                      <RadioOption name="budget" value="1k5k" selected={selectedBudget} onChange={setSelectedBudget} label="1 000 – 5 000 €" />
                      <RadioOption name="budget" value="5k15k" selected={selectedBudget} onChange={setSelectedBudget} label="5 000 – 15 000 €" />
                      <RadioOption name="budget" value="15k50k" selected={selectedBudget} onChange={setSelectedBudget} label="15 000 – 50 000 €" />
                      <RadioOption name="budget" value="over50k" selected={selectedBudget} onChange={setSelectedBudget} label="Plus de 50 000 €" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-foreground">Prix cible par pièce *</label>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                      <RadioOption name="ppp" value="under5" selected={selectedPricePerPiece} onChange={setSelectedPricePerPiece} label="Moins de 5 €" />
                      <RadioOption name="ppp" value="5to15" selected={selectedPricePerPiece} onChange={setSelectedPricePerPiece} label="5 – 15 €" />
                      <RadioOption name="ppp" value="15to30" selected={selectedPricePerPiece} onChange={setSelectedPricePerPiece} label="15 – 30 €" />
                      <RadioOption name="ppp" value="30to60" selected={selectedPricePerPiece} onChange={setSelectedPricePerPiece} label="30 – 60 €" />
                      <RadioOption name="ppp" value="over60" selected={selectedPricePerPiece} onChange={setSelectedPricePerPiece} label="Plus de 60 €" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-foreground">Nombre de pièces idéal par lot *</label>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                      <RadioOption name="ppl" value="under100" selected={selectedPiecesPerLot} onChange={setSelectedPiecesPerLot} label="Moins de 100" />
                      <RadioOption name="ppl" value="100to500" selected={selectedPiecesPerLot} onChange={setSelectedPiecesPerLot} label="100 – 500" />
                      <RadioOption name="ppl" value="500to2000" selected={selectedPiecesPerLot} onChange={setSelectedPiecesPerLot} label="500 – 2 000" />
                      <RadioOption name="ppl" value="2000to5000" selected={selectedPiecesPerLot} onChange={setSelectedPiecesPerLot} label="2 000 – 5 000" />
                      <RadioOption name="ppl" value="over5000" selected={selectedPiecesPerLot} onChange={setSelectedPiecesPerLot} label="Plus de 5 000" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Marques recherchées</label>
                    <Input placeholder="Nike, Adidas, Zara…" value={searchedBrands} onChange={(e) => setSearchedBrands(e.target.value)} />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-foreground">Styles préférés</label>
                    <div className="flex flex-wrap gap-4 mt-3">
                      {styleKeys.map((s) => (
                        <label key={s} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={selectedStyles.includes(s)} onCheckedChange={() => toggle(selectedStyles, setSelectedStyles, s)} />
                          <span className="text-sm text-foreground">
                            {s === "streetwear" && "Streetwear"}
                            {s === "casual" && "Casual"}
                            {s === "sport" && "Sport"}
                            {s === "chic" && "Chic"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {renderStepHeader()}
                <div className="space-y-7">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Adresse de livraison (si différente)</label>
                    <Input placeholder="12 Rue de l'Entrepôt, 69001 Lyon" value={formData.deliveryAddress} onChange={(e) => update("deliveryAddress", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Si vous pouviez décrire le lot parfait, ce serait quoi ?</label>
                    <Textarea placeholder="Ex: 500 pièces Nike/Adidas, mix homme-femme, streetwear, prix sous 10€/pièce…" className="resize-none" rows={4} value={formData.perfectLot} onChange={(e) => update("perfectLot", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground">Comment avez-vous entendu parler de nous ? *</label>
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
                      <Checkbox checked={marketingConsent} onCheckedChange={(v) => setMarketingConsent(v === true)} className="mt-0.5" />
                      <div>
                        <span className="text-sm font-medium text-foreground">J'accepte de recevoir des offres et nouveautés par email</span>
                        <p className="text-xs text-muted-foreground mt-0.5">Vous pouvez vous désinscrire à tout moment. Nous ne spammons pas.</p>
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
                <h2 className="font-heading text-2xl font-bold text-foreground mb-3">Merci pour votre inscription !</h2>
                <p className="text-muted-foreground mb-2 max-w-md mx-auto">
                  {isAlreadyLoggedIn ? "Votre profil acheteur est activé." : "Vérifiez votre email pour confirmer votre compte."}
                </p>
                <button onClick={() => navigate(isAlreadyLoggedIn ? "/marketplace" : "/connexion")} className="mt-6 px-8 py-3 bg-foreground text-background font-semibold rounded-md hover:opacity-90 transition-opacity">
                  {isAlreadyLoggedIn ? "Accéder au marketplace" : "Se connecter"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {step <= totalSteps && (
            <div className="flex items-center gap-4 mt-10">
              {step > 1 && (
                <button onClick={prevStep} className="px-8 py-3 bg-foreground text-background font-semibold rounded-md hover:opacity-90 transition-opacity">
                  Retour
                </button>
              )}
              <button onClick={nextStep} disabled={submitting} className="px-8 py-3 bg-foreground text-background font-semibold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50">
                {submitting ? "Envoi…" : step === totalSteps ? "Envoyer" : "Suivant"}
              </button>
            </div>
          )}
        </div>
      </div>

      <LegalFooter />
    </div>
  );
};

export default BuyerRegistration;
