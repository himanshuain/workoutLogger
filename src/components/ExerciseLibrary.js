export const EXERCISE_LIBRARY = {
  "Bench Press": {
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Shoulders", "Arms"],
    description: "Lie on a flat bench, lower the bar to your chest, then press up.",
    tips: ["Keep your feet flat on the floor", "Retract your shoulder blades"],
  },
  "Incline Bench Press": {
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Shoulders", "Arms"],
    description: "Same as bench press but on an inclined bench to target upper chest.",
    tips: ["Set bench to 30–45 degrees", "Keep elbows at 45 degrees from body"],
  },
  "Chest Fly": {
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Shoulders"],
    description: "Hold dumbbells above chest with arms extended, lower in an arc.",
    tips: ["Slight bend in elbows", "Focus on chest stretch at bottom"],
  },
  "Push Ups": {
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Shoulders", "Arms", "Core"],
    description: "Lower your chest to the floor and push back up, body in a straight line.",
    tips: ["Keep core tight throughout", "Don't let hips sag"],
  },
  "Deadlift": {
    primaryMuscles: ["Back"],
    secondaryMuscles: ["Legs", "Core"],
    description: "Hinge at hips, grip bar outside legs, stand up driving through heels.",
    tips: ["Keep bar close to your legs", "Brace your core before lifting"],
  },
  "Barbell Row": {
    primaryMuscles: ["Back"],
    secondaryMuscles: ["Arms", "Core"],
    description: "Hinge forward, pull bar to lower chest, squeezing shoulder blades.",
    tips: ["Keep back flat", "Pull elbows past your torso"],
  },
  "Lat Pulldown": {
    primaryMuscles: ["Back"],
    secondaryMuscles: ["Arms"],
    description: "Pull bar down to upper chest, leading with elbows.",
    tips: ["Lean back slightly", "Squeeze lats at bottom"],
  },
  "Pull Ups": {
    primaryMuscles: ["Back"],
    secondaryMuscles: ["Arms", "Core"],
    description: "Hang from bar, pull yourself up until chin over bar.",
    tips: ["Full hang at bottom", "Avoid swinging or kipping"],
  },
  "Overhead Press": {
    primaryMuscles: ["Shoulders"],
    secondaryMuscles: ["Arms", "Core"],
    description: "Press bar from shoulders to locked out overhead.",
    tips: ["Brace core to protect lower back", "Keep elbows slightly forward"],
  },
  "Lateral Raise": {
    primaryMuscles: ["Shoulders"],
    secondaryMuscles: [],
    description: "Raise dumbbells from sides to shoulder height, arms straight.",
    tips: ["Light weight, control the movement", "Slight bend in elbows"],
  },
  "Face Pull": {
    primaryMuscles: ["Shoulders"],
    secondaryMuscles: ["Back", "Arms"],
    description: "Pull rope or handle to face level, externally rotating shoulders.",
    tips: ["Squeeze shoulder blades together", "Keep elbows high"],
  },
  "Squat": {
    primaryMuscles: ["Legs"],
    secondaryMuscles: ["Core"],
    description: "Lower hips back and down, keeping chest up, drive back up.",
    tips: ["Break at hips first", "Keep knees tracking over toes"],
  },
  "Leg Press": {
    primaryMuscles: ["Legs"],
    secondaryMuscles: [],
    description: "Push platform away, lower with control until knees at ~90 degrees.",
    tips: ["Don't lock knees at top", "Feet shoulder-width apart"],
  },
  "Romanian Deadlift": {
    primaryMuscles: ["Legs"],
    secondaryMuscles: ["Back", "Core"],
    description: "Hinge at hips, lower weight along legs, feel hamstring stretch.",
    tips: ["Keep knees slightly bent", "Drive hips forward to stand"],
  },
  "Leg Curl": {
    primaryMuscles: ["Legs"],
    secondaryMuscles: [],
    description: "Curl weight toward glutes, contracting hamstrings.",
    tips: ["Control the negative", "Avoid lifting hips off pad"],
  },
  "Leg Extension": {
    primaryMuscles: ["Legs"],
    secondaryMuscles: [],
    description: "Extend legs against resistance, squeezing quads at top.",
    tips: ["Don't hyperextend knees", "Lower with control"],
  },
  "Calf Raise": {
    primaryMuscles: ["Legs"],
    secondaryMuscles: [],
    description: "Rise onto toes, lower heels below platform for full stretch.",
    tips: ["Full range of motion", "Pause at top for contraction"],
  },
  "Bicep Curl": {
    primaryMuscles: ["Arms"],
    secondaryMuscles: [],
    description: "Curl weight toward shoulders, elbows stay at sides.",
    tips: ["No swinging or momentum", "Squeeze at top"],
  },
  "Tricep Pushdown": {
    primaryMuscles: ["Arms"],
    secondaryMuscles: [],
    description: "Push bar or rope down, extending arms, elbows by sides.",
    tips: ["Keep elbows fixed", "Squeeze triceps at bottom"],
  },
  "Hammer Curl": {
    primaryMuscles: ["Arms"],
    secondaryMuscles: [],
    description: "Curl dumbbells with neutral grip, palms facing each other.",
    tips: ["Targets brachialis and forearms", "Control the eccentric"],
  },
  "Plank": {
    primaryMuscles: ["Core"],
    secondaryMuscles: ["Shoulders", "Legs"],
    description: "Hold push-up position with forearms on floor, body straight.",
    tips: ["Don't let hips sag or pike", "Breathe steadily"],
  },
  "Cable Crunch": {
    primaryMuscles: ["Core"],
    secondaryMuscles: [],
    description: "Kneel, pull cable down by crunching abs, elbows to knees.",
    tips: ["Move from abs, not arms", "Controlled tempo"],
  },
};

const MUSCLE_COLORS = {
  Chest: "bg-red-500/20 text-red-700 dark:bg-red-500/25 dark:text-red-300",
  Back: "bg-blue-500/20 text-blue-700 dark:bg-blue-500/25 dark:text-blue-300",
  Shoulders: "bg-violet-500/20 text-violet-700 dark:bg-violet-500/25 dark:text-violet-300",
  Legs: "bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300",
  Arms: "bg-amber-500/20 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300",
  Core: "bg-teal-500/20 text-teal-700 dark:bg-teal-500/25 dark:text-teal-300",
};

function MuscleBadge({ muscle, small }) {
  const cls = MUSCLE_COLORS[muscle] || "bg-slate-500/20 text-slate-700 dark:text-slate-300";
  const size = small ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm";
  return (
    <span className={`rounded-full font-medium ${size} ${cls}`}>{muscle}</span>
  );
}

export function ExerciseInfoCard({ exerciseName, isDarkMode, compact = false }) {
  const info = EXERCISE_LIBRARY[exerciseName];
  if (!info) {
    return (
      <span className={isDarkMode ? "text-iron-500 text-xs" : "text-slate-500 text-xs"}>
        Custom exercise
      </span>
    );
  }

  const cardCls = `rounded-card ${isDarkMode ? "bg-iron-800/50" : "bg-slate-50"}`;
  const textCls = isDarkMode ? "text-iron-100" : "text-slate-800";
  const mutedCls = isDarkMode ? "text-iron-400" : "text-slate-500";

  if (compact) {
    return (
      <div className={`inline-flex flex-wrap gap-1 ${cardCls} px-2 py-1.5`}>
        {info.primaryMuscles.map((m) => (
          <MuscleBadge key={m} muscle={m} small />
        ))}
      </div>
    );
  }

  return (
    <div className={`${cardCls} p-4`}>
      <h4 className={`font-bold ${textCls} mb-2`}>{exerciseName}</h4>
      <p className={`text-sm mb-3 ${mutedCls}`}>{info.description}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {info.primaryMuscles.map((m) => (
          <MuscleBadge key={m} muscle={m} />
        ))}
        {info.secondaryMuscles.map((m) => (
          <MuscleBadge key={m} muscle={m} />
        ))}
      </div>
      {info.tips.length > 0 && (
        <ul className={`text-xs ${mutedCls} space-y-1 list-disc list-inside`}>
          {info.tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ExerciseInfoCard;
