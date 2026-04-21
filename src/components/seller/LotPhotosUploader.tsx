import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type LotPhotoSlot = {
  url: string;
  mediaType: "photo" | "video";
  isRequired: boolean;
} | null;

export type LotPhotosState = Record<number, LotPhotoSlot>;

export const REQUIRED_SLOTS = [1, 2, 3, 4, 5, 6] as const;
export const OPTIONAL_SLOTS = [7, 8, 9] as const;
export const ALL_SLOTS = [...REQUIRED_SLOTS, ...OPTIONAL_SLOTS] as const;

const PHOTO_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const VIDEO_MIME = ["video/mp4", "video/quicktime"];
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB

export const SLOT_META: Record<number, { isRequired: boolean; allowVideo: boolean }> = {
  1: { isRequired: true, allowVideo: false },
  2: { isRequired: true, allowVideo: false },
  3: { isRequired: true, allowVideo: false },
  4: { isRequired: true, allowVideo: false },
  5: { isRequired: true, allowVideo: false },
  6: { isRequired: true, allowVideo: false },
  7: { isRequired: false, allowVideo: false },
  8: { isRequired: false, allowVideo: true },
  9: { isRequired: false, allowVideo: false },
};

export function emptyPhotosState(): LotPhotosState {
  const s: LotPhotosState = {};
  ALL_SLOTS.forEach((n) => (s[n] = null));
  return s;
}

export function countRequiredFilled(state: LotPhotosState): number {
  return REQUIRED_SLOTS.filter((n) => state[n] !== null).length;
}

interface Props {
  lotId: string;
  sellerProfileId: string;
  state: LotPhotosState;
  onChange: (state: LotPhotosState) => void;
}

export default function LotPhotosUploader({ lotId, sellerProfileId, state, onChange }: Props) {
  const { t } = useTranslation();
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  const requiredFilled = countRequiredFilled(state);

  const handleFile = async (slotNumber: number, file: File) => {
    const meta = SLOT_META[slotNumber];
    const isVideo = file.type.startsWith("video/");

    if (isVideo && !meta.allowVideo) {
      toast.error(t("lotPhotos.errorPhotoOnly", "Cet emplacement n'accepte que des photos."));
      return;
    }
    if (isVideo && !VIDEO_MIME.includes(file.type)) {
      toast.error(t("lotPhotos.errorVideoFormat", "Format vidéo non accepté (mp4, mov uniquement)."));
      return;
    }
    if (!isVideo && !PHOTO_MIME.includes(file.type)) {
      toast.error(t("lotPhotos.errorPhotoFormat", "Format photo non accepté (jpg, png, webp uniquement)."));
      return;
    }
    const limit = isVideo ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
    if (file.size > limit) {
      toast.error(
        isVideo
          ? t("lotPhotos.errorVideoSize", "Vidéo trop lourde (max 100MB).")
          : t("lotPhotos.errorPhotoSize", "Photo trop lourde (max 10MB).")
      );
      return;
    }

    setUploadingSlot(slotNumber);
    setProgress(10);
    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `${sellerProfileId}/${lotId}/${slotNumber}_${Date.now()}.${ext}`;

      // Remove previous file in DB if exists (storage cleanup is best-effort)
      const previous = state[slotNumber];
      if (previous) {
        await supabase.from("lot_photos").delete().eq("lot_id", lotId).eq("photo_number", slotNumber);
      }

      setProgress(40);
      const { error: uploadError } = await supabase.storage
        .from("lot-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      setProgress(80);
      const { data: urlData } = supabase.storage.from("lot-images").getPublicUrl(path);
      const url = urlData.publicUrl;

      const { error: insertError } = await supabase.from("lot_photos").insert({
        lot_id: lotId,
        photo_number: slotNumber,
        url,
        media_type: isVideo ? "video" : "photo",
        is_required: meta.isRequired,
      });
      if (insertError) throw insertError;

      setProgress(100);
      onChange({
        ...state,
        [slotNumber]: { url, mediaType: isVideo ? "video" : "photo", isRequired: meta.isRequired },
      });
      toast.success(t("lotPhotos.uploadSuccess", "Photo téléversée"));
    } catch (err: any) {
      console.error("Photo upload failed:", err);
      toast.error(err?.message || t("lotPhotos.uploadError", "Échec du téléversement"));
    } finally {
      setUploadingSlot(null);
      setProgress(0);
    }
  };

  const handleRemove = async (slotNumber: number) => {
    const current = state[slotNumber];
    if (!current) return;
    try {
      await supabase.from("lot_photos").delete().eq("lot_id", lotId).eq("photo_number", slotNumber);
      onChange({ ...state, [slotNumber]: null });
      toast.success(t("lotPhotos.removed", "Photo supprimée"));
    } catch (err: any) {
      toast.error(err?.message || t("lotPhotos.removeError", "Erreur de suppression"));
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress bar header */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">
            {t("lotPhotos.requiredProgress", "{{filled}}/6 photos obligatoires complétées", {
              filled: requiredFilled,
            })}
          </span>
          {requiredFilled === 6 ? (
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("lotPhotos.allRequiredDone", "Toutes les obligatoires sont prêtes")}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-destructive font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              {t("lotPhotos.missing", "{{count}} manquante(s)", { count: 6 - requiredFilled })}
            </span>
          )}
        </div>
        <Progress value={(requiredFilled / 6) * 100} className="h-2" />
      </div>

      {/* Required group 1 */}
      <SlotGroup
        title={t("lotPhotos.group1Title", "Vue d'ensemble de la palette")}
        slots={[1, 2, 3]}
        state={state}
        uploadingSlot={uploadingSlot}
        progress={progress}
        onFile={handleFile}
        onRemove={handleRemove}
      />

      {/* Required group 2 */}
      <SlotGroup
        title={t("lotPhotos.group2Title", "Contenu et qualité des pièces")}
        slots={[4, 5, 6]}
        state={state}
        uploadingSlot={uploadingSlot}
        progress={progress}
        onFile={handleFile}
        onRemove={handleRemove}
      />

      {/* Optional group */}
      <SlotGroup
        title={t("lotPhotos.optionalGroupTitle", "Optionnels — encouragés")}
        slots={[7, 8, 9]}
        state={state}
        uploadingSlot={uploadingSlot}
        progress={progress}
        onFile={handleFile}
        onRemove={handleRemove}
      />
    </div>
  );
}

function SlotGroup({
  title,
  slots,
  state,
  uploadingSlot,
  progress,
  onFile,
  onRemove,
}: {
  title: string;
  slots: number[];
  state: LotPhotosState;
  uploadingSlot: number | null;
  progress: number;
  onFile: (slot: number, file: File) => void;
  onRemove: (slot: number) => void;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {slots.map((n) => (
          <SlotCard
            key={n}
            slotNumber={n}
            value={state[n]}
            uploading={uploadingSlot === n}
            progress={uploadingSlot === n ? progress : 0}
            onFile={(file) => onFile(n, file)}
            onRemove={() => onRemove(n)}
          />
        ))}
      </div>
    </div>
  );
}

function SlotCard({
  slotNumber,
  value,
  uploading,
  progress,
  onFile,
  onRemove,
}: {
  slotNumber: number;
  value: LotPhotoSlot;
  uploading: boolean;
  progress: number;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const meta = SLOT_META[slotNumber];

  const labelKey = `lotPhotos.slot${slotNumber}.label`;
  const descKey = `lotPhotos.slot${slotNumber}.desc`;
  const fallbackLabels: Record<number, string> = {
    1: "Palette entière de face",
    2: "Vue du dessus (plongeante)",
    3: "Étiquette palette / bon de livraison",
    4: "Carton ouvert représentatif",
    5: "Éventail de 10 pièces à plat",
    6: "Gros plan étiquettes / tags",
    7: "Pièce \"star\" mise en valeur",
    8: "Vidéo 30s palette ouverte",
    9: "Répartition des états (tableau)",
  };
  const fallbackDescs: Record<number, string> = {
    1: "Photo complète, palette posée au sol, fond neutre.",
    2: "Depuis une hauteur, densité d'emballage visible.",
    3: "Référence fournisseur, poids, nombre de colis.",
    4: "1 carton ouvert, pièces en vrac. Représentatif du lot.",
    5: "10 pièces au hasard sur fond neutre.",
    6: "Photo nette des étiquettes sur 3-4 pièces.",
    7: "Meilleure pièce du lot, sur cintre ou à plat.",
    8: "mp4/mov, max 100MB.",
    9: "Document de contrôle qualité ou tri visuel.",
  };

  const accept = meta.allowVideo
    ? "image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
    : "image/jpeg,image/png,image/webp";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const isMissing = meta.isRequired && !value;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3 space-y-2 transition-colors",
        isMissing ? "border-destructive/60" : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground">
            {t("lotPhotos.photoLabel", "Photo")} {slotNumber} —{" "}
            <span className="font-medium">{t(labelKey, fallbackLabels[slotNumber])}</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
            {t(descKey, fallbackDescs[slotNumber])}
          </p>
        </div>
        {meta.isRequired ? (
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-destructive/10 text-destructive flex-shrink-0">
            {t("lotPhotos.required", "Obligatoire")}
          </span>
        ) : (
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-green-100 text-green-700 flex-shrink-0">
            {t("lotPhotos.optional", "Optionnel")}
          </span>
        )}
      </div>

      <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
        {uploading && (
          <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 px-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <Progress value={progress} className="h-1.5 w-full" />
          </div>
        )}
        {value ? (
          <>
            {value.mediaType === "video" ? (
              <video src={value.url} className="w-full h-full object-cover" controls={false} muted playsInline />
            ) : (
              <img src={value.url} alt={fallbackLabels[slotNumber]} className="w-full h-full object-cover" />
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onRemove}
                    className="absolute top-1.5 right-1.5 bg-foreground/80 text-background rounded-full p-1 hover:bg-foreground transition-colors"
                    aria-label={t("common.delete", "Supprimer")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{t("lotPhotos.replaceHint", "Cliquez pour supprimer puis ré-ajouter.")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        ) : (
          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/70 transition-colors gap-1.5 px-3 text-center">
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground">
              {t("lotPhotos.dropOrClick", "Cliquez ou déposez ici")}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={handleChange}
              disabled={uploading}
            />
          </label>
        )}
      </div>
    </div>
  );
}
