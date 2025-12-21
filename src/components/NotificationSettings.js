import { useState, useEffect } from 'react';
import { Bell, BellOff, Clock, Check } from 'lucide-react';
import NotificationService from '@/lib/notifications';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

const DAYS = [
  { id: 0, short: 'S', name: 'Sun' },
  { id: 1, short: 'M', name: 'Mon' },
  { id: 2, short: 'T', name: 'Tue' },
  { id: 3, short: 'W', name: 'Wed' },
  { id: 4, short: 'T', name: 'Thu' },
  { id: 5, short: 'F', name: 'Fri' },
  { id: 6, short: 'S', name: 'Sat' },
];

export default function NotificationSettings({ trackable, onClose }) {
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [schedule, setSchedule] = useState({
    enabled: false,
    time: '09:00',
    days: [1, 2, 3, 4, 5], // Mon-Fri by default
  });
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    // Check notification permission
    setPermissionStatus(NotificationService.getPermission());

    // Load existing schedule
    const existing = NotificationService.getSchedule(trackable.id);
    if (existing) {
      setSchedule({
        enabled: existing.enabled,
        time: existing.time,
        days: existing.days || [],
      });
    }
  }, [trackable.id]);

  const handleRequestPermission = async () => {
    const result = await NotificationService.requestPermission();
    setPermissionStatus(result.permission || 'denied');
    
    if (result.granted) {
      // Show test notification
      NotificationService.showNotification('Notifications Enabled! 🎉', {
        body: 'You will now receive reminders for your habits.',
      });
    }
  };

  const handleSave = () => {
    if (schedule.enabled) {
      NotificationService.scheduleNotification(trackable.id, {
        title: `${trackable.icon} ${trackable.name}`,
        body: `Time to log your ${trackable.name.toLowerCase()}!`,
        icon: '/favicon.svg',
        time: schedule.time,
        days: schedule.days,
        enabled: true,
      });
    } else {
      NotificationService.removeSchedule(trackable.id);
    }

    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }

    handleClose();
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => onClose?.(), 200);
  };

  const toggleDay = (dayId) => {
    setSchedule(prev => ({
      ...prev,
      days: prev.days.includes(dayId)
        ? prev.days.filter(d => d !== dayId)
        : [...prev.days, dayId].sort(),
    }));
  };

  const selectAllDays = () => {
    setSchedule(prev => ({
      ...prev,
      days: prev.days.length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6],
    }));
  };

  const selectWeekdays = () => {
    setSchedule(prev => ({
      ...prev,
      days: [1, 2, 3, 4, 5],
    }));
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Reminder for {trackable.name}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-5">
          {/* Permission Status */}
          {permissionStatus !== 'granted' && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <BellOff className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-iron-200 font-medium text-sm">
                    {permissionStatus === 'denied' 
                      ? 'Notifications are blocked' 
                      : 'Enable notifications'}
                  </p>
                  <p className="text-iron-400 text-xs mt-1">
                    {permissionStatus === 'denied'
                      ? 'Please enable notifications in your browser/device settings.'
                      : 'Allow notifications to receive reminders for your habits.'}
                  </p>
                  {permissionStatus !== 'denied' && (
                    <button
                      onClick={handleRequestPermission}
                      className="mt-3 px-4 py-2 rounded-lg bg-amber-500 text-iron-950 font-medium text-sm"
                    >
                      Enable Notifications
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-iron-900">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ backgroundColor: `${trackable.color}30` }}
              >
                {trackable.icon}
              </div>
              <div>
                <p className="text-iron-100 font-medium">Daily Reminder</p>
                <p className="text-iron-500 text-xs">Get notified to log this habit</p>
              </div>
            </div>
            <button
              onClick={() => setSchedule(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`w-12 h-7 rounded-full transition-colors relative ${
                schedule.enabled ? 'bg-lift-primary' : 'bg-iron-700'
              }`}
              disabled={permissionStatus !== 'granted'}
            >
              <div 
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  schedule.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {schedule.enabled && permissionStatus === 'granted' && (
            <>
              {/* Time Picker */}
              <div>
                <label className="block text-iron-400 text-sm mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Reminder Time
                </label>
                <input
                  type="time"
                  value={schedule.time}
                  onChange={(e) => setSchedule(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full h-14 px-4 rounded-xl bg-iron-800 text-iron-100 text-lg
                           outline-none focus:ring-2 focus:ring-lift-primary/50"
                />
                <p className="text-iron-500 text-xs mt-2">
                  Current: {NotificationService.formatTime(schedule.time)}
                </p>
              </div>

              {/* Day Picker */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-iron-400 text-sm">Repeat on</label>
                  <div className="flex gap-2">
                    <button
                      onClick={selectWeekdays}
                      className="text-xs text-iron-500 hover:text-iron-300"
                    >
                      Weekdays
                    </button>
                    <button
                      onClick={selectAllDays}
                      className="text-xs text-iron-500 hover:text-iron-300"
                    >
                      {schedule.days.length === 7 ? 'Clear' : 'All'}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  {DAYS.map(day => (
                    <button
                      key={day.id}
                      onClick={() => toggleDay(day.id)}
                      className={`flex-1 h-11 rounded-xl font-medium text-sm transition-colors ${
                        schedule.days.includes(day.id)
                          ? 'bg-lift-primary text-iron-950'
                          : 'bg-iron-800 text-iron-400'
                      }`}
                    >
                      {day.short}
                    </button>
                  ))}
                </div>
                <p className="text-iron-500 text-xs mt-2">
                  {schedule.days.length === 0 
                    ? 'Select at least one day' 
                    : schedule.days.length === 7 
                      ? 'Every day'
                      : schedule.days.map(d => DAYS[d].name).join(', ')}
                </p>
              </div>

              {/* Preview */}
              <div className="p-4 rounded-xl bg-iron-800/50">
                <p className="text-iron-500 text-xs mb-2">Preview</p>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-lift-primary/20 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-lift-primary" />
                  </div>
                  <div>
                    <p className="text-iron-100 font-medium text-sm">
                      {trackable.icon} {trackable.name}
                    </p>
                    <p className="text-iron-400 text-xs">
                      Time to log your {trackable.name.toLowerCase()}!
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 pb-safe">
            <button
              onClick={handleClose}
              className="flex-1 py-3.5 rounded-xl bg-iron-800 text-iron-400 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={schedule.enabled && schedule.days.length === 0}
              className="flex-1 py-3.5 rounded-xl bg-lift-primary text-iron-950 font-bold
                       disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

