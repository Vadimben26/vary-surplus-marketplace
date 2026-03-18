import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, Mail, Lock, User, Phone, MapPin, FileText, Upload, CheckCircle2 } from "lucide-react";
import varyLogo from "@/assets/vary-logo.png";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { setVerified, setUserType } from "@/lib/auth";

const storeTypes = [
  "Magasin physique",
  "Magasin en ligne",
  "Revendeur sur marketplaces (Amazon, eBay, etc.)",
  "Revendeur sur réseaux sociaux (Instagram, TikTok, etc.)",
  "Grossiste / Distributeur",
  "Je n'ai pas encore de magasin",
];

const BuyerRegistration = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedStoreTypes, setSelectedStoreTypes] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    vatCode: "",
    address: "",
    city: "",
    country: "France",
    postalCode: "",
    website: "",
  });

  const totalSteps = 3;

  const update = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleStoreType = (type: string) => {
    setSelectedStoreTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const nextStep = () => {
    const next = Math.min(step + 1, totalSteps + 1);
    if (next === totalSteps + 1) {
      setVerified();
      setUserType("buyer");
    }
    setStep(next);
  };
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
              Inscription Acheteur
            </h1>
            <p className="text-muted-foreground text-sm">
              Créez votre compte pour accéder aux lots disponibles sur Vary
            </p>
          </div>

          {/* Progress */}
          {step <= totalSteps && (
            <div className="flex items-center gap-2 mb-8 max-w-md mx-auto">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className="flex-1 flex items-center gap-2">
                  <div
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      i + 1 <= step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                </div>
              ))}
              <span className="text-xs text-muted-foreground font-medium ml-2">
                Étape {step}/{totalSteps}
              </span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Account info */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-card">
                  <h2 className="font-heading font-semibold text-lg text-foreground mb-1">Créer un compte</h2>
                  <p className="text-muted-foreground text-sm mb-6">Vos informations personnelles</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-foreground">Prénom *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="firstName" placeholder="Jean" className="pl-10" value={formData.firstName} onChange={(e) => update("firstName", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-foreground">Nom *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="lastName" placeholder="Dupont" className="pl-10" value={formData.lastName} onChange={(e) => update("lastName", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-foreground">Email professionnel *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="email" type="email" placeholder="jean@entreprise.com" className="pl-10" value={formData.email} onChange={(e) => update("email", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-foreground">Téléphone *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="phone" type="tel" placeholder="+33 6 12 34 56 78" className="pl-10" value={formData.phone} onChange={(e) => update("phone", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-foreground">Mot de passe *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="password" type="password" placeholder="••••••••" className="pl-10" value={formData.password} onChange={(e) => update("password", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-foreground">Confirmer *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="confirmPassword" type="password" placeholder="••••••••" className="pl-10" value={formData.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Business info */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-card">
                  <h2 className="font-heading font-semibold text-lg text-foreground mb-1">Profil de l'entreprise</h2>
                  <p className="text-muted-foreground text-sm mb-6">Informations sur votre activité</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Nom de l'entreprise *</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Mon Entreprise SAS" className="pl-10" value={formData.companyName} onChange={(e) => update("companyName", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Code TVA *</Label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="FR07830946877" className="pl-10" value={formData.vatCode} onChange={(e) => update("vatCode", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-foreground">Adresse de facturation *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="8 Avenue du Stade de France" className="pl-10" value={formData.address} onChange={(e) => update("address", e.target.value)} />
                      </div>
                      <p className="text-xs text-muted-foreground">Saisissez le nom de la rue et le numéro</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Ville *</Label>
                      <Input placeholder="Paris" value={formData.city} onChange={(e) => update("city", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Pays *</Label>
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
                    <div className="space-y-2">
                      <Label className="text-foreground">Code postal</Label>
                      <Input placeholder="75001" value={formData.postalCode} onChange={(e) => update("postalCode", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Site web</Label>
                      <Input placeholder="https://monsite.com" value={formData.website} onChange={(e) => update("website", e.target.value)} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Store type */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-card">
                  <h2 className="font-heading font-semibold text-lg text-foreground mb-1">Type de magasin</h2>
                  <p className="text-muted-foreground text-sm mb-6">Sélectionnez votre type d'activité (plusieurs choix possibles)</p>

                  <div className="space-y-3">
                    {storeTypes.map((type) => (
                      <label
                        key={type}
                        className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedStoreTypes.includes(type)
                            ? "border-primary bg-accent/30"
                            : "border-border hover:border-primary/40 hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          checked={selectedStoreTypes.includes(type)}
                          onCheckedChange={() => toggleStoreType(type)}
                        />
                        <span className="text-sm font-medium text-foreground">{type}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-6 space-y-3">
                    <Label className="text-foreground flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Photo de votre entrepôt / magasin
                    </Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Cliquez pour télécharger une image</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG (max 5 Mo)</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Confirmation */}
            {step === totalSteps + 1 && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card rounded-xl border border-border p-8 md:p-12 shadow-card text-center"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-heading text-2xl font-bold text-foreground mb-3">
                  Merci pour votre inscription !
                </h2>
                <p className="text-muted-foreground mb-2 max-w-md mx-auto">
                  Nous avons bien reçu votre demande. Notre équipe va vérifier vos informations et valider votre compte.
                </p>
                <p className="text-sm text-muted-foreground mb-8">
                  Vous recevrez un email de confirmation sous 24 à 48h.
                </p>
                <button
                  onClick={() => navigate("/")}
                  className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Retour à l'accueil
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation buttons */}
          {step <= totalSteps && (
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={prevStep}
                disabled={step === 1}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                  step === 1
                    ? "text-muted-foreground cursor-not-allowed"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary-dark/20"
                }`}
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary-dark transition-colors"
              >
                {step === totalSteps ? "Soumettre" : "Suivant"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyerRegistration;
