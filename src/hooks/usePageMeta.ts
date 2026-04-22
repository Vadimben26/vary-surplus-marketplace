import { useEffect } from "react";

interface PageMetaOptions {
  title: string;
  description?: string;
  image?: string;
}

export function usePageMeta({ title, description, image }: PageMetaOptions) {
  useEffect(() => {
    document.title = title ? `${title} — Vary` : "Vary";

    const descEl = document.querySelector('meta[name="description"]');
    if (descEl && description) descEl.setAttribute("content", description);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", document.title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && description) ogDesc.setAttribute("content", description);

    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && image) ogImage.setAttribute("content", image);

    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute("content", document.title);

    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc && description) twDesc.setAttribute("content", description);

    const twImage = document.querySelector('meta[name="twitter:image"]');
    if (twImage && image) twImage.setAttribute("content", image);

    return () => {
      document.title = "Vary";
    };
  }, [title, description, image]);
}
