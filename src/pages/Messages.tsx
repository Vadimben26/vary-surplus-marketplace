import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageCircle, Send, ArrowLeft, Crown, User, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslateMessage } from "@/hooks/useTranslateMessage";
import { useBuyerPrefs } from "@/hooks/useBuyerPrefs";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import BuyerPrefsGate from "@/components/BuyerPrefsGate";
import { Link } from "react-router-dom";
import MessageTemplates from "@/components/messages/MessageTemplates";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  lot_id: string | null;
  content: string;
  read: boolean;
  created_at: string;
}

interface ConversationPartner {
  id: string;
  full_name: string | null;
  company_name: string | null;
  user_type: string;
}

const Messages = () => {
  const { t } = useTranslation();
  const { profile, canAccessSeller } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    searchParams.get("with") || null
  );
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const [showGate, setShowGate] = useState(false);
  const [gateMode, setGateMode] = useState<"questionnaire" | "verifyPro">("questionnaire");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { translateMessage } = useTranslateMessage();
  const { hasBuyerPrefs, isVerifiedPro, loading: prefsLoading } = useBuyerPrefs();

  const lotId = searchParams.get("lot") || null;

  // Detect if user is acting as seller in this context
  const isFromSeller = searchParams.get("lot") !== null || document.referrer.includes("/seller") || sessionStorage.getItem("vary_last_interface") === "seller";
  const actingAsSeller = canAccessSeller() && isFromSeller;

  // Check VIP status for BOTH roles independently
  const { data: isVipSeller = false } = useQuery({
    queryKey: ["is-vip-seller", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_vip_seller");
      return !!data;
    },
    enabled: !!profile?.id && canAccessSeller(),
  });

  const { data: isVipBuyer = false } = useQuery({
    queryKey: ["is-vip-buyer", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_vip_buyer");
      return !!data;
    },
    enabled: !!profile?.id,
  });

  const isVip = actingAsSeller ? isVipSeller : isVipBuyer;

  // Fetch all messages for this user
  const { data: allMessages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["my-messages", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!profile?.id,
  });

  // Get unique conversation partner IDs
  const partnerIds = useMemo(() => {
    const ids = new Set<string>();
    allMessages.forEach((msg) => {
      if (msg.sender_id !== profile?.id) ids.add(msg.sender_id);
      if (msg.receiver_id !== profile?.id) ids.add(msg.receiver_id);
    });
    // Also add the "with" param if present
    const withParam = searchParams.get("with");
    if (withParam) ids.add(withParam);
    return Array.from(ids);
  }, [allMessages, profile?.id, searchParams]);

  // Fetch partner profiles
  const { data: partners = [] } = useQuery({
    queryKey: ["message-partners", partnerIds],
    queryFn: async () => {
      if (partnerIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, user_type")
        .in("id", partnerIds);
      if (error) throw error;
      return (data || []) as ConversationPartner[];
    },
    enabled: partnerIds.length > 0,
  });

  const partnersMap = useMemo(() => {
    const map: Record<string, ConversationPartner> = {};
    partners.forEach((p) => { map[p.id] = p; });
    return map;
  }, [partners]);

  // Build conversation list with last message and unread count
  const conversations = useMemo(() => {
    const convMap: Record<string, { partnerId: string; lastMessage: Message; unreadCount: number }> = {};
    allMessages.forEach((msg) => {
      const partnerId = msg.sender_id === profile?.id ? msg.receiver_id : msg.sender_id;
      if (!convMap[partnerId] || new Date(msg.created_at) > new Date(convMap[partnerId].lastMessage.created_at)) {
        convMap[partnerId] = {
          partnerId,
          lastMessage: msg,
          unreadCount: convMap[partnerId]?.unreadCount || 0,
        };
      }
      if (msg.receiver_id === profile?.id && !msg.read) {
        convMap[partnerId] = {
          ...convMap[partnerId],
          partnerId,
          lastMessage: convMap[partnerId]?.lastMessage || msg,
          unreadCount: (convMap[partnerId]?.unreadCount || 0) + 1,
        };
      }
    });

    // Add empty conversation for "with" param
    const withParam = searchParams.get("with");
    if (withParam && !convMap[withParam]) {
      convMap[withParam] = {
        partnerId: withParam,
        lastMessage: { id: "", sender_id: "", receiver_id: "", lot_id: null, content: "", read: true, created_at: new Date().toISOString() },
        unreadCount: 0,
      };
    }

    return Object.values(convMap).sort(
      (a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    );
  }, [allMessages, profile?.id, searchParams]);

  // Messages for selected conversation
  const conversationMessages = useMemo(() => {
    if (!selectedConversation || !profile?.id) return [];
    return allMessages.filter(
      (msg) =>
        (msg.sender_id === profile.id && msg.receiver_id === selectedConversation) ||
        (msg.sender_id === selectedConversation && msg.receiver_id === profile.id)
    );
  }, [allMessages, selectedConversation, profile?.id]);

  // Auto-select conversation from URL param
  useEffect(() => {
    const withParam = searchParams.get("with");
    if (withParam) setSelectedConversation(withParam);
  }, [searchParams]);

  // Mark messages as read
  useEffect(() => {
    if (!selectedConversation || !profile?.id) return;
    const unread = conversationMessages.filter(
      (msg) => msg.receiver_id === profile.id && !msg.read
    );
    if (unread.length > 0) {
      supabase
        .from("messages")
        .update({ read: true })
        .in("id", unread.map((m) => m.id))
        .then(() => refetchMessages());
    }
  }, [selectedConversation, conversationMessages, profile?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          refetchMessages();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, refetchMessages]);

  // Auto-translate incoming messages
  useEffect(() => {
    if (!profile?.id) return;
    conversationMessages.forEach(async (msg) => {
      if (msg.sender_id !== profile.id && !translatedMessages[msg.id]) {
        const translated = await translateMessage(msg.content);
        if (translated !== msg.content) {
          setTranslatedMessages((prev) => ({ ...prev, [msg.id]: translated }));
        }
      }
    });
  }, [conversationMessages, profile?.id]);

  // When the buyer chats with a seller using filtered visibility, require Level 2.
  // We only gate when the current user acts as a buyer (not when the seller replies).
  const { data: recipientSellerInfo } = useQuery({
    queryKey: ["recipient-seller-visibility", selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return null;
      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id, user_type")
        .eq("id", selectedConversation)
        .maybeSingle();
      if (!prof?.user_id) return null;
      const isSellerProfile =
        prof.user_type === "seller" || prof.user_type === "both";
      if (!isSellerProfile) return { visibility_mode: null, isSeller: false };
      const { data: prefs } = await supabase
        .from("seller_preferences")
        .select("visibility_mode")
        .eq("user_id", prof.user_id)
        .maybeSingle();
      return {
        visibility_mode: prefs?.visibility_mode ?? null,
        isSeller: true,
      };
    },
    enabled: !!selectedConversation,
    staleTime: 60_000,
  });

  const recipientIsFilteredSeller =
    !!recipientSellerInfo?.isSeller &&
    recipientSellerInfo.visibility_mode === "filtered";

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation || !profile?.id || sending) return;

    // Only gate the buyer side. If the current user is acting as a seller in
    // this thread, never block them from replying.
    if (!actingAsSeller && recipientIsFilteredSeller && !prefsLoading) {
      if (!hasBuyerPrefs) {
        setGateMode("questionnaire");
        setShowGate(true);
        return;
      }
      if (!isVerifiedPro) {
        setGateMode("verifyPro");
        setShowGate(true);
        return;
      }
    }

    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: profile.id,
        receiver_id: selectedConversation,
        content: newMessage.trim(),
        lot_id: lotId,
      });
      if (error) throw error;
      setNewMessage("");
      refetchMessages();
    } catch (err) {
      console.error("Send error:", err);
    } finally {
      setSending(false);
    }
  };

  const totalUnread = useMemo(() => {
    if (!profile?.id) return 0;
    return allMessages.filter((m) => m.receiver_id === profile.id && !m.read).length;
  }, [allMessages, profile?.id]);

  // Expose unread count globally for BottomNav
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("vary-unread-count", { detail: totalUnread }));
  }, [totalUnread]);

  const selectedPartner = selectedConversation ? partnersMap[selectedConversation] : null;

  const vipLink = actingAsSeller ? "/seller/vip" : "/buyer/vip";
  const vipLabel = actingAsSeller ? t("sellerVIP.messageTemplatesDesc") : t("buyerVIP.prioritySupportDesc");

  // No conversations state
  if (conversations.length === 0 && !searchParams.get("with")) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <main className="px-4 md:px-8 py-16 pb-24 max-w-[1600px] mx-auto text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground mb-3">{t("messages.title")}</h1>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">{t("messages.empty")}</p>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <div className="flex flex-1 overflow-hidden pb-14 md:pb-16">
        {/* Conversation list */}
        <div
          className={`${selectedConversation ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 lg:w-96 border-r border-border bg-card`}
        >
          <div className="p-4 border-b border-border">
            <h2 className="font-heading font-bold text-foreground text-lg">{t("messages.title")}</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => {
              const partner = partnersMap[conv.partnerId];
              const isSelected = selectedConversation === conv.partnerId;
              return (
                <button
                  key={conv.partnerId}
                  onClick={() => setSelectedConversation(conv.partnerId)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted ${isSelected ? "bg-muted" : ""}`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {partner?.company_name || partner?.full_name || "Utilisateur"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {conv.lastMessage.content || t("messages.startConversation")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* VIP templates or CTA in sidebar */}
          {isVip ? (
            <MessageTemplates isSeller={actingAsSeller} onSelectTemplate={setNewMessage}>
              <button className="flex items-center gap-2 mx-3 mb-3 p-2.5 rounded-lg border border-primary/20 bg-primary/10 hover:bg-primary/15 transition-colors w-[calc(100%-1.5rem)]">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-xs text-primary font-semibold leading-tight">{t("messageTemplates.openTemplates")}</span>
              </button>
            </MessageTemplates>
          ) : (
            <Link
              to={vipLink}
              className="flex items-center gap-2 mx-3 mb-3 p-2.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <Crown className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-xs text-primary font-medium leading-tight">{t("messages.vipTemplates")}</span>
            </Link>
          )}
        </div>

        {/* Conversation view */}
        <div className={`${selectedConversation ? "flex" : "hidden md:flex"} flex-col flex-1`}>
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-1 rounded-lg hover:bg-muted"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedPartner?.company_name || selectedPartner?.full_name || "Utilisateur"}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {conversationMessages.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">{t("messages.startConversation")}</p>
                )}
                <AnimatePresence initial={false}>
                  {conversationMessages.map((msg) => {
                    const isMine = msg.sender_id === profile?.id;
                    const translated = translatedMessages[msg.id];
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                            isMine
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{isMine ? msg.content : (translated || msg.content)}</p>
                          {!isMine && translated && translated !== msg.content && (
                            <p className="text-[10px] opacity-60 mt-1 italic">{t("messages.translatedAuto")}</p>
                          )}
                          <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* VIP templates or CTA inline */}
              {isVip ? (
                <MessageTemplates isSeller={actingAsSeller} onSelectTemplate={setNewMessage}>
                  <button className="flex items-center gap-2 mx-4 mb-2 px-3 py-2 rounded-lg border border-primary/15 bg-primary/10 hover:bg-primary/15 transition-colors">
                    <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span className="text-[11px] text-primary font-semibold">{t("messageTemplates.openTemplates")}</span>
                  </button>
                </MessageTemplates>
              ) : (
                <Link
                  to={vipLink}
                  className="flex items-center gap-2 mx-4 mb-2 px-3 py-2 rounded-lg border border-primary/15 bg-primary/5 hover:bg-primary/10 transition-colors"
                >
                  <Crown className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="text-[11px] text-primary font-medium">{t("messages.vipTemplates")}</span>
                </Link>
              )}

              {/* Input */}
              <div className="px-4 pb-3 pt-1">
                <div className="flex items-center gap-2 bg-muted rounded-2xl border border-border px-4 py-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder={t("messages.typeMessage")}
                    className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    className="p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">{t("messages.selectConversation")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Messages;
