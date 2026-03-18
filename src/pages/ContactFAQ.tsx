import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Mail, Phone, MessageCircle, ChevronDown, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const faqs = [
  {
    question: "Comment fonctionne le paiement sur Vary ?",
    answer: "Le paiement est comptant. Les fonds sont retenus en escrow par Vary jusqu'à la confirmation de réception par l'acheteur. Une commission de 5% est appliquée sur chaque transaction.",
  },
  {
    question: "Comment puis-je devenir vendeur et acheteur ?",
    answer: "Vous pouvez faire une demande d'accès double depuis votre profil. Chaque rôle nécessite une vérification séparée. Une fois approuvé, vous aurez accès aux deux plateformes via les onglets en haut de page.",
  },
  {
    question: "Comment est organisé le transport des lots ?",
    answer: "Vary propose un transport intégré pour simplifier la logistique. Le vendeur peut aussi gérer ses propres expéditions. Les frais de livraison sont calculés automatiquement selon la localisation et le volume.",
  },
  {
    question: "Que faire en cas de litige ?",
    answer: "Vary gère les litiges de manière cadrée. Contactez notre équipe support via le formulaire ci-dessous ou par email. Les fonds en escrow ne sont libérés qu'après résolution du litige.",
  },
  {
    question: "Comment sont vérifiés les vendeurs et acheteurs ?",
    answer: "Chaque inscription est vérifiée par notre équipe : SIRET/TVA, adresse, activité réelle. Seules les entreprises vérifiées peuvent accéder à la plateforme, garantissant des transactions B2B fiables.",
  },
  {
    question: "Puis-je filtrer les acheteurs qui voient mes lots ?",
    answer: "Oui, en tant que vendeur vous pouvez restreindre la visibilité de vos articles par localisation, type de magasin, chiffre d'affaires et fréquence d'achat des acheteurs.",
  },
];

const ContactFAQ = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = () => {
    toast.success("Message envoyé ! Notre équipe vous répondra sous 24h.");
    setContactForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-8 pb-24 max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">Centre d'aide</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Trouvez des réponses à vos questions ou contactez notre équipe support.
          </p>
        </div>

        {/* Quick contact cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {[
            { icon: Mail, label: "Email", value: "support@vary.eu", href: "mailto:support@vary.eu" },
            { icon: Phone, label: "Téléphone", value: "+33 1 23 45 67 89", href: "tel:+33123456789" },
            { icon: MessageCircle, label: "Chat", value: "Lun-Ven 9h-18h", href: "#contact" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="bg-card rounded-2xl border border-border p-5 text-center hover:shadow-card-hover transition-shadow"
            >
              <item.icon className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-semibold text-foreground text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.value}</p>
            </a>
          ))}
        </div>

        {/* FAQ */}
        <div className="mb-12">
          <h2 className="font-heading text-xl font-bold text-foreground mb-6">Questions fréquentes</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-medium text-foreground text-sm pr-4">{faq.question}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Contact form */}
        <div id="contact" className="bg-card rounded-2xl border border-border p-6 md:p-8">
          <h2 className="font-heading text-xl font-bold text-foreground mb-6">Nous contacter</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Nom complet</label>
                <Input
                  placeholder="Jean Dupont"
                  value={contactForm.name}
                  onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="jean@entreprise.com"
                  value={contactForm.email}
                  onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Sujet</label>
              <Input
                placeholder="Ex: Question sur un lot, problème de livraison..."
                value={contactForm.subject}
                onChange={(e) => setContactForm((p) => ({ ...p, subject: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Message</label>
              <Textarea
                placeholder="Décrivez votre demande..."
                className="resize-none"
                rows={5}
                value={contactForm.message}
                onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
              />
            </div>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-dark transition-colors"
            >
              <Send className="h-4 w-4" />
              Envoyer le message
            </button>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default ContactFAQ;
