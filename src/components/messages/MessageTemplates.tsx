import { useState } from "react";
import { Crown, Clock, DollarSign, Package, AlertTriangle, ShoppingCart, TrendingUp, Star, ChevronRight, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Template {
  icon: React.ElementType;
  titleKey: string;
  tagKey?: string;
  content: string;
  variant?: string;
  variantContent?: string;
}

const BUYER_TEMPLATES: Template[] = [
  {
    icon: Clock,
    titleKey: "messageTemplates.buyer.reservation",
    tagKey: "messageTemplates.tags.reservation",
    content: `Bonjour 👋
Je suis intéressé par ce lot.

Pouvez-vous me le réserver pendant [24h / 48h] ?
Je confirme rapidement.

Merci !`,
  },
  {
    icon: DollarSign,
    titleKey: "messageTemplates.buyer.negotiation",
    tagKey: "messageTemplates.tags.negotiation",
    content: `Bonjour,
Le lot m'intéresse 👍

Seriez-vous ouvert à [X€/pièce] pour une validation immédiate ?

Je peux payer aujourd'hui si c'est ok.`,
  },
  {
    icon: Package,
    titleKey: "messageTemplates.buyer.multiLot",
    tagKey: "messageTemplates.tags.multiLot",
    content: `Bonjour,
Je suis intéressé par plusieurs de vos lots 👍

Pouvez-vous proposer un prix si je prends [X lots / X pièces] ?

Je peux confirmer rapidement.`,
  },
  {
    icon: AlertTriangle,
    titleKey: "messageTemplates.buyer.issue",
    tagKey: "messageTemplates.tags.issue",
    content: `Bonjour,
Je viens de recevoir le lot.

Il y a un souci concernant :
→ [décrire le problème]

Pouvez-vous proposer une solution ?
Merci d'avance.`,
  },
];

const SELLER_TEMPLATES: Template[] = [
  {
    icon: ShoppingCart,
    titleKey: "messageTemplates.seller.followUp",
    tagKey: "messageTemplates.tags.followUp",
    content: `Bonjour 👋
Je vois que ce lot vous intéresse 🙂

Il est toujours disponible.
Souhaitez-vous que je vous fasse une offre pour vous aider à décider ?`,
    variant: "messageTemplates.seller.followUpVariant",
    variantContent: `Bonjour,
Petit update : ce lot pourrait partir rapidement.

Si vous êtes intéressé, je peux vous proposer une offre aujourd'hui 👍`,
  },
  {
    icon: TrendingUp,
    titleKey: "messageTemplates.seller.upsell",
    tagKey: "messageTemplates.tags.upsell",
    content: `Bonjour,
J'ai un autre lot très proche de celui-ci (mêmes marques / positionnement).

Souhaitez-vous que je vous envoie les détails ?`,
    variant: "messageTemplates.seller.upsellVariant",
    variantContent: `Bonjour,
Si vous prenez ce lot, je peux vous proposer un second lot avec une remise 👍

Intéressé ?`,
  },
  {
    icon: DollarSign,
    titleKey: "messageTemplates.seller.counterOffer",
    tagKey: "messageTemplates.tags.counterOffer",
    content: `Bonjour,
Merci pour votre offre 👍

Je ne peux pas accepter ce prix, mais je peux proposer [X€/pièce].

Je peux valider immédiatement si cela vous convient.`,
    variant: "messageTemplates.seller.counterOfferVariant",
    variantContent: `Bonjour,
On peut s'entendre à [X€/pièce] si vous confirmez aujourd'hui 👍

Dites-moi et je bloque le lot.`,
  },
  {
    icon: Star,
    titleKey: "messageTemplates.seller.review",
    tagKey: "messageTemplates.tags.review",
    content: `Bonjour,
Merci pour votre commande 🙏

Si tout est ok, pourriez-vous laisser un avis ?
Cela aide beaucoup 👍`,
    variant: "messageTemplates.seller.reviewVariant",
    variantContent: `Bonjour,
Merci pour votre commande 🙏

Si vous êtes satisfait, un avis serait très apprécié 👍
Je peux aussi vous proposer d'autres lots similaires.`,
  },
];

interface MessageTemplatesProps {
  isSeller: boolean;
  onSelectTemplate: (content: string) => void;
  children: React.ReactNode;
}

const MessageTemplates = ({ isSeller, onSelectTemplate, children }: MessageTemplatesProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const templates = isSeller ? SELLER_TEMPLATES : BUYER_TEMPLATES;

  const handleSelect = (content: string) => {
    onSelectTemplate(content);
    setOpen(false);
    toast.success(t("messageTemplates.inserted"));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <SheetTitle className="font-heading text-lg">{t("messageTemplates.title")}</SheetTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isSeller ? t("messageTemplates.subtitleSeller") : t("messageTemplates.subtitleBuyer")}
          </p>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="p-4 space-y-3">
            {templates.map((tpl, idx) => {
              const isExpanded = expandedIdx === idx;
              return (
                <div key={idx} className="rounded-xl border border-border bg-card overflow-hidden">
                  {/* Header */}
                  <button
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <tpl.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="flex-1 text-sm font-semibold text-foreground">{t(tpl.titleKey)}</span>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      {/* Main template */}
                      <div className="relative bg-muted/50 rounded-lg p-3">
                        <p className="text-sm text-foreground whitespace-pre-line leading-relaxed pr-8">{tpl.content}</p>
                        <button
                          onClick={() => handleSelect(tpl.content)}
                          className="absolute top-2 right-2 p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                          title={t("messageTemplates.use")}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Variant */}
                      {tpl.variant && tpl.variantContent && (
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                            {t("messageTemplates.variant")}
                          </p>
                          <div className="relative bg-muted/50 rounded-lg p-3">
                            <p className="text-sm text-foreground whitespace-pre-line leading-relaxed pr-8">{tpl.variantContent}</p>
                            <button
                              onClick={() => handleSelect(tpl.variantContent!)}
                              className="absolute top-2 right-2 p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                              title={t("messageTemplates.use")}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default MessageTemplates;
