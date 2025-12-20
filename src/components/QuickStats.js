import Link from 'next/link';

export default function QuickStats({ 
  exerciseCount = 0, 
  habitsCompleted = 0, 
  habitsTotal = 0 
}) {
  return (
    <Link href="/progress" className="block">
      <div className="flex gap-3">
        <div className="flex-1 bg-iron-900/50 rounded-xl p-3 flex items-center gap-3 active:bg-iron-800/50 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-iron-100">{exerciseCount}</p>
            <p className="text-iron-500 text-xs">exercises</p>
          </div>
        </div>

        <div className="flex-1 bg-iron-900/50 rounded-xl p-3 flex items-center gap-3 active:bg-iron-800/50 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-iron-100">
              {habitsCompleted}<span className="text-iron-500 text-sm font-normal">/{habitsTotal}</span>
            </p>
            <p className="text-iron-500 text-xs">habits</p>
          </div>
        </div>
      </div>
      <p className="text-iron-600 text-xs text-center mt-2">Tap to view progress</p>
    </Link>
  );
}

