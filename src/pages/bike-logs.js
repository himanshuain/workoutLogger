import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import { PageContainer } from "@/components/layout/PageContainer";
import EmptyState from "@/components/EmptyState";
import BikeLogFilterPills from "@/components/bike/BikeLogFilterPills";
import BikeLogEntrySheet, { persistLogTags } from "@/components/bike/BikeLogEntrySheet";
import BikeLogsTimelineList from "@/components/bike/BikeLogsTimelineList";
import BikePendingSection from "@/components/bike/BikePendingSection";
import { useBikePending } from "@/context/hooks/useBikePending";
import { migrateLocalBikeLogTagsToDb } from "@/lib/bikeLogTagMigration";
import {
  BIKE_EVENT_SCOPE,
  filterBikeEventTypes,
  isBikeEventTypeByName,
  markEventTypeAsBike,
} from "@/lib/bikeEventScope";
import {
  BIKE_SCOPE_FILTER_ALL,
  BIKE_SCOPE_FILTER_UNTAGGED,
  BIKE_SCOPE_FILTER_PENDING,
  collectTagFilters,
  filterBikeLogsByPill,
  flattenBikeLogs,
  getUntaggedBikeLogs,
  normalizeTags,
} from "@/lib/bikeLogUtils";
import { mergeEventTypesWithLifelogSettings } from "@/lib/lifelogEventSettings";
import {
  actionPrimary,
  alertDialogCancel,
  alertDialogDestructive,
} from "@/lib/actionButtonStyles";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function BikeLogsPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const {
    user,
    eventTypes: rawEventTypes,
    createEventType,
    updateEventType,
    deleteEventType,
    updateEventLog,
    deleteEventLog,
    logEvent,
    loadEventTypes,
  } = useWorkout();

  const { pendingItems, addPendingItem, removePendingItem } = useBikePending(user);

  const eventTypes = useMemo(
    () => mergeEventTypesWithLifelogSettings(rawEventTypes),
    [rawEventTypes],
  );

  const bikeEventTypes = useMemo(() => filterBikeEventTypes(eventTypes), [eventTypes]);
  const allBikeLogs = useMemo(() => flattenBikeLogs(eventTypes), [eventTypes]);
  const showTrackerNameInList = bikeEventTypes.length > 1;

  const tagFilters = useMemo(() => collectTagFilters(allBikeLogs), [allBikeLogs]);
  const filterPills = useMemo(() => {
    const pills = [BIKE_SCOPE_FILTER_ALL];
    const untaggedCount = getUntaggedBikeLogs(allBikeLogs).length;
    if (pendingItems.length > 0 || untaggedCount > 0) {
      pills.push(BIKE_SCOPE_FILTER_PENDING);
    }
    if (tagFilters.length > 0) pills.push(BIKE_SCOPE_FILTER_UNTAGGED, ...tagFilters);
    return pills;
  }, [tagFilters, allBikeLogs, pendingItems.length]);

  const [filterPill, setFilterPill] = useState(BIKE_SCOPE_FILTER_ALL);
  const [entrySheet, setEntrySheet] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showAddTracker, setShowAddTracker] = useState(false);
  const [newTrackerName, setNewTrackerName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const defaultTrackerId = bikeEventTypes[0]?.id;

  useEffect(() => {
    void loadEventTypes?.();
  }, [loadEventTypes]);

  useEffect(() => {
    if (!user?.id || !updateEventLog) return;
    let cancelled = false;
    void (async () => {
      await migrateLocalBikeLogTagsToDb(updateEventLog);
      if (!cancelled) await loadEventTypes?.();
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, updateEventLog, loadEventTypes]);

  useEffect(() => {
    if (!updateEventType || eventTypes.length === 0) return;
    const needsScope = eventTypes.filter(
      et => isBikeEventTypeByName(et) && et.scope !== BIKE_EVENT_SCOPE,
    );
    if (needsScope.length === 0) return;
    void Promise.all(needsScope.map(et => markEventTypeAsBike(et.id, updateEventType))).then(() =>
      loadEventTypes?.(),
    );
  }, [eventTypes, updateEventType, loadEventTypes]);

  const filteredLogs = useMemo(
  () => filterBikeLogsByPill(allBikeLogs, filterPill),
    [allBikeLogs, filterPill],
  );

  const showPendingFilterView = filterPill === BIKE_SCOPE_FILTER_PENDING;

  const openCreateEntry = useCallback(
    (draft = null, pendingId = null) => {
      if (!defaultTrackerId) return;
      const tracker = bikeEventTypes.find(t => t.id === defaultTrackerId);
      setEntrySheet({
        mode: "create",
        row: draft,
        tracker,
        pendingId: pendingId || null,
      });
    },
    [bikeEventTypes, defaultTrackerId],
  );

  const handleAddPending = async ({ title, notes }) => {
    if (!user) {
      toast.error("Sign in to save pending items");
      return;
    }
    const created = await addPendingItem({ title, notes });
    if (created) toast.success("Added to pending");
    else toast.error("Could not add — run migration v27 in Supabase");
  };

  const handleMarkPendingDone = item => {
    openCreateEntry({ title: item.title, notes: item.notes || "" }, item.id);
  };

  const handleRemovePending = async id => {
    const ok = await removePendingItem(id);
    if (!ok) toast.error("Could not remove");
  };

  useEffect(() => {
    if (router.query.new !== "1" || bikeEventTypes.length === 0) return;
    openCreateEntry();
    const { new: _omit, ...rest } = router.query;
    void router.replace({ pathname: "/bike-logs", query: rest }, undefined, { shallow: true });
  }, [router, router.query.new, bikeEventTypes.length, openCreateEntry]);

  const openEditEntry = row => {
    const tracker = bikeEventTypes.find(t => t.id === row.eventTypeId);
    setEntrySheet({
      mode: "edit",
      row: {
        id: row.id,
        eventTypeId: row.eventTypeId,
        date: row.date,
        title: row.title,
        notes: row.notes,
        cost: row.cost,
        odometer_km: row.odometer_km,
        tags: row.tags,
      },
      tracker,
    });
  };

  const handleSaveEntry = async payload => {
    if (!entrySheet) return;
    const sheet = entrySheet;
    const pendingId = sheet.pendingId;
    setSaving(true);
    setEntrySheet(null);
    try {
      const tags = normalizeTags(payload.tags);
      if (sheet.mode === "create") {
        const trackerId = sheet.tracker?.id || defaultTrackerId;
        const created = await logEvent(trackerId, {
          date: payload.date,
          title: payload.title,
          notes: payload.notes,
          cost: payload.cost,
          odometer_km: payload.odometer_km,
          tags,
        });
        if (!created) {
          toast.error("Could not save");
          return;
        }
        if (tags.length && !created.tags?.length) {
          await persistLogTags(created.id, tags, updateEventLog);
        }
        if (pendingId) {
          await removePendingItem(pendingId);
        }
        toast.success("Entry added");
      } else if (sheet.row) {
        const result = await updateEventLog(sheet.row.id, {
          date: payload.date,
          title: payload.title,
          notes: payload.notes,
          cost: payload.cost,
          odometer_km: payload.odometer_km,
          tags,
        });
        if (!result) {
          toast.error("Could not save — check Supabase migrations (v25–v26)");
          return;
        }
        toast.success("Entry updated");
      }
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  };

  const requestDeleteEntry = () => {
    if (!entrySheet?.row) return;
    const { id: logId, eventTypeId } = entrySheet.row;
    setEntrySheet(null);
    setDeleteConfirm({
      type: "log",
      logId,
      eventTypeId,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === "log") {
        const ok = await deleteEventLog(deleteConfirm.logId, deleteConfirm.eventTypeId);
        if (!ok) {
          toast.error("Could not delete entry");
          return;
        }
        toast.success("Entry deleted");
        setEntrySheet(null);
      } else if (deleteConfirm.type === "tracker") {
        await deleteEventType(deleteConfirm.trackerId);
        toast.success("Tracker deleted");
      }
    } catch {
      toast.error("Could not delete");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleCreateTracker = async () => {
    const name = newTrackerName.trim();
    if (!name) return;
    let created = await createEventType({
      name,
      icon: "🏍️",
      color: "#f97316",
      scope: BIKE_EVENT_SCOPE,
    });
    if (!created) {
      created = await createEventType({ name, icon: "🏍️", color: "#f97316" });
    }
    if (created?.id) {
      await markEventTypeAsBike(created.id, updateEventType);
      toast.success(`Added ${name}`);
      setNewTrackerName("");
      setShowAddTracker(false);
      await loadEventTypes?.();
    } else {
      toast.error("Could not create tracker — try again");
    }
  };

  return (
    <Layout>
      <PageContainer className="page-enter py-3 pb-28 lg:max-w-2xl">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className={`text-lg font-bold ${isDarkMode ? "text-iron-50" : "text-slate-900"}`}>Bike logs</h1>
          {bikeEventTypes.length > 0 ? (
            <button
              type="button"
              onClick={() => openCreateEntry()}
              className={cn(
                "inline-flex items-center gap-1 rounded-card px-3 py-1.5 text-xs font-semibold",
                actionPrimary(isDarkMode),
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              New entry
            </button>
          ) : null}
        </header>

        {bikeEventTypes.length === 0 ? (
          <EmptyState
            isDarkMode={isDarkMode}
            message="No bike tracker yet"
            hint='Name an event "Bike Logs" in Life Log, or create a tracker here — it will appear automatically.'
            actionLabel="Create tracker"
            onAction={() => setShowAddTracker(true)}
          />
        ) : (
          <section className="min-w-0">
            {!showPendingFilterView ? (
              <BikePendingSection
                items={pendingItems}
                isDarkMode={isDarkMode}
                onAdd={handleAddPending}
                onMarkDone={handleMarkPendingDone}
                onRemove={handleRemovePending}
              />
            ) : null}
            {filterPills.length > 1 ? (
              <BikeLogFilterPills
                pills={filterPills}
                selected={filterPill}
                onSelect={setFilterPill}
                isDarkMode={isDarkMode}
                className="mb-3"
              />
            ) : null}
            {showPendingFilterView ? (
              <div className="space-y-4">
                <BikePendingSection
                  items={pendingItems}
                  isDarkMode={isDarkMode}
                  onAdd={handleAddPending}
                  onMarkDone={handleMarkPendingDone}
                  onRemove={handleRemovePending}
                />
                {filteredLogs.length > 0 ? (
                  <BikeLogsTimelineList
                    logs={filteredLogs}
                    isDarkMode={isDarkMode}
                    showTrackerName={showTrackerNameInList}
                    onEdit={openEditEntry}
                    onDelete={row =>
                      setDeleteConfirm({
                        type: "log",
                        logId: row.id,
                        eventTypeId: row.eventTypeId,
                      })
                    }
                  />
                ) : null}
                {pendingItems.length === 0 && filteredLogs.length === 0 ? (
                  <p className={`text-sm text-center py-4 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                    Nothing pending — add a task above or log entries without tags.
                  </p>
                ) : null}
              </div>
            ) : filteredLogs.length === 0 ? (
              <p className={`text-sm text-center py-8 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                {filterPill === BIKE_SCOPE_FILTER_ALL ? "No entries yet." : "No entries match this filter."}
              </p>
            ) : (
              <BikeLogsTimelineList
                logs={filteredLogs}
                isDarkMode={isDarkMode}
                showTrackerName={showTrackerNameInList}
                onEdit={openEditEntry}
                onDelete={row =>
                  setDeleteConfirm({
                    type: "log",
                    logId: row.id,
                    eventTypeId: row.eventTypeId,
                  })
                }
              />
            )}
          </section>
        )}

        <BikeLogEntrySheet
          open={Boolean(entrySheet)}
          onOpenChange={open => {
            if (!open) setEntrySheet(null);
          }}
          isDarkMode={isDarkMode}
          mode={entrySheet?.mode || "edit"}
          tracker={entrySheet?.tracker}
          initialLog={entrySheet?.row}
          allLogs={allBikeLogs}
          onSave={handleSaveEntry}
          onDelete={entrySheet?.mode === "edit" ? requestDeleteEntry : undefined}
          saving={saving}
          pendingItems={pendingItems}
          onAddPending={handleAddPending}
          onRemovePending={handleRemovePending}
          onLinkPending={id =>
            setEntrySheet(prev => (prev ? { ...prev, pendingId: id } : prev))
          }
        />

        <AlertDialog open={Boolean(deleteConfirm)} onOpenChange={open => !open && setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className={isDarkMode ? "text-iron-50" : ""}>Delete?</AlertDialogTitle>
              <AlertDialogDescription className={isDarkMode ? "text-iron-400" : ""}>
                This log entry will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-end">
              <AlertDialogCancel className={alertDialogCancel(isDarkMode)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className={alertDialogDestructive(isDarkMode)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Modal open={showAddTracker} onOpenChange={setShowAddTracker}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle className={isDarkMode ? "text-iron-50" : ""}>New tracker</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <input
                value={newTrackerName}
                onChange={e => setNewTrackerName(e.target.value)}
                placeholder="Tracker name"
                className={cn(
                  "w-full rounded-card px-3 py-2.5 text-sm outline-none",
                  isDarkMode ? "bg-iron-800 text-iron-100" : "bg-slate-50 border border-slate-200",
                )}
              />
            </ModalBody>
            <ModalFooter>
              <button
                type="button"
                onClick={handleCreateTracker}
                className={cn("w-full rounded-card py-2.5 text-sm font-semibold", actionPrimary(isDarkMode))}
              >
                Create
              </button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </PageContainer>
    </Layout>
  );
}
