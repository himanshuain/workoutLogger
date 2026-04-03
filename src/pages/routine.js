import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { useWorkout } from "@/context/WorkoutContext";
import { useTheme } from "@/context/ThemeContext";
import DragReorderList from "@/components/DragReorderList";
import { exerciseMediaUrl, exerciseImageUnoptimized } from "@/lib/exerciseMedia";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Copy,
  Save,
  Moon,
} from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";

const PLANNER_DAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 0, label: "Sunday", short: "Sun" },
];

const REST_KEY = (userId) => `wl_routine_rest_${userId}`;

function loadRestMap(userId) {
  if (typeof window === "undefined" || !userId) return {};
  try {
    const raw = localStorage.getItem(REST_KEY(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveRestMap(userId, map) {
  if (typeof window === "undefined" || !userId) return;
  localStorage.setItem(REST_KEY(userId), JSON.stringify(map));
}

export default function RoutinePlannerPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const {
    user,
    exercises,
    routines,
    getRoutineForDay,
    createRoutine,
    updateRoutine,
  } = useWorkout();

  const [selectedDay, setSelectedDay] = useState(1);
  const [title, setTitle] = useState("");
  const [list, setList] = useState([]);
  const [restDay, setRestDay] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [dupSource, setDupSource] = useState(1);

  useEffect(() => {
    if (!router.isReady) return;
    const raw = router.query.day;
    if (raw === undefined || raw === null || raw === "") return;
    const n = Number(Array.isArray(raw) ? raw[0] : raw);
    if (Number.isNaN(n)) return;
    if ([0, 1, 2, 3, 4, 5, 6].includes(n)) setSelectedDay(n);
  }, [router.isReady, router.query.day]);

  const routine = useMemo(() => getRoutineForDay(selectedDay), [getRoutineForDay, selectedDay, routines]);

  useEffect(() => {
    if (!user) return;
    const map = loadRestMap(user.id);
    setRestDay(!!map[selectedDay]);
  }, [user, selectedDay]);

  useEffect(() => {
    const r = getRoutineForDay(selectedDay);
    if (r) {
      setTitle(r.name || "");
      setList(
        (r.routine_exercises || []).map((ex, i) => ({
          key: ex.id || `re-${selectedDay}-${i}-${ex.exercise_name}`,
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          category: ex.category || "other",
          target_sets: ex.target_sets || 3,
        })),
      );
    } else {
      setTitle("");
      setList([]);
    }
  }, [selectedDay, getRoutineForDay, routines]);

  const setRestForDay = (val) => {
    setRestDay(val);
    if (!user) return;
    const map = loadRestMap(user.id);
    if (val) map[selectedDay] = true;
    else delete map[selectedDay];
    saveRestMap(user.id, map);
  };

  const thumb = (name) => {
    const ex = exercises.find((e) => e.name === name);
    return ex ? exerciseMediaUrl(ex) : null;
  };

  const handleSave = async () => {
    if (!user) return;
    if (restDay) {
      const empty = [];
      if (routine) {
        await updateRoutine(routine.id, {
          name: title.trim() || "Rest",
          day_of_week: selectedDay,
          color: routine.color || "#3b82f6",
          exercises: empty,
        });
      } else {
        await createRoutine({
          name: title.trim() || "Rest",
          day_of_week: selectedDay,
          color: "#3b82f6",
          exercises: empty,
        });
      }
      toast.success("Routine saved");
      return;
    }

    if (!title.trim()) {
      toast.error("Add a title for this day");
      return;
    }

    const exercisesPayload = list.map((ex) => ({
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      category: ex.category || "other",
      target_sets: ex.target_sets || 3,
    }));

    if (routine) {
      await updateRoutine(routine.id, {
        name: title.trim(),
        day_of_week: selectedDay,
        color: routine.color || "#3b82f6",
        exercises: exercisesPayload,
      });
    } else {
      await createRoutine({
        name: title.trim(),
        day_of_week: selectedDay,
        color: "#3b82f6",
        exercises: exercisesPayload,
      });
    }
    toast.success("Routine saved");
  };

  const handleClear = () => {
    setList([]);
    setTitle("");
  };

  const handleDuplicate = async () => {
    const src = getRoutineForDay(dupSource);
    if (!src?.routine_exercises?.length) {
      toast.error("No exercises on that day");
      return;
    }
    setList(
      src.routine_exercises.map((ex, i) => ({
        key: `dup-${Date.now()}-${i}`,
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        category: ex.category || "other",
        target_sets: ex.target_sets || 3,
      })),
    );
    if (!title.trim()) setTitle(src.name ? `${src.name} (copy)` : title);
    setDupOpen(false);
    toast.success("Copied exercises — review and save");
  };

  if (!user) {
    return (
      <Layout>
        <div className="px-5 py-12 text-center text-iron-400">Sign in to plan routines.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-5 pt-8 pb-28 max-w-lg mx-auto">
        <h1
          className={`text-2xl font-semibold tracking-tight ${
            isDarkMode ? "text-iron-50" : "text-slate-900"
          }`}
        >
          Routine planner
        </h1>

        <div className="mt-6 flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {PLANNER_DAYS.map((d) => {
            const active = selectedDay === d.value;
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => setSelectedDay(d.value)}
                className={`shrink-0 min-w-[2.75rem] py-2 rounded-xl text-xs font-semibold ${
                  active
                    ? isDarkMode
                      ? "bg-lift-primary text-iron-950"
                      : "bg-workout-primary text-white"
                    : isDarkMode
                      ? "bg-iron-800 text-iron-400"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {d.short}
              </button>
            );
          })}
        </div>

        <div className="mt-6 space-y-2">
          <p className={`text-sm font-medium ${isDarkMode ? "text-iron-400" : "text-slate-500"}`}>
            {PLANNER_DAYS.find((d) => d.value === selectedDay)?.label}
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Routine / focus title"
            className={`w-full text-xl font-semibold tracking-tight rounded-2xl px-4 py-3 outline-none ${
              isDarkMode
                ? "bg-iron-900/80 border border-iron-800 text-iron-50 placeholder:text-iron-600"
                : "bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm"
            }`}
          />
          <p className={`text-sm leading-relaxed ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
            You can perform these in any order while logging.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRestForDay(!restDay)}
          className={`mt-4 flex items-center gap-2 text-sm font-medium ${
            restDay ? (isDarkMode ? "text-lift-primary" : "text-workout-primary") : isDarkMode ? "text-iron-500" : "text-slate-500"
          }`}
        >
          <Moon className="w-4 h-4" />
          {restDay ? "Rest day (on)" : "Mark as rest day"}
        </button>

        {!restDay && (
          <>
            <div className="mt-6">
              <DragReorderList
                items={list}
                onReorder={setList}
                keyExtractor={(item) => item.key}
                isDarkMode={isDarkMode}
                renderItem={(item) => (
                  <div
                    className={`flex items-center gap-3 p-3 rounded-2xl ${
                      isDarkMode ? "bg-iron-900/60 border border-iron-800" : "bg-white border border-slate-200 shadow-sm"
                    }`}
                  >
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-iron-800">
                      {thumb(item.exercise_name) ? (
                        <Image
                          src={thumb(item.exercise_name)}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized={exerciseImageUnoptimized(thumb(item.exercise_name))}
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium truncate ${isDarkMode ? "text-iron-100" : "text-slate-900"}`}>
                        {item.exercise_name}
                      </p>
                      <p className={`text-xs capitalize ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>
                        {item.category}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setList((prev) => prev.filter((x) => x.key !== item.key))}
                      className={`p-2 rounded-xl ${isDarkMode ? "text-iron-500 hover:bg-iron-800" : "text-slate-400 hover:bg-slate-100"}`}
                      aria-label="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              />
            </div>

            <button
              type="button"
              onClick={() => router.push(`/exercises?routineDay=${selectedDay}`)}
              className={`mt-4 w-full py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 ${
                isDarkMode ? "bg-iron-800 text-iron-100" : "bg-slate-100 text-slate-800"
              }`}
            >
              <Plus className="w-5 h-5" />
              Add exercise
            </button>

            <button
              type="button"
              onClick={() => setDupOpen(true)}
              className={`mt-2 w-full py-3.5 rounded-2xl font-medium border flex items-center justify-center gap-2 ${
                isDarkMode ? "border-iron-700 text-iron-300" : "border-slate-200 text-slate-700"
              }`}
            >
              <Copy className="w-4 h-4" />
              Duplicate from another day
            </button>

            <button
              type="button"
              onClick={handleClear}
              className={`mt-2 w-full py-3 text-sm font-medium ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}
            >
              Clear day
            </button>
          </>
        )}

        <button
          type="button"
          onClick={handleSave}
          className={`mt-8 w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 ${
            isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
          }`}
        >
          <Save className="w-5 h-5" />
          Save routine
        </button>
      </div>

      <Modal open={dupOpen} onOpenChange={setDupOpen}>
        <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
          <ModalHeader>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
              Copy from which day?
            </ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div className="flex flex-wrap gap-2">
              {PLANNER_DAYS.filter((d) => d.value !== selectedDay).map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDupSource(d.value)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium ${
                    dupSource === d.value
                      ? isDarkMode
                        ? "bg-lift-primary text-iron-950"
                        : "bg-workout-primary text-white"
                      : isDarkMode
                        ? "bg-iron-800 text-iron-300"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {d.short}
                </button>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              type="button"
              onClick={() => setDupOpen(false)}
              className={isDarkMode ? "text-iron-400" : "text-slate-600"}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDuplicate}
              className={`font-semibold ${isDarkMode ? "text-lift-primary" : "text-workout-primary"}`}
            >
              Duplicate
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Layout>
  );
}
