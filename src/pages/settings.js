import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import { useWorkout } from '@/context/WorkoutContext';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { User, Plus, Pencil, Trash2, ChevronDown, Zap, Check, Bell, BellRing } from 'lucide-react';
import NotificationSettings from '@/components/NotificationSettings';
import NotificationService from '@/lib/notifications';

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
  const queryClient = useQueryClient();
  const { 
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
  const [notificationTrackable, setNotificationTrackable] = useState(null);
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

  // Get date range
  const dateRange = useMemo(() => {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    return { start: getLocalDateStr(startDate), end: today };
  }, [today]);

  // TanStack Query for tracking entries
  const { data: habitHeatmapData = {} } = useQuery({
    queryKey: ['trackingEntriesForHeatmap', user?.id, dateRange.start, dateRange.end, trackables.length],
    queryFn: async () => {
      if (!user || trackables.length === 0) return {};
      
      const entries = await getTrackingEntries(dateRange.start, dateRange.end);
      
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
        const trackableData = { ...(dataByTrackable[trackable.id] || {}) };
        
        // Add today's entry from local state if completed
        const todayEntry = todayEntries[trackable.id];
        if (todayEntry?.is_completed) {
          trackableData[today] = 1;
        }
        
        heatmapData[trackable.id] = Object.entries(trackableData).map(
          ([date, count]) => ({ date, count })
        );
      });

      return heatmapData;
    },
    enabled: !!user && trackables.length > 0,
  });

  const handleSavePill = async () => {
    if (!newPill.name.trim()) return;

    if (editingTrackable) {
      await updateTrackable(editingTrackable.id, newPill);
    } else {
      await createTrackable(newPill);
    }

    queryClient.invalidateQueries(['trackingEntriesForHeatmap']);
    
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
      queryClient.invalidateQueries(['trackingEntriesForHeatmap']);
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
      <div className="px-4 py-4 pb-24">
        {/* Header - Sticky */}
        <div className="sticky top-0 z-30 bg-iron-950/95 backdrop-blur-sm -mx-4 px-4 pb-3 pt-1">
          <h2 className="text-xl font-bold text-iron-100">Settings</h2>
        </div>

        <div className="space-y-6 mt-4">
          {/* Account */}
          <section>
            <h3 className="text-xs font-medium text-iron-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              Account
            </h3>
            <div className="p-4 rounded-2xl bg-iron-900">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-iron-100 font-medium">{user.email}</p>
                  <p className="text-iron-500 text-sm">Logged in</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-lift-primary/20 flex items-center justify-center">
                  <span className="text-lift-primary font-bold text-lg">
                    {user.email?.[0]?.toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={async () => {
                  await signOut();
                  router.push('/auth');
                }}
                className="w-full py-3 rounded-xl bg-iron-800 text-iron-400 text-sm font-medium
                         active:bg-iron-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </section>

          {/* Manage Habits/Health Pills */}
          <section id="habits">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-iron-500 uppercase tracking-wider">
                Habits & Health Tracking
              </h3>
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
                className="flex items-center gap-1 text-lift-primary text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add New
              </button>
            </div>

            <div className="space-y-3">
              {trackables.map(trackable => {
                const isExpanded = expandedHabit === trackable.id;
                const streakDays = getStreakCount(trackable.id);
                
                return (
                  <div key={trackable.id} className="rounded-2xl bg-iron-900 overflow-hidden">
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
                        <ChevronDown 
                          className={`w-5 h-5 text-iron-500 transition-transform ml-auto ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => setNotificationTrackable(trackable)}
                          className={`p-2 rounded-lg active:bg-iron-800 ${
                            NotificationService.getSchedule(trackable.id)?.enabled
                              ? 'text-lift-primary'
                              : 'text-iron-500 hover:text-iron-300'
                          }`}
                        >
                          {NotificationService.getSchedule(trackable.id)?.enabled 
                            ? <BellRing className="w-4 h-4" />
                            : <Bell className="w-4 h-4" />
                          }
                        </button>
                        <button
                          onClick={() => handleEditPill(trackable)}
                          className="p-2 text-iron-500 hover:text-iron-300 active:bg-iron-800 rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePill(trackable.id)}
                          className="p-2 text-iron-500 hover:text-red-500 active:bg-iron-800 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
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
                  className="w-full p-6 rounded-2xl border-2 border-dashed border-iron-800 
                           flex flex-col items-center justify-center gap-2
                           hover:border-iron-700 active:bg-iron-900/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-iron-800 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-iron-400" />
                  </div>
                  <p className="text-iron-400 font-medium">Add a habit to track</p>
                  <p className="text-iron-600 text-sm">Water, sleep, supplements...</p>
                </button>
              )}
            </div>
          </section>

          {/* About */}
          <section className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-lift-primary to-lift-secondary flex items-center justify-center">
              <Zap className="w-8 h-8 text-iron-950" />
            </div>
            <h3 className="text-iron-100 font-bold text-lg">Logbook</h3>
            <p className="text-iron-500 text-sm">Version 2.1.0</p>
            <p className="text-iron-600 text-xs mt-2">Simple workout & habit tracking</p>
          </section>
        </div>

        {/* Add/Edit Pill Drawer */}
        <Drawer open={showAddModal} onOpenChange={setShowAddModal}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>
                {editingTrackable ? 'Edit Trackable' : 'Add Trackable'}
              </DrawerTitle>
            </DrawerHeader>

            <div className="px-4 pb-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Name */}
              <div>
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
              <div>
                <label className="block text-iron-400 text-sm mb-2">Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewPill({ ...newPill, type: 'habit', has_value: false })}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
                      newPill.type === 'habit'
                        ? 'bg-lift-primary text-iron-950'
                        : 'bg-iron-800 text-iron-400'
                    }`}
                  >
                    {newPill.type === 'habit' && <Check className="w-4 h-4" />}
                    Habit (Yes/No)
                  </button>
                  <button
                    onClick={() => setNewPill({ ...newPill, type: 'health', has_value: true })}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
                      newPill.type === 'health'
                        ? 'bg-lift-primary text-iron-950'
                        : 'bg-iron-800 text-iron-400'
                    }`}
                  >
                    {newPill.type === 'health' && <Check className="w-4 h-4" />}
                    Health (Value)
                  </button>
                </div>
              </div>

              {/* Value Unit (for health type) */}
              {newPill.type === 'health' && (
                <div>
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
              <div>
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
              <div>
                <label className="block text-iron-400 text-sm mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PILL_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewPill({ ...newPill, color })}
                      className={`w-10 h-10 rounded-xl transition-transform ${
                        newPill.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-iron-900 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-iron-800/50 rounded-xl">
                <p className="text-iron-500 text-xs mb-2">Preview</p>
                <div 
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-iron-950 font-medium"
                  style={{ backgroundColor: newPill.color }}
                >
                  <span>{newPill.icon}</span>
                  <Check className="w-4 h-4" />
                  <span>{newPill.name || 'Name'}</span>
                  {newPill.has_value && (
                    <span className="text-xs bg-black/20 px-1.5 py-0.5 rounded-full">
                      8 {newPill.value_unit}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 pb-safe">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3.5 rounded-xl bg-iron-800 text-iron-400 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePill}
                  disabled={!newPill.name.trim()}
                  className="flex-1 py-3.5 rounded-xl bg-lift-primary text-iron-950 font-bold
                           disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {editingTrackable ? 'Save' : 'Add'}
                </button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Notification Settings */}
        {notificationTrackable && (
          <NotificationSettings
            trackable={notificationTrackable}
            onClose={() => setNotificationTrackable(null)}
          />
        )}
      </div>
    </Layout>
  );
}
