import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Mail, Phone, MessageCircle, ChevronDown, Send, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ContactFAQ = () => {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const faqs = [
    { question: t("contactFaq.faq1q"), answer: t("contactFaq.faq1a") },
    { question: t("contactFaq.faq2q"), answer: t("contactFaq.faq2a") },
    { question: t("contactFaq.faq3q"), answer: t("contactFaq.faq3a") },
    { question: t("contactFaq.faq4q"), answer: t("contactFaq.faq4a") },
    { question: t("contactFaq.faq5q"), answer: t("contactFaq.faq5a") },
    { question: t("contactFaq.faq6q"), answer: t("contactFaq.faq6a") },
  ];

  const handleSubmit = async () => {
    // Inline validation — server validates again.
    if (!contactForm.name.trim() || contactForm.name.trim().length < 2) {
      toast.error("Veuillez renseigner votre nom");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactForm.email)) {
      toast.error("Email invalide");
      return;
    }
    if (!contactForm.subject.trim()) {
      toast.error("Veuillez renseigner un sujet");
      return;
    }
    if (contactForm.message.trim().length < 10) {
      toast.error("Message trop court (10 caractères minimum)");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-contact-message", {
        body: contactForm,
      });
      if (error) {
        const msg = (error as any)?.context?.error || (error as any)?.message;
        toast.error(msg || "Échec de l'envoi, veuillez réessayer");
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      toast.success(t("contactFaq.messageSent"));
      setContactForm({ name: "", email: "", subject: "", message: "" });
    } catch (err: any) {
      console.error("contact send error", err);
      toast.error("Échec de l'envoi, veuillez réessayer");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-8 pb-24 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">{t("contactFaq.helpCenter")}</h1>
          <p className="text-muted-foreground max-w-md mx-auto">{t("contactFaq.helpSubtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {[
            { icon: Mail, label: t("contactFaq.email"), value: "support@vary.eu", href: "mailto:support@vary.eu" },
            { icon: Phone, label: t("contactFaq.phone"), value: "+33 1 23 45 67 89", href: "tel:+33123456789" },
            { icon: MessageCircle, label: t("contactFaq.chat"), value: t("contactFaq.chatHours"), href: "#contact" },
          ].map((item) => (
            <a key={item.label} href={item.href} className="bg-card rounded-2xl border border-border p-5 text-center hover:shadow-card-hover transition-shadow">
              <item.icon className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-semibold text-foreground text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.value}</p>
            </a>
          ))}
        </div>

        <div className="mb-12">
          <h2 className="font-heading text-xl font-bold text-foreground mb-6">{t("contactFaq.faqTitle")}</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                  <span className="font-medium text-foreground text-sm pr-4">{faq.question}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        <div id="contact" className="bg-card rounded-2xl border border-border p-6 md:p-8">
          <h2 className="font-heading text-xl font-bold text-foreground mb-6">{t("contactFaq.contactUs")}</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{t("contactFaq.fullName")}</label>
                <Input placeholder="Jean Dupont" value={contactForm.name} onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{t("contactFaq.emailLabel")}</label>
                <Input type="email" placeholder="jean@entreprise.com" value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">{t("contactFaq.subject")}</label>
              <Input placeholder={t("contactFaq.subjectPlaceholder")} value={contactForm.subject} onChange={(e) => setContactForm((p) => ({ ...p, subject: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">{t("contactFaq.message")}</label>
              <Textarea placeholder={t("contactFaq.messagePlaceholder")} className="resize-none" rows={5} value={contactForm.message} onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))} />
            </div>
            <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-dark transition-colors">
              <Send className="h-4 w-4" />
              {t("contactFaq.sendMessage")}
            </button>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default ContactFAQ;
