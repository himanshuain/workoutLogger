import { useState, useMemo } from 'react';
import { Search, Check } from 'lucide-react';
import ExerciseIcon from '@/components/ExerciseIcon';

export default function ExerciseAutocomplete({
  exercises = [],
  recentExercises = [],
  loggedToday = new Set(),
  onSelect,
  onClose,
}) {
  const [search, setSearch] = useState('');

  // Filter exercises based on search
  const filteredExercises = useMemo(() => {
    if (!search) return exercises;
    const searchLower = search.toLowerCase();
    return exercises.filter(e => 
      e.name.toLowerCase().includes(searchLower) ||
      e.category?.toLowerCase().includes(searchLower)
    );
  }, [exercises, search]);

  // Group by category
  const groupedExercises = useMemo(() => {
    const groups = {};
    filteredExercises.forEach(exercise => {
      const category = exercise.category || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(exercise);
    });
    return groups;
  }, [filteredExercises]);

  // Get recent exercises that match search
  const filteredRecent = useMemo(() => {
    if (!search) return recentExercises.slice(0, 5);
    const searchLower = search.toLowerCase();
    return recentExercises.filter(e => 
      e.name.toLowerCase().includes(searchLower)
    ).slice(0, 5);
  }, [recentExercises, search]);

  const handleSelect = (exercise) => {
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
    onSelect(exercise);
  };

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Search Input */}
      <div className="flex items-center border-b border-iron-800 px-4 py-3 gap-3">
        <Search className="w-5 h-5 text-iron-500 shrink-0" />
        <input
          type="text"
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-iron-100 placeholder:text-iron-500 outline-none text-base"
          autoFocus
        />
        {search && (
          <button 
            onClick={() => setSearch('')}
            className="text-iron-500 hover:text-iron-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {/* Recent Section */}
        {filteredRecent.length > 0 && !search && (
          <div className="p-2">
            <p className="px-3 py-2 text-xs font-medium text-iron-500 uppercase tracking-wider">
              Recent
            </p>
            {filteredRecent.map((exercise) => {
              const isLogged = loggedToday.has(exercise.name);
              return (
                <button
                  key={exercise.id}
                  onClick={() => handleSelect(exercise)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-iron-800 active:bg-iron-700 transition-colors"
                >
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    ${isLogged ? 'bg-lift-primary/20' : 'bg-iron-800'}
                  `}>
                    {isLogged ? (
                      <Check className="w-5 h-5 text-lift-primary" />
                    ) : (
                      <ExerciseIcon 
                        name={exercise.name} 
                        className="w-8 h-8" 
                        color="#9ca3af"
                      />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${isLogged ? 'text-lift-primary' : 'text-iron-100'}`}>
                      {exercise.name}
                    </p>
                    <p className="text-xs text-iron-500 capitalize">{exercise.category}</p>
                  </div>
                  {isLogged && (
                    <span className="text-xs text-lift-primary bg-lift-primary/10 px-2 py-1 rounded-full">
                      Logged
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* All Exercises by Category */}
        {Object.entries(groupedExercises).map(([category, categoryExercises]) => (
          <div key={category} className="p-2">
            <p className="px-3 py-2 text-xs font-medium text-iron-500 uppercase tracking-wider">
              {category}
            </p>
            {categoryExercises.map((exercise) => {
              const isLogged = loggedToday.has(exercise.name);
              return (
                <button
                  key={exercise.id}
                  onClick={() => handleSelect(exercise)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-iron-800 active:bg-iron-700 transition-colors"
                >
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    ${isLogged ? 'bg-lift-primary/20' : 'bg-iron-800'}
                  `}>
                    {isLogged ? (
                      <Check className="w-5 h-5 text-lift-primary" />
                    ) : (
                      <ExerciseIcon 
                        name={exercise.name} 
                        className="w-8 h-8" 
                        color="#9ca3af"
                      />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${isLogged ? 'text-lift-primary' : 'text-iron-100'}`}>
                      {exercise.name}
                    </p>
                  </div>
                  {isLogged && (
                    <span className="text-xs text-lift-primary bg-lift-primary/10 px-2 py-1 rounded-full">
                      Logged
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Empty State */}
        {filteredExercises.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-16 h-16 rounded-2xl bg-iron-800 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-iron-600" />
            </div>
            <p className="text-iron-400 text-center">No exercises found</p>
            <p className="text-iron-600 text-sm text-center mt-1">
              Try a different search term
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

