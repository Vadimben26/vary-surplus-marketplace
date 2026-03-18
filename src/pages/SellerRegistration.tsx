import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Upload, Eye, Filter, Globe } from "lucide-react";
import varyLogo from "@/assets/vary-logo.png";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { setVerified, setUserType, setSellerVisibility } from "@/lib/auth";

const productCategories = [
  "Vêtements casual",
  "Vêtements de sport",
  "Vêtements élégants / de bureau",
  "Marques de luxe",
  "Marques premium",
  "Enfants",
];

const shippingOptions = [
  "Je gère mes propres expéditions",
  "Je souhaite utiliser le transport intégré Vary",
  "Les deux, selon la commande",
];

const volumeOptions = [
  "Moins de 100 unités / mois",
  "100 - 500 unités / mois",
  "500 - 2000 unités / mois",
  "2000 - 10.000 unités / mois",
  "Plus de 10.000 unités / mois",
];

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

const visibilityLocations = ["France", "Espagne", "Italie", "Allemagne", "Pays-Bas", "Portugal", "Belgique", "Royaume-Uni"];
const visibilityStoreTypes = [
  "Magasin physique",
  "Magasin en ligne",
  "Revendeur marketplace",
  "Revendeur réseaux sociaux",
  "Grossiste / Distributeur",
];
const visibilityRevenues = [
  "Moins de 50.000 €",
  "50.000 – 200.000 €",
  "200.000 – 500.000 €",
  "500.000 – 1M €",
  "Plus de 1M €",
];
const visibilityOrderFrequencies = [
  "Acheteurs réguliers (commandes mensuelles)",
  "Acheteurs occasionnels",
  "Nouveaux acheteurs",
];

const SellerRegistration = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedShipping, setSelectedShipping] = useState("");
  const [selectedVolume, setSelectedVolume] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("");
  const [selectedReferral, setSelectedReferral] = useState("");
  const [speaksEnglish, setSpeaksEnglish] = useState("");
  const [consent, setConsent] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
    vatCode: "",
    siret: "",
    address: "",
    city: "",
    country: "France",
    postalCode: "",
    website: "",
    description: "",
    warehouseLocation: "",
  });

  // Step 5: Visibility preferences
  const [visibilityMode, setVisibilityMode] = useState<"all" | "filtered">("all");
  const [visLocations, setVisLocations] = useState<string[]>([]);
  const [visStoreTypes, setVisStoreTypes] = useState<string[]>([]);
  const [visRevenues, setVisRevenues] = useState<string[]>([]);
  const [visFrequencies, setVisFrequencies] = useState<string[]>([]);

  const totalSteps = 5;

  const update = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggle = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const nextStep = () => {
    const next = Math.min(step + 1, totalSteps + 1);
    if (next === totalSteps + 1) {
      setVerified();
      setUserType("seller");
      setSellerVisibility({
        mode: visibilityMode,
        locations: visLocations,
        storeTypes: visStoreTypes,
        revenues: visRevenues,
        frequencies: visFrequencies,
      });
    }
    setStep(next);
  };
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const stepHeader = (
    <div className="mb-6">
      <p className="text-muted-foreground text-sm">Créer un compte</p>
      <h2 className="font-heading text-xl font-bold text-foreground">Étape {step} / {totalSteps}</h2>
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
              Détails du profil vendeur
            </h1>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Veuillez créer votre profil en complétant toutes les informations demandées. Nous ne pouvons approuver que les entreprises réelles.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Personal info */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {stepHeader}
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
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Adresse e-mail *</label>
                    <Input type="email" placeholder="jean@entreprise.com" value={formData.email} onChange={(e) => update("email", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Numéro de téléphone *</label>
                    <Input type="tel" placeholder="+33 6 12 34 56 78" value={formData.phone} onChange={(e) => update("phone", e.target.value)} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Company info */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {stepHeader}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">SIRET</label>
                      <Input placeholder="123 456 789 00001" value={formData.siret} onChange={(e) => update("siret", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Site web</label>
                      <Input placeholder="https://monsite.com" value={formData.website} onChange={(e) => update("website", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Adresse *</label>
                    <Input placeholder="8 Avenue du Stade de France" value={formData.address} onChange={(e) => update("address", e.target.value)} />
                    <p className="text-xs text-muted-foreground">Saisissez le nom de la rue et le numéro</p>
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
                        <option>France</option>
                        <option>Belgique</option>
                        <option>Allemagne</option>
                        <option>Espagne</option>
                        <option>Italie</option>
                        <option>Pays-Bas</option>
                        <option>Portugal</option>
                        <option>Autre</option>
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

            {/* Step 3: Products & logistics */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {stepHeader}
                <div className="space-y-8">
                  <div>
                    <label className="text-sm font-semibold text-foreground">Quels types de produits vendez-vous ? *</label>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                      {productCategories.map((c) => (
                        <label key={c} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={selectedCategories.includes(c)} onCheckedChange={() => toggle(selectedCategories, setSelectedCategories, c)} />
                          <span className="text-sm text-foreground">{c}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Vous pouvez sélectionner plusieurs options</p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-foreground">Volume mensuel moyen : *</label>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                      {volumeOptions.map((v) => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="volume" checked={selectedVolume === v} onChange={() => setSelectedVolume(v)} className="accent-primary w-4 h-4" />
                          <span className="text-sm text-foreground">{v}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-foreground">Mode de livraison : *</label>
                    <div className="space-y-2 mt-3">
                      {shippingOptions.map((o) => (
                        <label key={o} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="shipping" checked={selectedShipping === o} onChange={() => setSelectedShipping(o)} className="accent-primary w-4 h-4" />
                          <span className="text-sm text-foreground">{o}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Localisation de l'entrepôt</label>
                    <Input placeholder="Ex: Paris, France" value={formData.warehouseLocation} onChange={(e) => update("warehouseLocation", e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Décrivez brièvement votre activité</label>
                    <Textarea placeholder="Nous sommes spécialisés dans..." className="resize-none" rows={3} value={formData.description} onChange={(e) => update("description", e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">📷 Veuillez télécharger une image de votre ENTREPÔT</label>
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/40 transition-colors cursor-pointer">
                      <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Cliquez pour télécharger une image</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG (max 5 Mo)</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Final questions */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {stepHeader}
                <div className="space-y-8">
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
                    <label className="text-sm font-semibold text-foreground">Quel est votre canal de communication préféré ? *</label>
                    <div className="flex gap-6 mt-3">
                      {communicationChannels.map((c) => (
                        <label key={c} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="channel" checked={selectedChannel === c} onChange={() => setSelectedChannel(c)} className="accent-primary w-4 h-4" />
                          <span className="text-sm text-foreground">{c}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Veuillez sélectionner comment vous souhaitez être contacté par notre responsable de compte.</p>
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
                        <p className="text-xs text-muted-foreground mt-0.5">J'accepte de recevoir des messages sur les fournisseurs, les produits et les campagnes.</p>
                      </div>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Visibility preferences */}
            {step === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {stepHeader}
                <div className="space-y-8">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                      <Eye className="h-5 w-5 text-primary" />
                      Visibilité de vos articles
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Choisissez à quels acheteurs vos lots seront visibles. Vous pouvez modifier ces préférences à tout moment depuis votre tableau de bord.
                    </p>

                    <div className="space-y-4">
                      <label
                        className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          visibilityMode === "all" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                        }`}
                        onClick={() => setVisibilityMode("all")}
                      >
                        <input type="radio" name="visibility" checked={visibilityMode === "all"} onChange={() => setVisibilityMode("all")} className="accent-primary w-4 h-4 mt-1" />
                        <div>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-foreground">Visible par tous les acheteurs</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Tous les acheteurs vérifiés sur la plateforme pourront voir et acheter vos lots.</p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          visibilityMode === "filtered" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                        }`}
                        onClick={() => setVisibilityMode("filtered")}
                      >
                        <input type="radio" name="visibility" checked={visibilityMode === "filtered"} onChange={() => setVisibilityMode("filtered")} className="accent-primary w-4 h-4 mt-1" />
                        <div>
                          <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-foreground">Filtrer les acheteurs</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Définissez des critères pour ne montrer vos articles qu'aux acheteurs correspondant à votre cible.</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {visibilityMode === "filtered" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-6 pl-2 border-l-2 border-primary/20">
                      {/* Location filter */}
                      <div>
                        <label className="text-sm font-semibold text-foreground">📍 Localisation des acheteurs</label>
                        <p className="text-xs text-muted-foreground mb-2">Sélectionnez les pays dans lesquels vos acheteurs doivent être situés.</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {visibilityLocations.map((loc) => (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => toggle(visLocations, setVisLocations, loc)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                visLocations.includes(loc)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-card text-foreground border-border hover:border-primary/40"
                              }`}
                            >
                              {loc}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Store type filter */}
                      <div>
                        <label className="text-sm font-semibold text-foreground">🏪 Type de magasin</label>
                        <p className="text-xs text-muted-foreground mb-2">Quel type d'acheteurs souhaitez-vous cibler ?</p>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                          {visibilityStoreTypes.map((t) => (
                            <label key={t} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox checked={visStoreTypes.includes(t)} onCheckedChange={() => toggle(visStoreTypes, setVisStoreTypes, t)} />
                              <span className="text-sm text-foreground">{t}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Revenue filter */}
                      <div>
                        <label className="text-sm font-semibold text-foreground">💰 Chiffre d'affaires minimum de l'acheteur</label>
                        <p className="text-xs text-muted-foreground mb-2">Ciblez les acheteurs par tranche de CA.</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {visibilityRevenues.map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => toggle(visRevenues, setVisRevenues, r)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                visRevenues.includes(r)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-card text-foreground border-border hover:border-primary/40"
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Order frequency filter */}
                      <div>
                        <label className="text-sm font-semibold text-foreground">📦 Fréquence d'achat</label>
                        <p className="text-xs text-muted-foreground mb-2">Préférez-vous des acheteurs réguliers ou êtes-vous ouvert à tous ?</p>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                          {visibilityOrderFrequencies.map((f) => (
                            <label key={f} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox checked={visFrequencies.includes(f)} onCheckedChange={() => toggle(visFrequencies, setVisFrequencies, f)} />
                              <span className="text-sm text-foreground">{f}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Confirmation */}
            {step === totalSteps + 1 && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-heading text-2xl font-bold text-foreground mb-3">Merci pour votre inscription !</h2>
                <p className="text-muted-foreground mb-2 max-w-md mx-auto">
                  Notre équipe va vérifier vos informations et vous accompagner dans votre onboarding vendeur.
                </p>
                <p className="text-sm text-muted-foreground mb-8">Vous recevrez un email de confirmation sous 24 à 48h.</p>
                <button onClick={() => navigate("/seller")} className="px-8 py-3 bg-foreground text-background font-semibold rounded-md hover:opacity-90 transition-opacity">
                  Accéder à mon espace vendeur
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          {step <= totalSteps && (
            <div className="flex items-center gap-4 mt-10">
              {step > 1 && (
                <button onClick={prevStep} className="px-8 py-3 bg-foreground text-background font-semibold rounded-md hover:opacity-90 transition-opacity">
                  Retour
                </button>
              )}
              <button onClick={nextStep} className="px-8 py-3 bg-foreground text-background font-semibold rounded-md hover:opacity-90 transition-opacity">
                {step === totalSteps ? "Soumettre" : "Suivant"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerRegistration;
