import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const translationCache = new Map<string, string>();

export const useTranslateMessage = () => {
  const { i18n } = useTranslation();
  const [translating, setTranslating] = useState(false);

  const translateMessage = async (text: string): Promise<string> => {
    const targetLang = i18n.language;
    const cacheKey = `${text}__${targetLang}`;

    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey)!;
    }

    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate-message", {
        body: { text, targetLang },
      });

      if (error) throw error;
      const translated = data?.translated || text;
      translationCache.set(cacheKey, translated);
      return translated;
    } catch {
      return text;
    } finally {
      setTranslating(false);
    }
  };

  return { translateMessage, translating };
};
