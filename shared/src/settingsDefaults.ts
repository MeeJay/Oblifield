export const SETTINGS_KEYS = {
  DEFAULT_PRIORITY: 'default_priority',
  DEFAULT_ESTIMATED_DURATION: 'default_estimated_duration',
  NOTIFICATION_COOLDOWN: 'notification_cooldown',
  TIMELINE_RETENTION_DAYS: 'timeline_retention_days',
  PHOTO_MAX_SIZE_MB: 'photo_max_size_mb',
  AUTO_COMPLETE_ON_CHECKOUT: 'auto_complete_on_checkout',
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

export interface SettingDefinition {
  key: SettingsKey;
  label: string;
  description: string;
  type: 'number';
  unit: string;
  default: number;
  min: number;
  max: number;
}

export const SETTINGS_DEFINITIONS: SettingDefinition[] = [
  {
    key: SETTINGS_KEYS.DEFAULT_PRIORITY,
    label: 'Default Priority',
    description: 'Default priority for new interventions (1=low, 2=normal, 3=high, 4=urgent)',
    type: 'number',
    unit: '',
    default: 2,
    min: 1,
    max: 4,
  },
  {
    key: SETTINGS_KEYS.DEFAULT_ESTIMATED_DURATION,
    label: 'Default Estimated Duration',
    description: 'Default estimated duration for new interventions',
    type: 'number',
    unit: 'minutes',
    default: 60,
    min: 5,
    max: 1440,
  },
  {
    key: SETTINGS_KEYS.NOTIFICATION_COOLDOWN,
    label: 'Notification Cooldown',
    description: 'Minimum time between repeated notifications',
    type: 'number',
    unit: 'seconds',
    default: 300,
    min: 0,
    max: 86400,
  },
  {
    key: SETTINGS_KEYS.TIMELINE_RETENTION_DAYS,
    label: 'Timeline Retention',
    description: 'How long to keep timeline event data',
    type: 'number',
    unit: 'days',
    default: 365,
    min: 30,
    max: 3650,
  },
  {
    key: SETTINGS_KEYS.PHOTO_MAX_SIZE_MB,
    label: 'Photo Max Size',
    description: 'Maximum file size for uploaded photos',
    type: 'number',
    unit: 'MB',
    default: 10,
    min: 1,
    max: 50,
  },
  {
    key: SETTINGS_KEYS.AUTO_COMPLETE_ON_CHECKOUT,
    label: 'Auto-Complete on Check-Out',
    description: 'Automatically set intervention to done when technician checks out (1=yes, 0=no)',
    type: 'number',
    unit: '',
    default: 1,
    min: 0,
    max: 1,
  },
];

export const HARDCODED_DEFAULTS: Record<SettingsKey, number> = {
  [SETTINGS_KEYS.DEFAULT_PRIORITY]: 2,
  [SETTINGS_KEYS.DEFAULT_ESTIMATED_DURATION]: 60,
  [SETTINGS_KEYS.NOTIFICATION_COOLDOWN]: 300,
  [SETTINGS_KEYS.TIMELINE_RETENTION_DAYS]: 365,
  [SETTINGS_KEYS.PHOTO_MAX_SIZE_MB]: 10,
  [SETTINGS_KEYS.AUTO_COMPLETE_ON_CHECKOUT]: 1,
};
