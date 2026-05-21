"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = (userId) => `logbook_onboarding_done_${userId}`;

const suggestedHabits = [
  { id: "water", label: "Water", emoji: "💧" },
  { id: "sleep", label: "Sleep", emoji: "😴" },
  { id: "exercise", label: "Exercise", emoji: "🏋️" },
];

export default function OnboardingFlow({ userId, isDarkMode, onComplete }) {
  const [step, setStep] = useState(0);
  const [habits, setHabits] = useState({ water: true, sleep: true, exercise: true });
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    const done = localStorage.getItem(STORAGE_KEY(userId)) === "true";
    setShouldRender(!done);
  }, [userId]);

  const handleComplete = () => {
    if (userId) localStorage.setItem(STORAGE_KEY(userId), "true");
    onComplete?.();
  };

  const toggleHabit = (id) => setHabits((p) => ({ ...p, [id]: !p[id] }));

  const accentBtn = isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white";
  const bgOverlay = isDarkMode ? "bg-iron-950/95" : "bg-white/95";
  const textPrimary = isDarkMode ? "text-iron-100" : "text-slate-800";
  const textSecondary = isDarkMode ? "text-iron-400" : "text-slate-500";
  const dotActive = isDarkMode ? "bg-lift-primary" : "bg-workout-primary";
  const dotInactive = isDarkMode ? "bg-iron-600" : "bg-slate-300";

  if (!shouldRender) return null;

  const slideVariants = {
    enter: (d) => ({ x: d > 0 ? 100 : -100, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d) => ({ x: d > 0 ? -100 : 100, opacity: 0 }),
  };

  return (
    <div
      className={`fixed inset-0 z-[100] ${bgOverlay} backdrop-blur-md flex flex-col items-center justify-center`}
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Step indicators */}
      <div className="flex gap-2 mb-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${step === i ? dotActive : dotInactive}`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 w-full max-w-md">
        <AnimatePresence mode="wait" custom={step}>
          {step === 0 && (
            <motion.div
              key="step0"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center"
            >
              <span className="text-6xl mb-4">📒</span>
              <h1 className={`text-2xl font-bold ${textPrimary} mb-2`}>Welcome to Logbook!</h1>
              <p className={`${textSecondary} mb-8`}>
                Track workouts, habits, and progress — all in one place.
              </p>
              <button
                onClick={() => setStep(1)}
                className={`${accentBtn} py-3 px-8 rounded-card font-bold text-lg active:scale-95 transition-transform`}
              >
                Get Started
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center w-full"
            >
              <span className="text-6xl mb-4">✅</span>
              <h1 className={`text-2xl font-bold ${textPrimary} mb-2`}>Track Your Habits</h1>
              <p className={`${textSecondary} text-center mb-6`}>
                Add habits to track daily. Here are some suggestions:
              </p>
              <div className="flex flex-col gap-3 w-full mb-8">
                {suggestedHabits.map(({ id, label, emoji }) => (
                  <button
                    key={id}
                    onClick={() => toggleHabit(id)}
                    className={`flex items-center justify-between py-3 px-4 rounded-card border-2 transition-all ${
                      habits[id]
                        ? isDarkMode
                          ? "border-lift-primary bg-lift-primary/10"
                          : "border-workout-primary bg-workout-primary/10"
                        : isDarkMode
                          ? "border-iron-700 bg-iron-800/50"
                          : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <span className={textPrimary}>
                      {emoji} {label}
                    </span>
                    <span
                      className={`w-12 h-7 rounded-full flex items-center transition-colors ${
                        habits[id] ? (isDarkMode ? "bg-lift-primary" : "bg-workout-primary") : (isDarkMode ? "bg-iron-700" : "bg-slate-300")
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full bg-white shadow m-0.5 transform transition-transform ${
                          habits[id] ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className={`${accentBtn} py-3 px-8 rounded-card font-bold text-lg active:scale-95 transition-transform`}
              >
                Next
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center"
            >
              <span className="text-6xl mb-4">💪</span>
              <h1 className={`text-2xl font-bold ${textPrimary} mb-2`}>Start Training</h1>
              <p className={`${textSecondary} mb-8`}>
                Create routines and log workouts. You&apos;re all set to crush your goals!
              </p>
              <button
                onClick={handleComplete}
                className={`${accentBtn} py-3 px-8 rounded-card font-bold text-lg active:scale-95 transition-transform`}
              >
                Let&apos;s Go
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
