export const INTERVENTION_TYPES = [
  'installation',
  'maintenance',
  'repair',
  'inspection',
  'other',
] as const;
export type InterventionType = (typeof INTERVENTION_TYPES)[number];

export const INTERVENTION_STATUS = [
  'pending',
  'assigned',
  'in_progress',
  'paused',
  'pending_validation',
  'closed',
  'issue',
  'cancelled',
] as const;
export type InterventionStatus = (typeof INTERVENTION_STATUS)[number];

export const INTERVENTION_PRIORITY = [
  'low',
  'normal',
  'high',
  'urgent',
] as const;
export type InterventionPriority = (typeof INTERVENTION_PRIORITY)[number];

export const TECHNICIAN_STATUS = [
  'available',
  'on_site',
  'travelling',
  'offline',
  'on_break',
] as const;
export type TechnicianStatus = (typeof TECHNICIAN_STATUS)[number];

export const TIMELINE_EVENT_TYPES = [
  'check_in',
  'check_out',
  'pause_start',
  'pause_end',
  'note',
  'photo',
  'status_change',
  'assignment',
  'step_validated',
] as const;
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export const INTERVENTION_TYPE_LABELS: Record<InterventionType, string> = {
  installation: 'Installation',
  maintenance: 'Maintenance',
  repair: 'Repair',
  inspection: 'Inspection',
  other: 'Other',
};

export const INTERVENTION_STATUS_LABELS: Record<InterventionStatus, string> = {
  pending: 'En attente',
  assigned: 'Assignee',
  in_progress: 'En cours',
  paused: 'En pause',
  pending_validation: 'En validation',
  closed: 'Cloturee',
  issue: 'Probleme',
  cancelled: 'Annulee',
};

export const INTERVENTION_PRIORITY_LABELS: Record<InterventionPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export const TECHNICIAN_TYPES = ['electrician', 'it', 'other'] as const;
export type TechnicianType = (typeof TECHNICIAN_TYPES)[number];

export const TECHNICIAN_TYPE_LABELS: Record<TechnicianType, string> = {
  electrician: 'Electrician',
  it: 'IT',
  other: 'Other',
};

export const USER_ROLES = ['admin', 'user'] as const;
export type UserRole = (typeof USER_ROLES)[number];
