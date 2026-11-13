import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import {
  sheetHeaderWithTopActionsClass,
  sheetTopActionButtonClass,
  sheetTopActionDestructiveClass,
} from "@/components/ui/sheetTopActions";
import {
  normalizeTags,
  resolveLogTags,
  resolveBikeLogFields,
  collectKnownBikeTags,
} from "@/lib/bikeLogUtils";
import { cn } from "@/lib/utils";
import { getLocalDateStr } from "@/context/utils/getLocalDateStr";
import { Check, Plus, Trash2 } from "lucide-react";
import BikePendingList from "@/components/bike/BikePendingList";

const fieldClass = isDarkMode =>
  cn(
    "w-full rounded-card px-3 py-2.5 text-sm outline-none focus:ring-2",
    isDarkMode
      ? "bg-iron-800 text-iron-100 placeholder:text-iron-600 focus:ring-lift-primary/40"
      : "bg-slate-50 text-slate-800 border border-slate-200 placeholder:text-slate-400 focus:ring-amber-500/40",
  );

function tagToggleClass(isDarkMode, isOn) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
    isOn
      ? isDarkMode
        ? "bg-lift-primary text-iron-950"
        : "bg-amber-400 text-amber-950"
      : isDarkMode
        ? "bg-iron-800 text-iron-100 hover:bg-iron-700 active:bg-iron-700"
        : "bg-slate-200 text-slate-800 hover:bg-slate-300 active:bg-slate-300",
  );
}

export default function BikeLogEntrySheet({
  open,
  onOpenChange,
  isDarkMode,
  mode = "edit",
  tracker,
  initialLog = null,
  allLogs = [],
  onSave,
  onDelete,
  saving = false,
  pendingItems = [],
  onAddPending,
  onRemovePending,
  onLinkPending,
}) {
  const [date, setDate] = useState(getLocalDateStr());
  const [entryTitle, setEntryTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [cost, setCost] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTag, setCustomTag] = useState("");
  const notesRef = useRef(null);

  const syncNotesHeight = useCallback(() => {
    const el = notesRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(88, el.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      setDate(getLocalDateStr());
      const draftTitle = initialLog?.title?.trim() || "";
      const draftNotes =
        initialLog?.notes?.trim() ||
        (typeof initialLog?.body === "string" ? initialLog.body.trim() : "") ||
        "";
      setEntryTitle(draftTitle);
      setNotes(draftNotes);
      setCost("");
      setOdometerKm("");
      setSelectedTags(normalizeTags(initialLog?.tags || []));
    } else if (initialLog) {
      const fields = resolveBikeLogFields(initialLog);
      setDate(String(initialLog.date || "").slice(0, 10) || getLocalDateStr());
      setEntryTitle(fields.title || "");
      setNotes(fields.body || "");
      setCost(initialLog.cost != null && initialLog.cost !== "" ? String(initialLog.cost) : "");
      setOdometerKm(
        fields.odometer_km != null && fields.odometer_km !== ""
          ? String(fields.odometer_km)
          : "",
      );
      setSelectedTags(resolveLogTags(initialLog));
    }
    setCustomTag("");
  }, [open, mode, initialLog]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => syncNotesHeight());
    return () => cancelAnimationFrame(id);
  }, [open, notes, syncNotesHeight]);

  const knownTags = useMemo(
    () => collectKnownBikeTags(allLogs, selectedTags),
    [allLogs, selectedTags],
  );

  const selectedSet = useMemo(() => new Set(normalizeTags(selectedTags)), [selectedTags]);

  const toggleTag = tag => {
    const key = normalizeTags([tag])[0];
    if (!key) return;
    setSelectedTags(prev => {
      const set = new Set(normalizeTags(prev));
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return [...set];
    });
  };

  const addCustomTag = () => {
    const parts = normalizeTags(customTag.split(/[\s,]+/));
    if (parts.length === 0) return;
    setSelectedTags(prev => [...new Set([...prev, ...parts])]);
    setCustomTag("");
  };

  const applyPendingToForm = item => {
    if (!item) return;
    setEntryTitle(item.title || "");
    setNotes(item.notes || "");
    onLinkPending?.(item.id);
  };

  const handleSubmit = async () => {
    const tags = normalizeTags(selectedTags);
    const kmRaw = odometerKm.trim();
    const payload = {
      date,
      title: entryTitle.trim() || null,
      notes: notes.trim() || null,
      cost: cost.trim() ? parseFloat(cost) : null,
      odometer_km: kmRaw ? Math.round(Number(kmRaw)) : null,
      tags,
    };
    await onSave(payload);
  };

  const sheetTitle =
    mode === "create"
      ? `New entry · ${tracker?.icon || ""} ${tracker?.name || "Bike"}`.trim()
      : "Edit entry";

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        className={cn("flex min-h-0 flex-col overflow-hidden")}
      >
        <ModalFooter className="flex-wrap gap-1.5">
          {mode === "edit" && onDelete ? (
            <button
              type="button"
              disabled={saving}
              onClick={onDelete}
              className={sheetTopActionDestructiveClass(isDarkMode)}
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
              Delete
            </button>
          ) : null}
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className={cn(
              sheetTopActionButtonClass(isDarkMode, { primary: true }),
              "gap-1",
            )}
          >
            <Check className="w-3.5 h-3.5 shrink-0" aria-hidden />
            {saving ? "Saving…" : mode === "create" ? "Add" : "Save"}
          </button>
        </ModalFooter>
        <ModalHeader className={sheetHeaderWithTopActionsClass}>
          <ModalTitle className={isDarkMode ? "text-iron-50" : ""}>{sheetTitle}</ModalTitle>
        </ModalHeader>
        <ModalBody className="space-y-4">
          {onAddPending && onRemovePending ? (
            <BikePendingList
              items={pendingItems}
              isDarkMode={isDarkMode}
              onAdd={onAddPending}
              onUseItem={mode === "create" ? applyPendingToForm : undefined}
              onRemove={onRemovePending}
              compact
              className={cn(
                "rounded-card border p-3",
                isDarkMode ? "border-amber-500/25 bg-amber-500/5" : "border-amber-200 bg-amber-50/80",
              )}
            />
          ) : null}
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              Date
            </label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={fieldClass(isDarkMode)} />
          </div>
          <div>
            <span className="sr-only">Tags</span>
            <div
              className={cn(
                "rounded-card border p-3 space-y-2.5",
                isDarkMode ? "border-iron-800/90 bg-iron-900/40" : "border-slate-200 bg-slate-50/90",
              )}
            >
            {knownTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {knownTags.map(tag => {
                  const isOn = selectedSet.has(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={isOn}
                      onClick={() => toggleTag(tag)}
                      className={tagToggleClass(isDarkMode, isOn)}
                    >
                      {isOn ? (
                        <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
                      ) : (
                        <Plus className="w-3.5 h-3.5 shrink-0 opacity-90" aria-hidden />
                      )}
                      {tag}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div
              className={cn(
                "flex gap-2",
                knownTags.length > 0 &&
                  (isDarkMode ? "border-t border-iron-800/80 pt-2.5" : "border-t border-slate-200 pt-2.5"),
              )}
            >
              <input
                type="text"
                value={customTag}
                onChange={e => setCustomTag(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
                placeholder="New tag"
                className={cn(fieldClass(isDarkMode), "flex-1 min-w-0")}
              />
              <button
                type="button"
                onClick={addCustomTag}
                disabled={!customTag.trim()}
                className={cn(
                  "shrink-0 min-h-[42px] rounded-card px-4 text-sm font-semibold disabled:opacity-40",
                  isDarkMode
                    ? "bg-lift-primary text-iron-950 active:bg-lift-primary/90"
                    : "bg-amber-500 text-white active:bg-amber-600",
                )}
              >
                Add
              </button>
            </div>
            </div>
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              Title
            </label>
            <input
              type="text"
              value={entryTitle}
              onChange={e => setEntryTitle(e.target.value)}
              placeholder="e.g. Service, Wash, Puncher"
              className={fieldClass(isDarkMode)}
            />
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
              Notes
            </label>
            <textarea
              ref={notesRef}
              value={notes}
              onChange={e => {
                setNotes(e.target.value);
                const el = e.target;
                el.style.height = "auto";
                el.style.height = `${Math.max(88, el.scrollHeight)}px`;
              }}
              rows={1}
              placeholder="Details, parts, shop name…"
              className={cn(
                fieldClass(isDarkMode),
                "resize-none min-h-[5.5rem] max-h-[min(50vh,28rem)] overflow-y-auto leading-relaxed",
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                Cost (optional)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={e => setCost(e.target.value)}
                placeholder="₹"
                className={fieldClass(isDarkMode)}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                Odometer (km)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={odometerKm}
                onChange={e => setOdometerKm(e.target.value)}
                placeholder="km"
                className={fieldClass(isDarkMode)}
              />
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export async function persistLogTags(logId, tags, updateEventLog) {
  const normalized = normalizeTags(tags);
  await updateEventLog(logId, { tags: normalized });
  return normalized;
}
