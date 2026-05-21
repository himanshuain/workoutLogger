import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
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
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import LongPressContextHint from "@/components/LongPressContextHint";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  Plus,
  ChevronDown,
  Trash2,
  Pencil,
  RotateCcw,
  Check,
  GripVertical,
  LayoutGrid,
  List,
  X,
  Play,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/fade-in";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const CARD_ICONS = ["📋", "🏋️", "☀️", "🥤", "🧘", "🎒", "🧳", "🍳", "🛒", "📦", "🧹", "💼", "🎯", "📝", "⚡", "🌙"];
const CARD_COLORS = [
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
];

function SortableStepItem({ item, card, isChecked, isDarkMode, onToggle, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          className={`flex items-center gap-2.5 p-2.5 rounded-card transition-colors ${
            isDragging
              ? isDarkMode ? "bg-iron-800" : "bg-slate-100"
              : isDarkMode ? "active:bg-iron-800/50" : "active:bg-slate-50"
          }`}
        >
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className={`touch-none flex-shrink-0 p-0.5 rounded ${
              isDarkMode ? "text-iron-700 active:text-iron-500" : "text-slate-300 active:text-slate-500"
            }`}
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Tappable row: checkbox + text */}
          <button
            type="button"
            aria-pressed={isChecked}
            aria-label={isChecked ? "Mark step not done" : "Mark step done"}
            onClick={onToggle}
            className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
          >
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                isChecked
                  ? "border-transparent"
                  : isDarkMode ? "border-iron-700" : "border-slate-300"
              }`}
              style={isChecked ? { backgroundColor: card.color } : {}}
              aria-hidden
            >
              {isChecked ? (
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              ) : null}
            </div>
            <span
              className={`text-sm transition-all ${
                isChecked
                  ? `line-through ${isDarkMode ? "text-iron-600" : "text-slate-400"}`
                  : isDarkMode ? "text-iron-200" : "text-slate-700"
              }`}
            >
              {item.text}
            </span>
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
        <ContextMenuItem
          onClick={onEdit}
          className={isDarkMode ? "text-iron-200" : "text-slate-700"}
        >
          <Pencil className="w-4 h-4" />
          Edit Step
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem destructive onClick={onDelete}>
          <Trash2 className="w-4 h-4" />
          Delete Step
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default function Steps() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const {
    user,
    stepCards,
    createStepCard,
    updateStepCard,
    deleteStepCard,
    createStepItem,
    batchCreateStepItems,
    updateStepItem,
    deleteStepItem,
    reorderStepItems,
  } = useWorkout();

  const [viewMode, setViewMode] = useState("list");
  const [zoomedCard, setZoomedCard] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem("steps-view-mode");
    if (saved === "card" || saved === "list") setViewMode(saved);
  }, []);

  const toggleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem("steps-view-mode", mode);
  };
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [cardForm, setCardForm] = useState({ name: "", icon: "📋", color: "#3b82f6" });
  const [cardFormSteps, setCardFormSteps] = useState([]);
  const [cardFormStepInput, setCardFormStepInput] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [newStepText, setNewStepText] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [editItemText, setEditItemText] = useState("");
  const [followMode, setFollowMode] = useState(null); // Card ID being followed
  const newStepInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const cardFormStepInputRef = useRef(null);

  const resetCardForm = () => {
    setEditingCardId(null);
    setCardForm({ name: "", icon: "📋", color: "#3b82f6" });
    setCardFormSteps([]);
    setCardFormStepInput("");
  };

  const handleOpenAddCard = () => {
    resetCardForm();
    setShowCardModal(true);
  };

  const handleOpenEditCard = (card) => {
    setEditingCardId(card.id);
    setCardForm({ name: card.name, icon: card.icon, color: card.color });
    setShowCardModal(true);
  };

  const handleAddCardFormStep = () => {
    const text = cardFormStepInput.trim();
    if (!text) return;
    setCardFormSteps(prev => [...prev, text]);
    setCardFormStepInput("");
    setTimeout(() => cardFormStepInputRef.current?.focus(), 50);
  };

  const handleRemoveCardFormStep = (index) => {
    setCardFormSteps(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveCard = async () => {
    if (!cardForm.name.trim()) return;
    try {
      if (editingCardId) {
        await updateStepCard(editingCardId, {
          name: cardForm.name.trim(),
          icon: cardForm.icon,
          color: cardForm.color,
        });
        toast.success("Card updated");
      } else {
        const card = await createStepCard({
          name: cardForm.name.trim(),
          icon: cardForm.icon,
          color: cardForm.color,
        });
        if (card && cardFormSteps.length > 0) {
          await batchCreateStepItems(card.id, cardFormSteps);
        }
        toast.success("Card created");
      }
      setShowCardModal(false);
      resetCardForm();
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleDeleteCard = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteStepCard(deleteConfirm);
      toast.success("Card deleted");
      if (expandedCard === deleteConfirm) setExpandedCard(null);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleAddStep = async (cardId) => {
    if (!newStepText.trim()) return;
    try {
      await createStepItem(cardId, newStepText.trim());
      setNewStepText("");
      newStepInputRef.current?.focus();
    } catch {
      toast.error("Failed to add step");
    }
  };

  const handleUpdateStep = async () => {
    if (!editingItem || !editItemText.trim()) return;
    try {
      await updateStepItem(editingItem.id, editingItem.cardId, { text: editItemText.trim() });
      setEditingItem(null);
      setEditItemText("");
    } catch {
      toast.error("Failed to update step");
    }
  };

  const handleOpenEditStep = (item, cardId) => {
    setEditingItem({ id: item.id, cardId });
    setEditItemText(item.text);
  };

  const handleDeleteStep = async (itemId, cardId) => {
    try {
      await deleteStepItem(itemId, cardId);
    } catch {
      toast.error("Failed to delete step");
    }
  };

  const toggleCheck = (itemId) => {
    setCheckedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const resetChecks = (cardId) => {
    const card = stepCards.find(c => c.id === cardId);
    if (!card) return;
    setCheckedItems(prev => {
      const next = { ...prev };
      for (const item of card.step_items || []) {
        delete next[item.id];
      }
      return next;
    });
  };

  const handleDragEnd = async (event, cardId) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const card = stepCards.find(c => c.id === cardId);
    if (!card) return;
    const items = [...(card.step_items || [])];
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const [moved] = items.splice(oldIndex, 1);
    items.splice(newIndex, 0, moved);
    const reordered = items.map((item, i) => ({ ...item, order_index: i }));
    await reorderStepItems(cardId, reordered);
  };

  const toggleExpand = (cardId) => {
    setExpandedCard(prev => (prev === cardId ? null : cardId));
    setNewStepText("");
  };

  const getCheckedCount = (card) => {
    const items = card.step_items || [];
    return items.filter(item => checkedItems[item.id]).length;
  };


  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <p className={isDarkMode ? "text-iron-500" : "text-slate-500"}>
            Sign in to use Steps
          </p>
          <button
            onClick={() => router.push("/auth")}
            className={`mt-4 px-6 py-2.5 rounded-card font-bold ${
              isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
            }`}
          >
            Sign In
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <FadeIn duration={0.5}>
      <div className="px-4 py-4 pb-16">
        {/* Header */}
        <div
          className={`sticky top-0 z-30 -mx-4 px-4 pb-3 pt-1 backdrop-blur-sm ${
            isDarkMode ? "bg-iron-950/95" : "bg-slate-50/95"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                Steps
              </h2>
              <p className={`text-sm mt-0.5 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                Your reusable checklists
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex rounded-lg p-0.5 ${isDarkMode ? "bg-iron-800" : "bg-slate-100"}`}>
                <button
                  onClick={() => toggleViewMode("list")}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === "list"
                      ? isDarkMode ? "bg-iron-700 text-iron-100" : "bg-white text-slate-800 shadow-sm"
                      : isDarkMode ? "text-iron-500" : "text-slate-400"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleViewMode("card")}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === "card"
                      ? isDarkMode ? "bg-iron-700 text-iron-100" : "bg-white text-slate-800 shadow-sm"
                      : isDarkMode ? "text-iron-500" : "text-slate-400"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleOpenAddCard}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-card font-medium text-sm ${
                  isDarkMode
                    ? "bg-lift-primary text-iron-950"
                    : "bg-workout-primary text-white"
                }`}
              >
                <Plus className="w-4 h-4" />
                Add Card
              </button>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {stepCards.length === 0 ? (
          <div className={`mt-12 text-center ${isDarkMode ? "text-iron-500" : "text-slate-400"}`}>
            <div className="text-4xl mb-3">📋</div>
            <p className="font-medium">No checklists yet</p>
            <p className="text-sm mt-1">
              Create reusable step-by-step cards for routines, recipes & more
            </p>
            <button
              onClick={handleOpenAddCard}
              className={`mt-4 px-4 py-2 rounded-card text-sm font-medium ${
                isDarkMode ? "bg-iron-800 text-iron-300" : "bg-slate-200 text-slate-700"
              }`}
            >
              Create First Card
            </button>
          </div>
        ) : viewMode === "list" ? (
          /* ======================== LIST VIEW ======================== */
          <div className="space-y-3 mt-2">
            <LongPressContextHint isDarkMode={isDarkMode} className="-mt-1 mb-px" />
            {stepCards.map((card) => {
              const isExpanded = expandedCard === card.id;
              const items = card.step_items || [];
              const checked = getCheckedCount(card);
              const allDone = items.length > 0 && checked === items.length;

              return (
                <ContextMenu key={card.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      className={`rounded-card overflow-hidden transition-all duration-200 ${
                        isDarkMode ? "bg-iron-900" : "bg-white shadow-sm"
                      } ${allDone
                        ? isDarkMode
                          ? "ring-1 ring-green-500/40"
                          : "ring-1 ring-green-400/50"
                        : ""
                      }`}
                    >
                      <button
                        onClick={() => toggleExpand(card.id)}
                        className="w-full flex items-center gap-3 p-4 text-left"
                      >
                        <div
                          className="w-10 h-10 rounded-card flex items-center justify-center text-lg flex-shrink-0"
                          style={{ backgroundColor: card.color + "20" }}
                        >
                          {card.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold truncate ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                            {card.name}
                          </h3>
                          <p className={`text-xs mt-0.5 ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                            {items.length === 0 ? "No steps yet" : `${checked}/${items.length} done`}
                          </p>
                        </div>
                        {items.length > 0 && (
                          <div className="relative w-8 h-8 flex-shrink-0">
                            <svg viewBox="0 0 32 32" className="w-8 h-8 -rotate-90">
                              <circle cx="16" cy="16" r="13" fill="none" stroke={isDarkMode ? "#2a2a2e" : "#e2e8f0"} strokeWidth="3" />
                              <circle cx="16" cy="16" r="13" fill="none" stroke={allDone ? "#22c55e" : card.color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(checked / items.length) * 81.68} 81.68`} />
                            </svg>
                          </div>
                        )}
                        {items.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFollowMode(card.id);
                            }}
                            className={`mr-2 p-2 rounded-lg transition-colors ${
                              isDarkMode 
                                ? "text-iron-400 hover:text-iron-200 hover:bg-iron-800" 
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                            }`}
                            title="Follow checklist"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""} ${isDarkMode ? "text-iron-500" : "text-slate-400"}`} />
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className={`px-4 pb-4 border-t ${isDarkMode ? "border-iron-800/50" : "border-slate-100"}`}>
                              {items.length > 0 && checked > 0 && (
                                <button
                                  onClick={() => resetChecks(card.id)}
                                  className={`flex items-center gap-1.5 mt-3 mb-1 text-xs font-medium ${isDarkMode ? "text-iron-500 hover:text-iron-300" : "text-slate-400 hover:text-slate-600"}`}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Reset
                                </button>
                              )}
                              {items.length > 0 ? (
                                <LongPressContextHint isDarkMode={isDarkMode} className="mt-2 mb-1" />
                              ) : null}
                              <div className="mt-2 space-y-0.5">
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => handleDragEnd(event, card.id)}>
                                  <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                    {items.map((item) => (
                                      <SortableStepItem key={item.id} item={item} card={card} isChecked={!!checkedItems[item.id]} isDarkMode={isDarkMode} onToggle={() => toggleCheck(item.id)} onEdit={() => handleOpenEditStep(item, card.id)} onDelete={() => handleDeleteStep(item.id, card.id)} />
                                    ))}
                                  </SortableContext>
                                </DndContext>
                              </div>
                              <div className={`flex items-center gap-2 mt-2 p-2 rounded-card ${isDarkMode ? "bg-iron-800/40" : "bg-slate-50"}`}>
                                <div className={`w-6 h-6 rounded-lg border-2 border-dashed flex items-center justify-center flex-shrink-0 ${isDarkMode ? "border-iron-700" : "border-slate-300"}`}>
                                  <Plus className={`w-3 h-3 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`} />
                                </div>
                                <input ref={newStepInputRef} type="text" value={newStepText} onChange={(e) => setNewStepText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddStep(card.id); }} placeholder="Add a step..." className={`flex-1 text-sm bg-transparent outline-none ${isDarkMode ? "text-iron-100 placeholder-iron-600" : "text-slate-800 placeholder-slate-400"}`} />
                                {newStepText.trim() && (
                                  <button onClick={() => handleAddStep(card.id)} className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: card.color, color: "white" }}>Add</button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
                    <ContextMenuItem onClick={() => handleOpenEditCard(card)} className={isDarkMode ? "text-iron-200" : "text-slate-700"}>
                      <Pencil className="w-4 h-4" />
                      Edit Card
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem destructive onClick={() => setDeleteConfirm(card.id)}>
                      <Trash2 className="w-4 h-4" />
                      Delete Card
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>
        ) : (
          /* ======================== CARD VIEW ======================== */
          <StaggerContainer className="grid grid-cols-2 gap-3 mt-2">
            <LongPressContextHint isDarkMode={isDarkMode} className="col-span-2 -mt-1 mb-0.5" />
            {stepCards.map((card) => {
              const items = card.step_items || [];
              const checked = getCheckedCount(card);
              const allDone = items.length > 0 && checked === items.length;
              const previewItems = items.slice(0, 3);

              return (
                <StaggerItem key={card.id}>
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <motion.button
                        layoutId={`step-card-${card.id}`}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        onClick={() => { setZoomedCard(card.id); setNewStepText(""); }}
                      className={`w-full text-left rounded-card p-4 flex flex-col gap-2.5 transition-all ${
                        isDarkMode ? "bg-iron-900" : "bg-white shadow-sm"
                      } ${allDone ? isDarkMode ? "ring-1 ring-green-500/40" : "ring-1 ring-green-400/50" : ""}`}
                    >
                      <div className="flex items-start justify-between">
                        <div
                          className="w-9 h-9 rounded-card flex items-center justify-center text-lg flex-shrink-0"
                          style={{ backgroundColor: card.color + "20" }}
                        >
                          {card.icon}
                        </div>
                        {items.length > 0 && (
                          <div className="relative w-6 h-6 flex-shrink-0">
                            <svg viewBox="0 0 32 32" className="w-6 h-6 -rotate-90">
                              <circle cx="16" cy="16" r="13" fill="none" stroke={isDarkMode ? "#2a2a2e" : "#e2e8f0"} strokeWidth="3" />
                              <circle cx="16" cy="16" r="13" fill="none" stroke={allDone ? "#22c55e" : card.color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(checked / items.length) * 81.68} 81.68`} />
                            </svg>
                          </div>
                        )}
                      </div>

                      <h3 className={`font-semibold text-sm truncate ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                        {card.name}
                      </h3>

                      {previewItems.length > 0 ? (
                        <div className="space-y-1.5">
                          {previewItems.map((item) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <div
                                className={`w-3.5 h-3.5 rounded flex-shrink-0 border ${
                                  checkedItems[item.id]
                                    ? "border-transparent"
                                    : isDarkMode ? "border-iron-700" : "border-slate-300"
                                }`}
                                style={checkedItems[item.id] ? { backgroundColor: card.color } : {}}
                              >
                                {checkedItems[item.id] && <Check className="w-3.5 h-3.5 text-white p-[1px]" strokeWidth={3} />}
                              </div>
                              <span className={`text-xs truncate ${
                                checkedItems[item.id]
                                  ? `line-through ${isDarkMode ? "text-iron-600" : "text-slate-400"}`
                                  : isDarkMode ? "text-iron-400" : "text-slate-500"
                              }`}>
                                {item.text}
                              </span>
                            </div>
                          ))}
                          {items.length > 3 && (
                            <p className={`text-[10px] ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                              +{items.length - 3} more
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className={`text-xs ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>No steps yet</p>
                      )}
                    </motion.button>
                  </ContextMenuTrigger>
                  <ContextMenuContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
                    <ContextMenuItem onClick={() => handleOpenEditCard(card)} className={isDarkMode ? "text-iron-200" : "text-slate-700"}>
                      <Pencil className="w-4 h-4" />
                      Edit Card
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem destructive onClick={() => setDeleteConfirm(card.id)}>
                      <Trash2 className="w-4 h-4" />
                      Delete Card
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </div>

      {/* ======================== ZOOM OVERLAY ======================== */}
      <AnimatePresence>
        {zoomedCard && (() => {
          const card = stepCards.find(c => c.id === zoomedCard);
          if (!card) return null;
          const items = card.step_items || [];
          const checked = getCheckedCount(card);
          const allDone = items.length > 0 && checked === items.length;

          return (
            <motion.div
              key="zoom-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => setZoomedCard(null)}
            >
              <div className={`absolute inset-0 ${isDarkMode ? "bg-black/70" : "bg-black/40"} backdrop-blur-sm`} />
              <motion.div
                layoutId={`step-card-${card.id}`}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className={`relative w-full max-w-md max-h-[85vh] rounded-card overflow-hidden flex flex-col ${
                  isDarkMode ? "bg-iron-900" : "bg-white"
                } ${allDone ? isDarkMode ? "ring-2 ring-green-500/40" : "ring-2 ring-green-400/50" : ""}`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Zoomed Card Header */}
                <div className="flex items-center gap-3 p-4 flex-shrink-0">
                  <div
                    className="w-11 h-11 rounded-card flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: card.color + "20" }}
                  >
                    {card.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold text-lg ${isDarkMode ? "text-iron-100" : "text-slate-800"}`}>
                      {card.name}
                    </h3>
                    <p className={`text-xs ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                      {items.length === 0 ? "No steps yet" : `${checked}/${items.length} done`}
                    </p>
                  </div>
                  {items.length > 0 && (
                    <div className="relative w-9 h-9 flex-shrink-0">
                      <svg viewBox="0 0 32 32" className="w-9 h-9 -rotate-90">
                        <circle cx="16" cy="16" r="13" fill="none" stroke={isDarkMode ? "#2a2a2e" : "#e2e8f0"} strokeWidth="3" />
                        <circle cx="16" cy="16" r="13" fill="none" stroke={allDone ? "#22c55e" : card.color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(checked / items.length) * 81.68} 81.68`} />
                      </svg>
                    </div>
                  )}
                  <button
                    onClick={() => setZoomedCard(null)}
                    className={`p-1.5 rounded-lg flex-shrink-0 ${isDarkMode ? "text-iron-500 hover:bg-iron-800" : "text-slate-400 hover:bg-slate-100"}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Divider */}
                <div className={`border-t ${isDarkMode ? "border-iron-800/50" : "border-slate-100"}`} />

                {/* Zoomed Step Items — scrollable */}
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {items.length > 0 && checked > 0 && (
                    <button
                      onClick={() => resetChecks(card.id)}
                      className={`flex items-center gap-1.5 mb-2 text-xs font-medium ${isDarkMode ? "text-iron-500 hover:text-iron-300" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  )}
                  {items.length > 0 ? <LongPressContextHint isDarkMode={isDarkMode} className="mb-2" /> : null}
                  <div className="space-y-0.5">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => handleDragEnd(event, card.id)}>
                      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                        {items.map((item) => (
                          <SortableStepItem key={item.id} item={item} card={card} isChecked={!!checkedItems[item.id]} isDarkMode={isDarkMode} onToggle={() => toggleCheck(item.id)} onEdit={() => handleOpenEditStep(item, card.id)} onDelete={() => handleDeleteStep(item.id, card.id)} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>

                {/* Zoomed Add Step Input */}
                <div className={`flex-shrink-0 border-t px-4 py-3 ${isDarkMode ? "border-iron-800/50" : "border-slate-100"}`}>
                  <div className={`flex items-center gap-2 p-2.5 rounded-card ${isDarkMode ? "bg-iron-800/40" : "bg-slate-50"}`}>
                    <div className={`w-6 h-6 rounded-lg border-2 border-dashed flex items-center justify-center flex-shrink-0 ${isDarkMode ? "border-iron-700" : "border-slate-300"}`}>
                      <Plus className={`w-3 h-3 ${isDarkMode ? "text-iron-600" : "text-slate-400"}`} />
                    </div>
                    <input
                      type="text"
                      value={newStepText}
                      onChange={(e) => setNewStepText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddStep(card.id); }}
                      placeholder="Add a step..."
                      className={`flex-1 text-sm bg-transparent outline-none ${isDarkMode ? "text-iron-100 placeholder-iron-600" : "text-slate-800 placeholder-slate-400"}`}
                    />
                    {newStepText.trim() && (
                      <button onClick={() => handleAddStep(card.id)} className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: card.color, color: "white" }}>Add</button>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Follow Mode - Full Screen Checklist */}
      <AnimatePresence>
        {followMode && (() => {
          const card = stepCards.find(c => c.id === followMode);
          if (!card) return null;
          
          const items = card.step_items || [];
          const checked = getCheckedCount(card);
          const allDone = items.length > 0 && checked === items.length;
          const progress = items.length > 0 ? (checked / items.length) * 100 : 0;
          
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex flex-col"
              style={{ 
                background: isDarkMode 
                  ? "linear-gradient(135deg, #0a0a0b 0%, #1c1c1e 100%)"
                  : "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)"
              }}
            >
              {/* Follow Mode Header */}
              <div className={`flex-shrink-0 px-4 py-4 border-b ${
                isDarkMode ? "border-iron-800/50" : "border-slate-200"
              }`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFollowMode(null)}
                    className={`w-10 h-10 rounded-card flex items-center justify-center ${
                      isDarkMode 
                        ? "bg-iron-800 text-iron-300 hover:bg-iron-700" 
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-card flex items-center justify-center text-xl"
                        style={{ backgroundColor: card.color + "20" }}
                      >
                        {card.icon}
                      </div>
                      <div>
                        <h1 className="text-screen-title">{card.name}</h1>
                        <p className="text-metadata">
                          {checked}/{items.length} completed • {Math.round(progress)}%
                        </p>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className={`mt-3 h-2 rounded-full overflow-hidden ${
                      isDarkMode ? "bg-iron-800" : "bg-slate-200"
                    }`}>
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${progress}%`,
                          backgroundColor: allDone ? "#22c55e" : card.color
                        }}
                      />
                    </div>
                  </div>
                  
                  {checked > 0 && (
                    <button
                      onClick={() => resetChecks(card.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        isDarkMode 
                          ? "bg-iron-800 text-iron-300 hover:bg-iron-700" 
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
              
              {/* Follow Mode Steps */}
              <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="max-w-lg mx-auto space-y-4">
                  {items.map((item, index) => {
                    const isChecked = !!checkedItems[item.id];
                    const isNext = !isChecked && items.slice(0, index).every(prevItem => checkedItems[prevItem.id]);
                    
                    return (
                      <motion.button
                        key={item.id}
                        onClick={() => toggleCheck(item.id)}
                        className={`w-full text-left p-4 rounded-card transition-all ${
                          isChecked
                            ? "opacity-60"
                            : isNext
                              ? isDarkMode 
                                ? "bg-iron-800 ring-2 ring-lift-primary/50" 
                                : "bg-white ring-2 ring-workout-primary/50 shadow-lg"
                              : isDarkMode 
                                ? "bg-iron-900/50" 
                                : "bg-white shadow-sm"
                        }`}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isChecked
                              ? "border-green-500 bg-green-500"
                              : isNext
                                ? `border-2`
                                : isDarkMode
                                  ? "border-iron-700"
                                  : "border-slate-300"
                          }`}
                          style={isNext && !isChecked ? { borderColor: card.color } : {}}
                          >
                            {isChecked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                isDarkMode ? "bg-iron-700 text-iron-400" : "bg-slate-100 text-slate-500"
                              }`}>
                                {index + 1}
                              </span>
                              {isNext && (
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  isDarkMode ? "bg-lift-primary/20 text-lift-primary" : "bg-workout-primary/10 text-workout-primary"
                                }`}>
                                  Next
                                </span>
                              )}
                            </div>
                            <p className={`font-medium ${
                              isChecked 
                                ? isDarkMode ? "text-iron-500 line-through" : "text-slate-400 line-through"
                                : isDarkMode ? "text-iron-100" : "text-slate-900"
                            }`}>
                              {item.text}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                  
                  {allDone && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-8"
                    >
                      <div className="text-6xl mb-4">🎉</div>
                      <h3 className="text-xl font-bold text-green-500 mb-2">
                        Checklist Complete!
                      </h3>
                      <p className={`text-sm ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}>
                        Great job completing all {items.length} steps
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
      </FadeIn>

      {/* Add/Edit Card Modal */}
      <Modal
        open={showCardModal}
        onOpenChange={(open) => { setShowCardModal(open); if (!open) resetCardForm(); }}
      >
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              {editingCardId ? "Edit Card" : "New Card"}
            </ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Name
              </label>
              <input
                type="text"
                value={cardForm.name}
                onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                placeholder="e.g., Morning Routine, Shake Recipe"
                className={`input-field ${
                  isDarkMode
                    ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                    : "bg-slate-100 text-slate-800 placeholder-slate-400"
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Icon
              </label>
              <EmojiPicker
                value={cardForm.icon}
                onChange={(icon) => setCardForm({ ...cardForm, icon })}
                presets={CARD_ICONS}
                isDarkMode={isDarkMode}
              />
            </div>
            <div>
              <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                Color
              </label>
              <ColorPicker
                value={cardForm.color}
                onChange={(color) => setCardForm({ ...cardForm, color })}
                presets={CARD_COLORS}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Inline steps builder — only for new cards */}
            {!editingCardId && (
              <div>
                <label className={`block text-sm mb-2 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
                  Steps <span className={isDarkMode ? "text-iron-600" : "text-slate-400"}>(optional)</span>
                </label>

                {cardFormSteps.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {cardFormSteps.map((step, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                          isDarkMode ? "bg-iron-800/60 text-iron-200" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0 ${
                          isDarkMode ? "bg-iron-700 text-iron-400" : "bg-slate-200 text-slate-500"
                        }`}>
                          {i + 1}
                        </span>
                        <span className="flex-1 truncate">{step}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCardFormStep(i)}
                          className={`p-0.5 rounded-md flex-shrink-0 ${
                            isDarkMode ? "text-iron-500 hover:text-red-400" : "text-slate-400 hover:text-red-500"
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    ref={cardFormStepInputRef}
                    type="text"
                    value={cardFormStepInput}
                    onChange={(e) => setCardFormStepInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCardFormStep(); } }}
                    placeholder={cardFormSteps.length === 0 ? "Add a step..." : "Add another step..."}
                    className={`flex-1 input-field text-sm ${
                      isDarkMode
                        ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                        : "bg-slate-100 text-slate-800 placeholder-slate-400"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAddCardFormStep}
                    disabled={!cardFormStepInput.trim()}
                    className={`px-3 rounded-card font-medium text-sm disabled:opacity-30 ${
                      isDarkMode ? "bg-iron-700 text-iron-200" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => { setShowCardModal(false); resetCardForm(); }}
              className={`flex-1 py-3 rounded-card font-medium ${
                isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCard}
              disabled={!cardForm.name.trim()}
              className={`flex-1 py-3 rounded-card font-bold disabled:opacity-50 ${
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
              }`}
            >
              {editingCardId ? "Save Changes" : "Create Card"}
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              Delete Card?
            </AlertDialogTitle>
            <AlertDialogDescription className={isDarkMode ? "text-iron-400" : "text-slate-500"}>
              This will permanently delete this card and all its steps.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className={isDarkMode ? "bg-iron-800 text-iron-400 border-0" : "bg-slate-100 text-slate-600 border-0"}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCard}
              className="bg-red-500 text-white hover:bg-red-600 border-0"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Step Modal */}
      <Modal
        open={!!editingItem}
        onOpenChange={(open) => { if (!open) { setEditingItem(null); setEditItemText(""); } }}
      >
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              Edit Step
            </ModalTitle>
          </ModalHeader>
          <ModalBody>
            <input
              type="text"
              value={editItemText}
              onChange={(e) => setEditItemText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleUpdateStep(); }}
              autoFocus
              className={`input-field ${
                isDarkMode
                  ? "bg-iron-800 text-iron-100 placeholder-iron-600"
                  : "bg-slate-100 text-slate-800 placeholder-slate-400"
              }`}
            />
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => { setEditingItem(null); setEditItemText(""); }}
              className={`flex-1 py-3 rounded-card font-medium ${
                isDarkMode ? "bg-iron-800 text-iron-400" : "bg-slate-100 text-slate-600"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateStep}
              disabled={!editItemText.trim()}
              className={`flex-1 py-3 rounded-card font-bold disabled:opacity-50 ${
                isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
              }`}
            >
              Save
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Layout>
  );
}
