import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import GoogleGIcon from "@/components/icons/GoogleGIcon";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { exerciseImageUnoptimized, googleImagesSearchUrl } from "@/lib/exerciseMedia";
import {
  buildExerciseMediaOverridesPatch,
  getExerciseMediaOverrideUrl,
  isValidMediaUrl,
} from "@/lib/exerciseMediaOverrides";
import { useExerciseGifSearch } from "@/hooks/useExerciseGifSearch";
import { cn } from "@/lib/utils";
import { ImagePlus, Link2, Loader2, Search, Trash2, X } from "lucide-react";
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
 * Exercise library GIF search drawer + Google Images shortcut for exercise preview.
 */
export default function ExerciseDrawerMediaActions({
  exercise,
  exerciseName,
  allExercises = [],
  isDarkMode,
  mediaOverrides,
  updateSettings,
  compact = false,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pasteUrlOpen, setPasteUrlOpen] = useState(false);
  const [draftUrl, setDraftUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const pasteUrlInputRef = useRef(null);

  const name = exerciseName || exercise?.name || "";
  const googleHref = googleImagesSearchUrl(name);
  const currentOverride = getExerciseMediaOverrideUrl(exercise, mediaOverrides);

  const librarySearch = useExerciseGifSearch(name, {
    enabled: pickerOpen,
    localExercises: allExercises,
  });

  const { results, loading, searched, query: searchQuery, setQuery } = librarySearch;

  useEffect(() => {
    if (pasteUrlOpen) {
      pasteUrlInputRef.current?.focus();
    }
  }, [pasteUrlOpen]);

  const closeAllDrawers = () => {
    setPickerOpen(false);
    setPasteUrlOpen(false);
  };

  const openPicker = () => {
    setDraftUrl(currentOverride || "");
    setPasteUrlOpen(false);
    librarySearch.reset(name);
    setPickerOpen(true);
  };

  const openPasteUrlDrawer = () => {
    setDraftUrl(currentOverride || "");
    setPasteUrlOpen(true);
  };

  const persistOverride = async url => {
    if (!exercise || !updateSettings) return;
    const patch = buildExerciseMediaOverridesPatch(mediaOverrides, exercise, url);
    if (!patch) return;
    setSaving(true);
    try {
      await updateSettings({ exercise_media_overrides: patch });
      toast.success(url ? "Thumbnail updated" : "Using catalog image");
      closeAllDrawers();
    } catch (err) {
      const code = err?.code ?? "";
      const message = String(err?.message ?? "");
      const migrationHint =
        message.includes("exercise_media_overrides") || code === "PGRST204";
      if (migrationHint) {
        toast.error("Saved on this device only — run migration-v15 on Supabase to sync");
      } else if (patch && Object.keys(patch).length) {
        toast.message("Saved on this device — cloud sync failed, will retry on next load");
      } else {
        toast.error("Could not save image");
      }
    } finally {
      setSaving(false);
    }
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
    if (!isValidMediaUrl(trimmed)) {
      toast.error("Enter a valid http(s) image or GIF URL");
      return;
    }
    await persistOverride(trimmed);
  };

  const chipClass = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-pill font-semibold transition-colors",
    compact ? "min-h-[36px] px-3 text-xs" : "min-h-[40px] px-3.5 text-sm",
    isDarkMode
      ? "border border-iron-700 bg-iron-800/90 text-iron-100 hover:bg-iron-700"
      : "border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50",
  );

  const googleLinkClass = cn(
    "inline-flex items-center gap-1.5 rounded-pill border px-3 py-2 text-xs font-semibold",
    isDarkMode
      ? "border-iron-600 bg-iron-800 text-iron-100 hover:bg-iron-700"
      : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
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

  const emptyHint = searched ? (
    <div className="space-y-3 py-6 text-center">
      <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
        No GIFs found for &ldquo;{searchQuery.trim()}&rdquo;. Try a shorter or simpler name.
      </p>
      {googleHref ? (
        <a
          href={googleHref}
          target="_blank"
          rel="noopener noreferrer"
          className={googleLinkClass}
        >
          <GoogleGIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Search Google Images
        </a>
      ) : null}
    </div>
  ) : (
    <p className={`py-8 text-center text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
      Type at least 2 characters to search.
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
          Searching GIFs…
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
      <div className={cn("flex flex-wrap items-center gap-2", compact ? "mt-1" : "mt-2")}>
        {googleHref ? (
          <a
            href={googleHref}
            target="_blank"
            rel="noopener noreferrer"
            className={chipClass}
            aria-label={name ? `Search Google Images for ${name}` : "Search Google Images"}
            title="Search Google Images"
          >
            <GoogleGIcon className="h-4 w-4 shrink-0" />
            <span>Google</span>
          </a>
        ) : null}
        <button type="button" onClick={openPicker} className={chipClass}>
          <ImagePlus className="h-4 w-4 shrink-0" aria-hidden />
          {currentOverride ? "Change image" : "Add image / GIF"}
        </button>
      </div>

      <Drawer
        open={pickerOpen}
        onOpenChange={open => {
          setPickerOpen(open);
          if (!open) setPasteUrlOpen(false);
        }}
      >
        <DrawerContent
          overlayClassName="z-[60]"
          className={cn(
            "z-[60] flex h-[min(88dvh,640px)] max-h-[88dvh] flex-col overflow-hidden",
            drawerSurface,
          )}
        >
          <DrawerHeader className="shrink-0 space-y-1.5 pb-0 pt-2 text-left">
            <DrawerTitle className={isDarkMode ? "text-iron-50" : "text-slate-900"}>
              Find a GIF
            </DrawerTitle>
            <DrawerDescription className={isDarkMode ? "text-iron-400" : "text-slate-600"}>
              Search the exercise library, then tap a GIF to set your thumbnail.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 px-4 pb-3 pt-4">
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
                  placeholder="Search exercise name…"
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-3 touch-pan-y">
              {resultsPanel}
            </div>

            <div className="shrink-0 border-t border-surface-subtle px-4 py-3">
              <button
                type="button"
                onClick={openPasteUrlDrawer}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-1.5 rounded-card border py-3 text-sm font-semibold",
                  isDarkMode
                    ? "border-iron-700 bg-iron-800/80 text-iron-200 hover:bg-iron-800"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                )}
              >
                <Link2 className="h-4 w-4 shrink-0" aria-hidden />
                Paste custom URL instead
              </button>
            </div>
          </div>

          <DrawerFooter className="shrink-0 flex-row gap-2 border-t border-surface-subtle px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            {currentOverride ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void persistOverride("")}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-card py-3 text-sm font-medium disabled:opacity-50",
                  isDarkMode ? "bg-iron-800 text-red-400" : "bg-slate-100 text-red-600",
                )}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Reset
              </button>
            ) : null}
            <button
              type="button"
              disabled={saving}
              onClick={() => setPickerOpen(false)}
              className={cn(
                "flex-1 rounded-card py-3 text-sm font-medium",
                isDarkMode ? "bg-iron-800 text-iron-300" : "bg-slate-100 text-slate-600",
              )}
            >
              Done
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer open={pasteUrlOpen} onOpenChange={setPasteUrlOpen}>
        <DrawerContent
          overlayClassName="z-[70]"
          className={cn("z-[70] flex max-h-[min(72dvh,520px)] flex-col overflow-hidden", drawerSurface)}
        >
          <DrawerHeader className="shrink-0 space-y-1.5 pb-0 pt-2 text-left">
            <DrawerTitle className={isDarkMode ? "text-iron-50" : "text-slate-900"}>
              Paste image URL
            </DrawerTitle>
            <DrawerDescription className={isDarkMode ? "text-iron-400" : "text-slate-600"}>
              Paste a direct link to a .gif or image file to use as your thumbnail.
            </DrawerDescription>
          </DrawerHeader>

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
                placeholder="https://…/photo.jpg or .gif"
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

            {isValidMediaUrl(draftUrl) ? (
              <div
                className={cn(
                  "relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-card",
                  isDarkMode ? "bg-iron-800" : "bg-slate-100",
                )}
              >
                <Image
                  src={draftUrl.trim()}
                  alt="Preview"
                  fill
                  className="object-contain"
                  sizes="320px"
                  unoptimized={exerciseImageUnoptimized(draftUrl.trim())}
                />
              </div>
            ) : null}
          </div>

          <DrawerFooter className="shrink-0 flex-row gap-2 border-t border-surface-subtle px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => setPasteUrlOpen(false)}
              className={cn(
                "flex-1 rounded-card py-3 text-sm font-medium",
                isDarkMode ? "bg-iron-800 text-iron-300" : "bg-slate-100 text-slate-600",
              )}
            >
              Back
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSavePaste()}
              className={cn(
                "flex-1 rounded-card py-3 text-sm font-bold disabled:opacity-50",
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white",
              )}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
