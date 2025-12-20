import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import { useWorkout } from '@/context/WorkoutContext';

const PILL_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ef4444', // red
  '#f59e0b', // amber
  '#14b8a6', // teal
  '#ec4899', // pink
  '#6366f1', // indigo
];

const PILL_ICONS = ['💧', '💊', '🥩', '😴', '🧘', '🏃', '💪', '🍎', '☀️', '🧠', '❤️', '⚡'];

export default function Settings() {
  const router = useRouter();
  const { 
    settings, 
    updateSettings, 
    user, 
    signOut,
    trackables,
    todayEntries,
    createTrackable,
    updateTrackable,
    deleteTrackable,
    getTrackingEntries,
    today,
  } = useWorkout();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTrackable, setEditingTrackable] = useState(null);
  const [expandedHabit, setExpandedHabit] = useState(null);
  const [habitHeatmapData, setHabitHeatmapData] = useState({});
  const [newPill, setNewPill] = useState({
    name: '',
    type: 'habit',
    icon: '💧',
    color: '#22c55e',
    has_value: false,
    value_unit: '',
  });

  // Helper function for local date formatting
  const getLocalDateStr = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load heatmap data for all trackables
  useEffect(() => {
    async function loadHeatmapData() {
      if (!user || trackables.length === 0) return;

      const endDate = today;
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      const startStr = getLocalDateStr(startDate);

      const entries = await getTrackingEntries(startStr, endDate);
      
      // Group by trackable_id
      const dataByTrackable = {};
      entries.forEach(entry => {
        if (!dataByTrackable[entry.trackable_id]) {
          dataByTrackable[entry.trackable_id] = {};
        }
        if (entry.is_completed) {
          dataByTrackable[entry.trackable_id][entry.date] = 
            (dataByTrackable[entry.trackable_id][entry.date] || 0) + 1;
        }
      });

      // Convert to heatmap format and include today's local state
      const heatmapData = {};
      
      trackables.forEach(trackable => {
        const trackableData = dataByTrackable[trackable.id] || {};
        
        // Add today's entry from local state if completed
        const todayEntry = todayEntries[trackable.id];
        if (todayEntry?.is_completed) {
          trackableData[today] = 1;
        }
        
        heatmapData[trackable.id] = Object.entries(trackableData).map(
          ([date, count]) => ({ date, count })
        );
      });

      setHabitHeatmapData(heatmapData);
    }

    loadHeatmapData();
  }, [user, trackables, today, todayEntries, getTrackingEntries]);

  const handleUnitChange = (unit) => {
    updateSettings({ unit });
  };

  const handleSavePill = async () => {
    if (!newPill.name.trim()) return;

    if (editingTrackable) {
      await updateTrackable(editingTrackable.id, newPill);
    } else {
      await createTrackable(newPill);
    }

    setShowAddModal(false);
    setEditingTrackable(null);
    setNewPill({
      name: '',
      type: 'habit',
      icon: '💧',
      color: '#22c55e',
      has_value: false,
      value_unit: '',
    });
  };

  const handleEditPill = (trackable) => {
    setEditingTrackable(trackable);
    setNewPill({
      name: trackable.name,
      type: trackable.type,
      icon: trackable.icon || '💧',
      color: trackable.color || '#22c55e',
      has_value: trackable.has_value || false,
      value_unit: trackable.value_unit || '',
    });
    setShowAddModal(true);
  };

  const handleDeletePill = async (id) => {
    if (confirm('Delete this trackable?')) {
      await deleteTrackable(id);
    }
  };

  const getStreakCount = (trackableId) => {
    const data = habitHeatmapData[trackableId] || [];
    return data.length;
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
          <p className="text-iron-500 mb-4">Sign in to access settings</p>
          <button
            onClick={() => router.push('/auth')}
            className="px-6 py-2.5 rounded-xl bg-lift-primary text-iron-950 font-bold"
          >
            Sign In
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-enter">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-iron-950/95 backdrop-blur-lg px-4 py-4 border-b border-iron-900">
          <h1 className="text-2xl font-bold text-iron-100">Settings</h1>
        </header>

        <main className="px-4 py-4 pb-24">
          {/* Account */}
          <section className="mb-6">
            <h2 className="text-xs font-medium text-iron-500 uppercase tracking-wider mb-3">
              Account
            </h2>
            <div className="p-4 rounded-xl bg-iron-900">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-iron-100 font-medium">{user.email}</p>
                  <p className="text-iron-500 text-sm">Logged in</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-lift-primary/20 flex items-center justify-center">
                  <span className="text-lift-primary font-bold">
                    {user.email?.[0]?.toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={async () => {
                  await signOut();
                  router.push('/auth');
                }}
                className="w-full py-2.5 rounded-xl bg-iron-800 text-iron-400 text-sm font-medium
                         active:bg-iron-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </section>

          {/* Units */}
          <section className="mb-6">
            <h2 className="text-xs font-medium text-iron-500 uppercase tracking-wider mb-3">
              Units
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleUnitChange('kg')}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                  settings.unit === 'kg'
                    ? 'bg-lift-primary text-iron-950'
                    : 'bg-iron-800 text-iron-400'
                }`}
              >
                Kilograms (kg)
              </button>
              <button
                onClick={() => handleUnitChange('lb')}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                  settings.unit === 'lb'
                    ? 'bg-lift-primary text-iron-950'
                    : 'bg-iron-800 text-iron-400'
                }`}
              >
                Pounds (lb)
              </button>
            </div>
          </section>

          {/* Manage Habits/Health Pills */}
          <section className="mb-6" id="habits">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium text-iron-500 uppercase tracking-wider">
                Habits & Health Tracking
              </h2>
              <button
                onClick={() => {
                  setEditingTrackable(null);
                  setNewPill({
                    name: '',
                    type: 'habit',
                    icon: '💧',
                    color: '#22c55e',
                    has_value: false,
                    value_unit: '',
                  });
                  setShowAddModal(true);
                }}
                className="text-lift-primary text-sm font-medium"
              >
                + Add New
              </button>
            </div>

            <div className="space-y-3">
              {trackables.map(trackable => {
                const isExpanded = expandedHabit === trackable.id;
                const streakDays = getStreakCount(trackable.id);
                
                return (
                  <div key={trackable.id} className="rounded-xl bg-iron-900 overflow-hidden">
                    {/* Habit Header */}
                    <div className="p-3 flex items-center justify-between">
                      <button
                        onClick={() => setExpandedHabit(isExpanded ? null : trackable.id)}
                        className="flex items-center gap-3 flex-1"
                      >
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                          style={{ backgroundColor: `${trackable.color}30` }}
                        >
                          {trackable.icon}
                        </div>
                        <div className="text-left">
                          <p className="text-iron-100 font-medium">{trackable.name}</p>
                          <p className="text-iron-500 text-xs">
                            {streakDays} day{streakDays !== 1 ? 's' : ''} tracked
                          </p>
                        </div>
                        <svg 
                          className={`w-5 h-5 text-iron-500 transition-transform ml-auto ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor" 
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleEditPill(trackable)}
                          className="p-2 text-iron-500 hover:text-iron-300"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeletePill(trackable.id)}
                          className="p-2 text-iron-500 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Expanded Heatmap */}
                    {isExpanded && (
                      <div className="px-3 pb-3 animate-in slide-in-from-top duration-200">
                        <ActivityHeatmap
                          data={habitHeatmapData[trackable.id] || []}
                          type="habit"
                          label=""
                          color={trackable.color}
                          compact={true}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {trackables.length === 0 && (
                <div className="p-6 rounded-xl bg-iron-900/50 text-center">
                  <p className="text-iron-500">No trackables yet</p>
                  <p className="text-iron-600 text-sm mt-1">Add habits and health metrics to track</p>
                </div>
              )}
            </div>
          </section>

          {/* About */}
          <section className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-lift-primary to-lift-secondary flex items-center justify-center">
              <svg className="w-8 h-8 text-iron-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <h3 className="text-iron-100 font-bold text-lg">Logbook</h3>
            <p className="text-iron-500 text-sm">Version 2.0.0</p>
            <p className="text-iron-600 text-xs mt-2">Simple workout & habit tracking</p>
          </section>
        </main>

        {/* Add/Edit Pill Modal */}
        {showAddModal && (
          <>
            <div 
              className="modal-backdrop"
              onClick={() => setShowAddModal(false)}
            />
            <div className="modal-content">
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-iron-700 rounded-full" />
              </div>

              <div className="px-4 pb-6">
                <h2 className="text-xl font-bold text-iron-100 mb-4">
                  {editingTrackable ? 'Edit Trackable' : 'Add Trackable'}
                </h2>

                {/* Name */}
                <div className="mb-4">
                  <label className="block text-iron-400 text-sm mb-2">Name</label>
                  <input
                    type="text"
                    value={newPill.name}
                    onChange={(e) => setNewPill({ ...newPill, name: e.target.value })}
                    placeholder="e.g., Water, Sleep, Creatine"
                    className="w-full h-12 px-4 rounded-xl bg-iron-800 text-iron-100 
                             placeholder-iron-600 outline-none focus:ring-2 focus:ring-lift-primary/50"
                  />
                </div>

                {/* Type */}
                <div className="mb-4">
                  <label className="block text-iron-400 text-sm mb-2">Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewPill({ ...newPill, type: 'habit', has_value: false })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${
                        newPill.type === 'habit'
                          ? 'bg-lift-primary text-iron-950'
                          : 'bg-iron-800 text-iron-400'
                      }`}
                    >
                      Habit (Yes/No)
                    </button>
                    <button
                      onClick={() => setNewPill({ ...newPill, type: 'health', has_value: true })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${
                        newPill.type === 'health'
                          ? 'bg-lift-primary text-iron-950'
                          : 'bg-iron-800 text-iron-400'
                      }`}
                    >
                      Health (Value)
                    </button>
                  </div>
                </div>

                {/* Value Unit (for health type) */}
                {newPill.type === 'health' && (
                  <div className="mb-4">
                    <label className="block text-iron-400 text-sm mb-2">Unit</label>
                    <input
                      type="text"
                      value={newPill.value_unit}
                      onChange={(e) => setNewPill({ ...newPill, value_unit: e.target.value })}
                      placeholder="e.g., hours, liters, 1-10"
                      className="w-full h-12 px-4 rounded-xl bg-iron-800 text-iron-100 
                               placeholder-iron-600 outline-none focus:ring-2 focus:ring-lift-primary/50"
                    />
                  </div>
                )}

                {/* Icon */}
                <div className="mb-4">
                  <label className="block text-iron-400 text-sm mb-2">Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {PILL_ICONS.map(icon => (
                      <button
                        key={icon}
                        onClick={() => setNewPill({ ...newPill, icon })}
                        className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center
                          ${newPill.icon === icon 
                            ? 'bg-iron-700 ring-2 ring-lift-primary' 
                            : 'bg-iron-800'
                          }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div className="mb-6">
                  <label className="block text-iron-400 text-sm mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {PILL_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewPill({ ...newPill, color })}
                        className={`w-10 h-10 rounded-xl ${
                          newPill.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-iron-900' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="mb-6 p-4 bg-iron-800/50 rounded-xl">
                  <p className="text-iron-500 text-xs mb-2">Preview</p>
                  <div 
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-iron-950 font-medium"
                    style={{ backgroundColor: newPill.color }}
                  >
                    <span>{newPill.icon}</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{newPill.name || 'Name'}</span>
                    {newPill.has_value && (
                      <span className="text-xs bg-black/20 px-1.5 py-0.5 rounded-full">
                        8 {newPill.value_unit}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 rounded-xl bg-iron-800 text-iron-400 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePill}
                    disabled={!newPill.name.trim()}
                    className="flex-1 py-3 rounded-xl bg-lift-primary text-iron-950 font-bold
                             disabled:opacity-50"
                  >
                    {editingTrackable ? 'Save' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
