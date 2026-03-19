import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import varyLogo from "@/assets/vary-logo.png";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const storeTypes = [
  "Magasin physique",
  "Magasin en ligne",
  "Revendeur sur d'autres marketplaces (Amazon, eBay, OLX, etc.)",
  "Revendeur sur les réseaux sociaux (Instagram, TikTok, etc.)",
  "Grossiste / Distributeur",
];

const storeTypesRequiringPhotos = ["Magasin physique"];
const storeTypesRequiringLink = [
  "Magasin en ligne",
  "Revendeur sur d'autres marketplaces (Amazon, eBay, OLX, etc.)",
  "Revendeur sur les réseaux sociaux (Instagram, TikTok, etc.)",
];

const euCountries = [
  "Allemagne", "Autriche", "Belgique", "Bulgarie", "Chypre", "Croatie",
  "Danemark", "Espagne", "Estonie", "Finlande", "France", "Grèce",
  "Hongrie", "Irlande", "Italie", "Lettonie", "Lituanie", "Luxembourg",
  "Malte", "Pays-Bas", "Pologne", "Portugal", "République tchèque",
  "Roumanie", "Slovaquie", "Slovénie", "Suède",
];

const genderCategories = ["Femme", "Homme", "Enfants"];

const revenueOptions = [
  "Je n'ai pas encore d'entreprise",
  "Moins de 50.000 EUR",
  "50.000 - 200.000 EUR",
  "200.000 - 500.000 EUR",
  "500.000 - 1M EUR",
  "Plus de 1M EUR",
];

const interestTypes = ["Lots", "Sélection d'articles individuels", "Pré-packs ou séries"];

// productInterests removed

const communicationChannels = ["Whatsapp", "E-mail", "Téléphone"];

const referralSources = [
  "Google",
  "Facebook / Instagram",
  "TikTok",
  "LinkedIn",
  "Chat GPT / Claude / Gemini",
  "Blog",
  "Recommandation d'un ami",
  "Un responsable commercial m'a contacté",
];

const BuyerRegistration = () => {
  const navigate = useNavigate();
  const { signUp, user, profile, updateProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStoreTypes, setSelectedStoreTypes] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [selectedRevenue, setSelectedRevenue] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [storeLink, setStoreLink] = useState("");
  const [storePhotos, setStorePhotos] = useState<File[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [selectedReferral, setSelectedReferral] = useState("");
  // speaksEnglish removed
  const [consent, setConsent] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    companyName: "",
    vatCode: "",
    address: "",
    city: "",
    country: "France",
    postalCode: "",
    specialRequests: "",
  });

  const totalSteps = 4;
  const isAlreadyLoggedIn = !!user;

  const update = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggle = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const nextStep = async () => {
    if (step === totalSteps) {
      setSubmitting(true);
      try {
        if (isAlreadyLoggedIn) {
          // User already logged in, just upgrade to buyer or both
          const newType = profile?.user_type === "seller" ? "both" : "buyer";
          await updateProfile({
            user_type: newType as any,
            full_name: `${formData.firstName} ${formData.lastName}`,
            phone: formData.phone,
            company_name: formData.companyName,
          });
          toast.success("Profil acheteur activé !");
        } else {
          // New signup
          if (!formData.email || !formData.password) {
            toast.error("Email et mot de passe requis");
            setSubmitting(false);
            return;
          }
          const { error } = await signUp(formData.email, formData.password);
          if (error) {
            toast.error(error.message);
            setSubmitting(false);
            return;
          }
          // Wait a bit for profile to be created by trigger, then update
          await new Promise((r) => setTimeout(r, 1000));
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser) {
            await supabase.from("profiles").update({
              user_type: "buyer",
              full_name: `${formData.firstName} ${formData.lastName}`,
              phone: formData.phone,
              company_name: formData.companyName,
            }).eq("user_id", newUser.id);
          }
          toast.success("Compte créé ! Vérifiez votre email pour confirmer.");
        }
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de l'inscription");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      setStep(totalSteps + 1);
    } else {
      setStep((s) => Math.min(s + 1, totalSteps + 1));
    }
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const stepContent = (
    <div className="mb-6">
      <p className="text-muted-foreground text-sm">Créer un compte</p>
      <h2 className="font-heading text-xl font-bold text-foreground">Étape {step}</h2>
      <div className="h-px bg-border mt-3" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <Link to="/">
          <img src={varyLogo} alt="Vary" className="h-10 w-auto" />
        </Link>
        <Link to="/inscription" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Retour au choix
        </Link>
      </header>

      <div className="flex-1 flex items-start justify-center py-8 px-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
              Détails du profil acheteur
            </h1>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Veuillez créer votre profil en complétant toutes les informations demandées.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {stepContent}
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Prénom *</label>
                      <Input placeholder="Jean" value={formData.firstName} onChange={(e) => update("firstName", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Nom de famille *</label>
                      <Input placeholder="Dupont" value={formData.lastName} onChange={(e) => update("lastName", e.target.value)} />
                    </div>
                  </div>
                  {!isAlreadyLoggedIn && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">Adresse e-mail *</label>
                        <Input type="email" placeholder="jean@entreprise.com" value={formData.email} onChange={(e) => update("email", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">Mot de passe *</label>
                        <Input type="password" placeholder="Minimum 6 caractères" value={formData.password} onChange={(e) => update("password", e.target.value)} />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Numéro de téléphone *</label>
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
                      <label className="text-sm font-semibold text-foreground">Nom de l'entreprise *</label>
                      <Input placeholder="Mon Entreprise SAS" value={formData.companyName} onChange={(e) => update("companyName", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Code TVA *</label>
                      <Input placeholder="FR07830946877" value={formData.vatCode} onChange={(e) => update("vatCode", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Adresse de facturation (rue) *</label>
                    <Input placeholder="8 Avenue du Stade de France" value={formData.address} onChange={(e) => update("address", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Ville *</label>
                      <Input placeholder="Paris" value={formData.city} onChange={(e) => update("city", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Pays *</label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground"
                        value={formData.country}
                        onChange={(e) => update("country", e.target.value)}
                      >
                        {euCountries.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Code postal</label>
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
                    <label className="text-sm font-semibold text-foreground">Quelles catégories vendez-vous actuellement ? *</label>
                    <div className="flex flex-wrap gap-4 mt-3">
                      {genderCategories.map((g) => (
                        <label key={g} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={selectedGenders.includes(g)} onCheckedChange={() => toggle(selectedGenders, setSelectedGenders, g)} />
                          <span className="text-sm text-foreground">{g}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground">Chiffre d'affaires annuel: *</label>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                      {revenueOptions.map((r) => (
                        <label key={r} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="revenue" checked={selectedRevenue === r} onChange={() => setSelectedRevenue(r)} className="accent-primary w-4 h-4" />
                          <span className="text-sm text-foreground">{r}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground">Intéressé par: *</label>
                    <div className="flex flex-wrap gap-4 mt-3">
                      {interestTypes.map((i) => (
                        <label key={i} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={selectedInterests.includes(i)} onCheckedChange={() => toggle(selectedInterests, setSelectedInterests, i)} />
                          <span className="text-sm text-foreground">{i}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground">Que recherchez-vous ? *</label>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                      {productInterests.map((p) => (
                        <label key={p} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={selectedProducts.includes(p)} onCheckedChange={() => toggle(selectedProducts, setSelectedProducts, p)} />
                          <span className="text-sm text-foreground">{p}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground">Sélectionnez votre type de magasin: *</label>
                    <div className="space-y-2 mt-3">
                      {storeTypes.map((t) => (
                        <label key={t} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={selectedStoreTypes.includes(t)} onCheckedChange={() => toggle(selectedStoreTypes, setSelectedStoreTypes, t)} />
                          <span className="text-sm text-foreground">{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {stepContent}
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Demandes spéciales (optionnel)</label>
                    <Textarea placeholder="Text..." className="resize-none" rows={4} value={formData.specialRequests} onChange={(e) => update("specialRequests", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground">Parlez-vous Anglais ? *</label>
                    <div className="flex gap-6 mt-3">
                      {["Oui", "Non"].map((v) => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="english" checked={speaksEnglish === v} onChange={() => setSpeaksEnglish(v)} className="accent-primary w-4 h-4" />
                          <span className="text-sm text-foreground">{v}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground">Canal de communication préféré ? *</label>
                    <div className="flex gap-6 mt-3">
                      {communicationChannels.map((c) => (
                        <label key={c} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="channel" checked={selectedChannel === c} onChange={() => setSelectedChannel(c)} className="accent-primary w-4 h-4" />
                          <span className="text-sm text-foreground">{c}</span>
                        </label>
                      ))}
                    </div>
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
                      <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                      <div>
                        <span className="text-sm font-medium text-foreground">Email & Whatsapp communication</span>
                        <p className="text-xs text-muted-foreground mt-0.5">J'accepte de recevoir des messages.</p>
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
                  {isAlreadyLoggedIn
                    ? "Votre profil acheteur a été activé."
                    : "Vérifiez votre email pour confirmer votre compte, puis connectez-vous."}
                </p>
                <button
                  onClick={() => navigate(isAlreadyLoggedIn ? "/marketplace" : "/connexion")}
                  className="mt-6 px-8 py-3 bg-foreground text-background font-semibold rounded-md hover:opacity-90 transition-opacity"
                >
                  {isAlreadyLoggedIn ? "Accéder à la marketplace" : "Se connecter"}
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
              <button
                onClick={nextStep}
                disabled={submitting}
                className="px-8 py-3 bg-foreground text-background font-semibold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "Envoi..." : step === totalSteps ? "Soumettre" : "Suivant"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyerRegistration;
