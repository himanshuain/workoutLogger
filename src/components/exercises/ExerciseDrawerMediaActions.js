import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import ExerciseMediaImage from "@/components/exercises/ExerciseMediaImage";
import { useWorkout } from "@/context/WorkoutContext";
import GoogleGIcon from "@/components/icons/GoogleGIcon";
import {
  Modal,
  NestedModal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal";
import { sheetTopActionButtonClass } from "@/components/ui/sheetTopActions";
import { googleImagesSearchUrl, isSmartworkoutMediaUrl } from "@/lib/exerciseMedia";
import { isSmartworkoutCatalogExercise } from "@/lib/exerciseGifSearch";
import {
  getExerciseMediaOverrideUrl,
  isPersistableMediaUrl,
} from "@/lib/exerciseMediaOverrides";
import { useExerciseMediaOverridePersist } from "@/hooks/useExerciseMediaOverridePersist";
import { isGifUploadFile, MAX_GIF_UPLOAD_BYTES } from "@/lib/exerciseGifUpload";
import { uploadExerciseMediaGif } from "@/lib/exerciseMediaStorage";
import { useExerciseGifSearch } from "@/hooks/useExerciseGifSearch";
import { cn } from "@/lib/utils";
import { ImagePlus, Link2, Loader2, Search, Upload, X } from "lucide-react";
import PendingIcon from "@/components/ui/PendingIcon";
import { toast } from "sonner";

function InputClearButton({ onClear, isDarkMode, label = "Clear" }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className={cn(
        "absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors",
        isDarkMode
          ? "text-iron-400 hover:bg-iron-800 hover:text-iron-200"
          : "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
      )}
      aria-label={label}
    >
      <X className="h-4 w-4" aria-hidden />
    </button>
  );
}

function GifResultGrid({ results, saving, isDarkMode, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 pb-4 sm:grid-cols-3">
      {results.map(item => (
        <button
          key={item.id || item.gifUrl}
          type="button"
          disabled={saving}
          onClick={() => onSelect(item.gifUrl)}
          className={cn(
            "group flex flex-col overflow-hidden rounded-card border text-left transition-all disabled:opacity-50",
            isDarkMode
              ? "border-iron-700 hover:border-iron-500 hover:bg-iron-800/50"
              : "border-slate-200 hover:border-slate-400 hover:bg-slate-50",
          )}
        >
          <div
            className={cn(
              "relative aspect-[4/3] w-full overflow-hidden",
              isDarkMode ? "bg-iron-800" : "bg-slate-100",
            )}
          >
            <Image
              src={item.gifUrl}
              alt=""
              fill
              className="object-cover"
              sizes="160px"
              unoptimized
            />
          </div>
          <p
            className={cn(
              "line-clamp-2 px-2 py-1.5 text-[11px] font-medium leading-snug capitalize",
              isDarkMode ? "text-iron-200" : "text-slate-700",
            )}
          >
            {item.name}
          </p>
        </button>
      ))}
    </div>
  );
}

/**
 * Exercise preview: open GIF search + upload; paste URL via carousel link control.
 */
export default function ExerciseDrawerMediaActions({
  exercise,
  exerciseName,
  allExercises = [],
  isDarkMode,
  mediaOverrides,
  updateSettings,
  compact = false,
  mediaPersist,
  pasteUrlOpen: pasteUrlOpenProp,
  onPasteUrlOpenChange,
}) {
  const { user } = useWorkout();
  const internalPersist = useExerciseMediaOverridePersist();
  const { saving, persistPrimaryUrl } = mediaPersist ?? internalPersist;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pasteInternal, setPasteInternal] = useState(false);
  const [draftUrl, setDraftUrl] = useState("");
  const pasteUrlInputRef = useRef(null);
  const gifFileInputRef = useRef(null);

  const pasteUrlOpen = pasteUrlOpenProp ?? pasteInternal;
  const setPasteUrlOpen = onPasteUrlOpenChange ?? setPasteInternal;

  const name = exerciseName || exercise?.name || "";
  const googleHref = googleImagesSearchUrl(name);
  const currentOverride = getExerciseMediaOverrideUrl(exercise, mediaOverrides);

  const smartworkoutCatalog = useMemo(
    () => (allExercises || []).filter(isSmartworkoutCatalogExercise),
    [allExercises],
  );

  const librarySearch = useExerciseGifSearch(name, {
    enabled: pickerOpen,
    localExercises: smartworkoutCatalog,
  });

  const { results, loading, searched, query: searchQuery, setQuery } = librarySearch;

  useEffect(() => {
    if (pasteUrlOpen) {
      setDraftUrl(currentOverride || "");
      pasteUrlInputRef.current?.focus();
    }
  }, [pasteUrlOpen, currentOverride]);

  const closeAll = () => {
    setPickerOpen(false);
    setPasteUrlOpen(false);
  };

  const openPicker = () => {
    librarySearch.reset(name);
    setPickerOpen(true);
  };

  const persistOverride = async url => {
    if (!exercise || !updateSettings) return;
    await persistPrimaryUrl(exercise, url, closeAll);
  };

  const handleSelectGif = gifUrl => {
    if (saving || !gifUrl) return;
    void persistOverride(gifUrl);
  };

  const handleSavePaste = async () => {
    const trimmed = draftUrl.trim();
    if (!trimmed) {
      await persistOverride("");
      return;
    }
    if (!isPersistableMediaUrl(trimmed)) {
      toast.error("Enter a valid http(s) image or GIF URL");
      return;
    }
    if (!isSmartworkoutMediaUrl(trimmed)) {
      toast.error("Use a SmartWorkout URL (api.smartworkout.app) or upload from device");
      return;
    }
    await persistOverride(trimmed);
  };

  const openGifFilePicker = () => {
    gifFileInputRef.current?.click();
  };

  const handleGifFileChange = async event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || saving) return;
    if (!isGifUploadFile(file)) {
      toast.error("Choose a GIF file from your device");
      return;
    }
    if (file.size > MAX_GIF_UPLOAD_BYTES) {
      toast.error("GIF must be 8 MB or smaller");
      return;
    }
    if (!user?.id) {
      toast.error("Sign in to upload a GIF");
      return;
    }
    try {
      const publicUrl = await uploadExerciseMediaGif(user.id, exercise, file);
      await persistOverride(publicUrl);
    } catch (err) {
      const message = String(err?.message ?? "");
      if (message.includes("Bucket not found") || message.includes("workoutlogger")) {
        toast.error("Storage not set up — run migration-v22 on Supabase");
      } else {
        toast.error("Could not upload GIF");
      }
    }
  };

  const chipClass = cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-semibold transition-colors",
    compact ? "min-h-[34px] px-3.5 text-[11px]" : "min-h-[40px] rounded-pill px-3.5 text-sm",
    compact
      ? isDarkMode
        ? "border border-white/10 bg-white/[0.06] text-iron-100 active:bg-white/10"
        : "border border-slate-200/90 bg-white text-slate-800 shadow-sm active:bg-slate-50"
      : isDarkMode
        ? "border border-iron-700 bg-iron-800/90 text-iron-100 hover:bg-iron-700"
        : "border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50",
  );

  const inputClass = cn(
    "box-border block w-full min-h-[48px] appearance-none rounded-card border px-3 py-3 text-base leading-normal outline-none focus:ring-2",
    isDarkMode
      ? "border-iron-700 bg-iron-900 text-iron-100 placeholder:text-iron-600 focus:ring-lift-primary/40"
      : "border-slate-200 bg-white placeholder:text-slate-400 focus:ring-workout-primary/40",
  );

  const drawerSurface = cn(
    isDarkMode ? "border-iron-800 bg-iron-900" : "border-slate-200 bg-white",
  );

  /** When `compact`, actions sit inside another Vaul sheet — use nested drawers for correct stacking. */
  const MediaSheet = compact ? NestedModal : Modal;

  const emptyHint = searched ? (
    <p className={`py-8 text-center text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
      No matches for &ldquo;{searchQuery.trim()}&rdquo;.
    </p>
  ) : (
    <p className={`py-8 text-center text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
      Type to search SmartWorkout.
    </p>
  );

  const resultsPanel = (() => {
    if (loading) {
      return (
        <div
          className={cn(
            "flex items-center justify-center gap-2 py-10 text-sm",
            isDarkMode ? "text-iron-500" : "text-slate-500",
          )}
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Searching…
        </div>
      );
    }

    if (results.length > 0) {
      return (
        <GifResultGrid
          results={results}
          saving={saving}
          isDarkMode={isDarkMode}
          onSelect={handleSelectGif}
        />
      );
    }

    return emptyHint;
  })();

  return (
    <>
      <input
        ref={gifFileInputRef}
        type="file"
        accept="image/gif,.gif,image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={handleGifFileChange}
      />
      <div
        className={cn(
          "flex items-center gap-2",
          compact
            ? "-mx-0.5 flex-nowrap overflow-x-auto overscroll-x-contain pb-0.5 scrollbar-hide"
            : "mt-2 flex-wrap",
        )}
      >
        {compact ? (
          <button type="button" onClick={() => setPasteUrlOpen(true)} className={chipClass}>
            <Link2 className="h-4 w-4 shrink-0" aria-hidden />
            Paste URL
          </button>
        ) : null}
        {!compact && googleHref ? (
          <a
            href={googleHref}
            target="_blank"
            rel="noopener noreferrer"
            className={chipClass}
            aria-label={name ? `Search SmartWorkout images for ${name}` : "Search SmartWorkout images"}
            title="SmartWorkout on Google Images"
          >
            <GoogleGIcon className="h-4 w-4 shrink-0" />
            <span>Search</span>
          </a>
        ) : null}
        <button type="button" onClick={openPicker} className={chipClass}>
          <ImagePlus className="h-4 w-4 shrink-0" aria-hidden />
          {currentOverride ? "Change thumbnail" : "Add thumbnail"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={openGifFilePicker}
          className={cn(chipClass, saving && "opacity-50")}
        >
          <PendingIcon pending={saving} iconClassName="h-4 w-4 shrink-0">
            <Upload className="h-4 w-4 shrink-0" aria-hidden />
          </PendingIcon>
          Upload GIF
        </button>
      </div>

      <MediaSheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <ModalContent
          showCloseButton
          className={cn("flex flex-col overflow-hidden", drawerSurface)}
        >
          <ModalTitle className="sr-only">Find a GIF</ModalTitle>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-2">
            <div className="shrink-0 px-4 pb-3">
              <label className="sr-only" htmlFor="exercise-gif-search">
                Search GIFs
              </label>
              <div className="relative">
                <Search
                  className={cn(
                    "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
                    isDarkMode ? "text-iron-500" : "text-slate-400",
                  )}
                  aria-hidden
                />
                <input
                  id="exercise-gif-search"
                  type="text"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  value={searchQuery}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search SmartWorkout…"
                  autoFocus
                  className={cn(inputClass, "pl-10", searchQuery ? "pr-12" : "pr-3")}
                />
                {searchQuery ? (
                  <InputClearButton
                    onClear={() => setQuery("")}
                    isDarkMode={isDarkMode}
                    label="Clear search"
                  />
                ) : null}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] touch-pan-y">
              {resultsPanel}
            </div>
          </div>
        </ModalContent>
      </MediaSheet>

      <MediaSheet open={pasteUrlOpen} onOpenChange={setPasteUrlOpen}>
        <ModalContent
          showCloseButton
          className={cn("flex min-h-0 flex-col overflow-hidden", drawerSurface)}
        >
          <ModalFooter>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSavePaste()}
              className={sheetTopActionButtonClass(isDarkMode, { primary: true })}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </ModalFooter>
          <ModalHeader className="shrink-0 space-y-1.5 pb-0 text-left">
            <ModalTitle className={isDarkMode ? "text-iron-50" : "text-slate-900"}>
              Paste image URL
            </ModalTitle>
            <ModalDescription className={isDarkMode ? "text-iron-400" : "text-slate-600"}>
              api.smartworkout.app asset link
            </ModalDescription>
          </ModalHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-2 pt-4">
            <div className="relative shrink-0">
              <label className="sr-only" htmlFor="exercise-paste-url">
                Image or GIF URL
              </label>
              <input
                ref={pasteUrlInputRef}
                id="exercise-paste-url"
                type="url"
                inputMode="url"
                value={draftUrl}
                onChange={e => setDraftUrl(e.target.value)}
                placeholder="https://api.smartworkout.app/asset/image/…"
                className={cn(inputClass, draftUrl ? "pr-12" : undefined)}
              />
              {draftUrl ? (
                <InputClearButton
                  onClear={() => setDraftUrl("")}
                  isDarkMode={isDarkMode}
                  label="Clear URL"
                />
              ) : null}
            </div>

            {isPersistableMediaUrl(draftUrl) ? (
              <div
                className={cn(
                  "relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-card",
                  isDarkMode ? "bg-iron-800" : "bg-slate-100",
                )}
              >
                <ExerciseMediaImage
                  src={draftUrl.trim()}
                  alt="Preview"
                  fill
                  className="object-contain"
                  sizes="320px"
                />
              </div>
            ) : null}
          </div>
        </ModalContent>
      </MediaSheet>
    </>
  );
}
