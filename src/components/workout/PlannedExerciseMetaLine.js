/**
 * Body line under exercise title: category (capitalized) and optional note, e.g. "Legs · tempo squats"
 */
export default function PlannedExerciseMetaLine({ category, notes, isDarkMode }) {
  const cat = category && category !== "other" ? category : "General";
  const n = typeof notes === "string" ? notes.trim() : "";

  return (
    <p
      className={`text-xs mt-0.5 break-words ${
        isDarkMode ? "text-iron-500" : "text-slate-500"
      }`}
    >
      <span className="capitalize">{cat}</span>
      {n ? (
        <>
          <span className="mx-1.5 opacity-50" aria-hidden>
            ·
          </span>
          <span className="font-normal text-[0.95em]">{n}</span>
        </>
      ) : null}
    </p>
  );
}
