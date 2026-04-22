import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, X, Loader2, Info } from "lucide-react";
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
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

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
      toast.error(t("lotPhotos.errorPhotoOnly"));
      return;
    }
    if (isVideo && !VIDEO_MIME.includes(file.type)) {
      toast.error(t("lotPhotos.errorVideoFormat"));
      return;
    }
    if (!isVideo && !PHOTO_MIME.includes(file.type)) {
      toast.error(t("lotPhotos.errorPhotoFormat"));
      return;
    }
    const limit = isVideo ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
    if (file.size > limit) {
      toast.error(isVideo ? t("lotPhotos.errorVideoSize") : t("lotPhotos.errorPhotoSize"));
      return;
    }

    setUploadingSlot(slotNumber);
    setProgress(10);
    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `${sellerProfileId}/${lotId}/${slotNumber}_${Date.now()}.${ext}`;

      if (state[slotNumber]) {
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
    } catch (err: any) {
      console.error("Photo upload failed:", err);
      toast.error(err?.message || "Échec du téléversement");
    } finally {
      setUploadingSlot(null);
      setProgress(0);
    }
  };

  const handleRemove = async (slotNumber: number) => {
    if (!state[slotNumber]) return;
    try {
      await supabase.from("lot_photos").delete().eq("lot_id", lotId).eq("photo_number", slotNumber);
      onChange({ ...state, [slotNumber]: null });
    } catch (err: any) {
      toast.error(err?.message || "Erreur de suppression");
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-3">
        {/* Compact progress header */}
        <div className="rounded-lg border border-border bg-card px-3 py-2 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground">
              {requiredFilled}/6 photos obligatoires
            </span>
            <span className={cn("font-medium", requiredFilled === 6 ? "text-green-600" : "text-destructive")}>
              {requiredFilled === 6 ? "Prêt" : `${6 - requiredFilled} manquante(s)`}
            </span>
          </div>
          <Progress value={(requiredFilled / 6) * 100} className="h-1" />
        </div>

        {/* 3x3 compact grid — all 9 slots together */}
        <div className="grid grid-cols-3 gap-2">
          {ALL_SLOTS.map((n) => (
            <SlotCard
              key={n}
              slotNumber={n}
              value={state[n]}
              uploading={uploadingSlot === n}
              progress={uploadingSlot === n ? progress : 0}
              onFile={(file) => handleFile(n, file)}
              onRemove={() => handleRemove(n)}
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
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

  const accept = meta.allowVideo
    ? "image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
    : "image/jpeg,image/png,image/webp";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const isMissing = meta.isRequired && !value;
  const label = t(`lotPhotos.slot${slotNumber}.label`);
  const desc = t(`lotPhotos.slot${slotNumber}.desc`);

  return (
    <div
      className={cn(
        "rounded-lg border bg-card overflow-hidden transition-colors",
        isMissing ? "border-destructive/50" : value ? "border-green-500/40" : "border-border"
      )}
    >
      {/* Compact header: number + tooltip */}
      <div className="flex items-center justify-between px-1.5 py-1 border-b border-border bg-muted/30">
        <span className={cn(
          "text-[10px] font-bold flex items-center gap-1",
          meta.isRequired ? "text-foreground" : "text-muted-foreground"
        )}>
          {slotNumber}
          {!meta.isRequired && <span className="text-[8px] uppercase text-green-600">opt.</span>}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground hover:text-foreground">
              <Info className="h-2.5 w-2.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px] text-xs">
            <p className="font-semibold mb-0.5">{label}</p>
            <p className="text-[11px] opacity-90">{desc}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="relative aspect-square bg-muted">
        {uploading && (
          <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5 px-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <Progress value={progress} className="h-1 w-full" />
          </div>
        )}
        {value ? (
          <>
            {value.mediaType === "video" ? (
              <video src={value.url} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <img src={value.url} alt={label} className="w-full h-full object-cover" />
            )}
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-1 right-1 bg-foreground/80 text-background rounded-full p-0.5 hover:bg-foreground transition-colors"
              aria-label="Supprimer"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/70 transition-colors gap-0.5 text-center px-1">
                <ImagePlus className="h-4 w-4 text-muted-foreground" />
                <span className="text-[9px] font-medium text-muted-foreground leading-tight line-clamp-2">
                  {label}
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
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px] text-xs">
              <p className="font-semibold mb-0.5">{label}</p>
              <p className="text-[11px] opacity-90">{desc}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
