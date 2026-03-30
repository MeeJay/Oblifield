// Server → Client events
export const SOCKET_EVENTS = {
  // Connection
  INITIAL_DATA: 'initialData',

  // Intervention events
  INTERVENTION_CREATED: 'intervention:created',
  INTERVENTION_UPDATED: 'intervention:updated',
  INTERVENTION_DELETED: 'intervention:deleted',
  INTERVENTION_STATUS_CHANGE: 'intervention:statusChange',

  // Timeline events
  TIMELINE_EVENT_CREATED: 'timeline:eventCreated',

  // Client events
  CLIENT_CREATED: 'client:created',
  CLIENT_UPDATED: 'client:updated',
  CLIENT_DELETED: 'client:deleted',

  // Technician events
  TECHNICIAN_STATUS_CHANGED: 'technician:statusChanged',
  TECHNICIAN_LOCATION_UPDATED: 'technician:locationUpdated',

  // Notification events
  NOTIFICATION_SENT: 'notification:sent',
  NOTIFICATION_NEW: 'notification:new',

  // Settings events
  SETTINGS_UPDATED: 'settings:updated',
} as const;

// Client → Server events
export const CLIENT_EVENTS = {
  INTERVENTION_SUBSCRIBE: 'intervention:subscribe',
  INTERVENTION_UNSUBSCRIBE: 'intervention:unsubscribe',
} as const;
