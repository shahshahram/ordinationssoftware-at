// Event Bus für globale Kommunikation zwischen Komponenten
type EventCallback = (...args: any[]) => void;

class EventBus {
  private events: { [key: string]: EventCallback[] } = {};

  on(event: string, callback: EventCallback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: EventCallback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(...args));
  }
}

export const eventBus = new EventBus();

// Event Types
export const EVENTS = {
  USER_DELETED: 'user_deleted',
  USER_UPDATED: 'user_updated',
  SCHEDULE_DELETED: 'schedule_deleted',
  SCHEDULE_UPDATED: 'schedule_updated',
  STAFF_PROFILE_DELETED: 'staff_profile_deleted',
  STAFF_PROFILE_UPDATED: 'staff_profile_updated',
} as const;
