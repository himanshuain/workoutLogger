// Notification utility for PWA

export const NotificationService = {
  // Check if notifications are supported
  isSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
  },

  // Get current permission status
  getPermission() {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  },

  // Request notification permission
  async requestPermission() {
    if (!this.isSupported()) {
      return { granted: false, reason: 'unsupported' };
    }

    try {
      const permission = await Notification.requestPermission();
      return { 
        granted: permission === 'granted',
        permission 
      };
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return { granted: false, reason: 'error', error };
    }
  },

  // Schedule a notification (uses localStorage for simplicity)
  scheduleNotification(id, { title, body, icon, time, days = [], enabled = true }) {
    const schedules = this.getSchedules();
    schedules[id] = { title, body, icon, time, days, enabled, id };
    localStorage.setItem('notification_schedules', JSON.stringify(schedules));
    
    // Set up the check interval if not already running
    this.startScheduleChecker();
    
    return schedules[id];
  },

  // Remove a scheduled notification
  removeSchedule(id) {
    const schedules = this.getSchedules();
    delete schedules[id];
    localStorage.setItem('notification_schedules', JSON.stringify(schedules));
  },

  // Get all schedules
  getSchedules() {
    try {
      return JSON.parse(localStorage.getItem('notification_schedules') || '{}');
    } catch {
      return {};
    }
  },

  // Get schedule for specific trackable
  getSchedule(id) {
    return this.getSchedules()[id] || null;
  },

  // Show a notification immediately
  async showNotification(title, options = {}) {
    if (this.getPermission() !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }

    try {
      // Try to use service worker notification first (works better on mobile)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body: options.body || '',
          icon: options.icon || '/favicon.svg',
          badge: '/favicon.svg',
          tag: options.tag || 'logbook-notification',
          vibrate: [100, 50, 100],
          data: options.data || {},
          requireInteraction: options.requireInteraction || false,
          ...options,
        });
      } else {
        // Fallback to regular notification
        new Notification(title, {
          body: options.body || '',
          icon: options.icon || '/favicon.svg',
          tag: options.tag || 'logbook-notification',
          ...options,
        });
      }
      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  },

  // Check if it's time to show any notifications
  checkSchedules() {
    const schedules = this.getSchedules();
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const today = now.toISOString().split('T')[0];

    // Get last shown times
    const lastShown = JSON.parse(localStorage.getItem('notification_last_shown') || '{}');

    Object.values(schedules).forEach(schedule => {
      if (!schedule.enabled) return;
      
      // Check if current time matches (within 1 minute window)
      const [schedHour, schedMin] = schedule.time.split(':').map(Number);
      const [currHour, currMin] = currentTime.split(':').map(Number);
      
      const isTimeMatch = schedHour === currHour && schedMin === currMin;
      
      // Check if current day matches (if days are specified)
      const isDayMatch = schedule.days.length === 0 || schedule.days.includes(currentDay);
      
      // Check if not already shown today
      const alreadyShownToday = lastShown[schedule.id] === today;

      if (isTimeMatch && isDayMatch && !alreadyShownToday) {
        this.showNotification(schedule.title, {
          body: schedule.body,
          icon: schedule.icon,
          tag: `habit-${schedule.id}`,
          data: { trackableId: schedule.id },
        });

        // Mark as shown today
        lastShown[schedule.id] = today;
        localStorage.setItem('notification_last_shown', JSON.stringify(lastShown));
      }
    });
  },

  // Start the schedule checker (runs every minute)
  startScheduleChecker() {
    if (this._checkerInterval) return;
    
    // Check immediately
    this.checkSchedules();
    
    // Then check every minute
    this._checkerInterval = setInterval(() => {
      this.checkSchedules();
    }, 60000);
  },

  // Stop the schedule checker
  stopScheduleChecker() {
    if (this._checkerInterval) {
      clearInterval(this._checkerInterval);
      this._checkerInterval = null;
    }
  },

  // Format time for display
  formatTime(time) {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  },

  // Day names
  dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  dayNamesFull: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

export default NotificationService;

