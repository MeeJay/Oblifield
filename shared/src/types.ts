import type { InterventionType, InterventionStatus, InterventionPriority, TechnicianStatus, TechnicianType, TimelineEventType, UserRole } from './interventionTypes';
import type { SettingsKey } from './settingsDefaults';

// ============================================
// User types
// ============================================
export type AppTheme = 'modern' | 'neon';

export interface UserPreferences {
  toastEnabled: boolean;
  toastPosition: 'top-center' | 'bottom-right';
  multiTenantNotificationsEnabled?: boolean;
  preferredTheme?: AppTheme;
  anonymousMode?: boolean;
}

export interface LiveAlertData {
  id: number;
  tenantId: number;
  tenantName?: string;
  severity: 'down' | 'up' | 'warning' | 'info';
  title: string;
  message: string;
  navigateTo: string | null;
  stableKey: string | null;
  read: boolean;
  createdAt: string;
}

export interface User {
  id: number;
  username: string;
  displayName: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  preferences?: UserPreferences | null;
  email?: string | null;
  preferredLanguage: string;
  enrollmentVersion: number;
  totpEnabled?: boolean;
  emailOtpEnabled?: boolean;
  foreignSource?: string | null;
  foreignId?: number | null;
  foreignSourceUrl?: string | null;
  hasPassword?: boolean;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

// ============================================
// Intervention types
// ============================================
export interface Intervention {
  id: number;
  title: string;
  description: string | null;
  type: InterventionType;
  status: InterventionStatus;
  priority: InterventionPriority;
  clientId: number | null;
  siteId: number | null;
  assignedTechnicianId: number | null;
  assignedTechnicianName: string | null;
  clientName: string | null;
  siteName: string | null;
  scheduledAt: string | null;
  dueAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  estimatedDurationMinutes: number | null;
  supervisorName: string | null;
  ticketReference: string | null;
  technicianObservations: string | null;
  supervisorObservations: string | null;
  supervisorId: number | null;
  stepTemplateId: number | null;
  createdBy: number | null;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Timeline event types
// ============================================
export interface TimelineEvent {
  id: number;
  interventionId: number;
  type: TimelineEventType;
  technicianId: number | null;
  technicianName: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  message: string | null;
  photoUrl: string | null;
  previousStatus: InterventionStatus | null;
  newStatus: InterventionStatus | null;
  createdAt: string;
}

// ============================================
// Client types (replaces MonitorGroup)
// ============================================
export interface Client {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  parentId: number | null;
  sortOrder: number;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClientTreeNode extends Client {
  children: ClientTreeNode[];
  interventionCount: number;
  siteCount: number;
}

// ============================================
// Site types (physical locations belonging to a client)
// ============================================
export interface Site {
  id: number;
  clientId: number;
  clientName: string | null;
  name: string;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Technician types
// ============================================
export interface Technician {
  id: number;
  firstName: string;
  lastName: string;
  displayName: string;  // computed: firstName + ' ' + lastName
  company: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  actionRadiusKm: number | null;
  type: TechnicianType | null;
  typeOther: string | null;
  rating: number | null;
  status: TechnicianStatus;
  currentInterventionId: number | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastLocationAt: string | null;
  specialties: string[];
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Step Template types
// ============================================
export interface StepTemplate {
  id: number;
  name: string;
  description: string | null;
  items: StepTemplateItem[];
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

export interface StepTemplateItem {
  id: number;
  templateId: number;
  sortOrder: number;
  label: string;
  description: string | null;
  createdAt: string;
}

// ============================================
// Intervention Step types
// ============================================
export interface InterventionStep {
  id: number;
  interventionId: number;
  templateItemId: number | null;
  sortOrder: number;
  label: string;
  description: string | null;
  technicianValidatedAt: string | null;
  technicianValidatedBy: number | null;
  technicianValidatedByName: string | null;
  supervisorValidatedAt: string | null;
  supervisorValidatedBy: number | null;
  supervisorValidatedByName: string | null;
  createdAt: string;
}

// ============================================
// Intervention photo types
// ============================================
export interface InterventionPhoto {
  id: number;
  interventionId: number;
  timelineEventId: number | null;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: number | null;
  createdAt: string;
}

// ============================================
// Documentation types
// ============================================
export interface DocCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  sortOrder: number;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocCategoryTreeNode extends DocCategory {
  children: DocCategoryTreeNode[];
  documentCount: number;
}

export interface DocDocument {
  id: number;
  title: string;
  slug: string;
  content: string;
  categoryId: number;
  categoryName: string | null;
  sortOrder: number;
  createdBy: number | null;
  createdByName: string | null;
  updatedBy: number | null;
  updatedByName: string | null;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

export interface InterventionDocument {
  interventionId: number;
  documentId: number;
  documentTitle: string;
  categoryName: string | null;
  attachedBy: number | null;
  attachedAt: string;
}

// ============================================
// Notification types
// ============================================
export interface NotificationChannel {
  id: number;
  name: string;
  type: string;
  config: Record<string, unknown>;
  isEnabled: boolean;
  createdBy: number | null;
  tenantId?: number;
  isShared?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OverrideMode = 'merge' | 'replace' | 'exclude';

// ============================================
// Settings types
// ============================================
export type SettingsScope = 'global' | 'client' | 'intervention';

export interface SettingValue {
  value: number;
  source: SettingsScope | 'default';
  sourceId: number | null;
  sourceName: string;
}

export type ResolvedSettings = Record<SettingsKey, SettingValue>;

// ============================================
// API types
// ============================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

export interface BulkEditRequest {
  interventionIds: number[];
  changes: Partial<Intervention>;
}

export interface CreateClientRequest {
  name: string;
  description?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  parentId?: number | null;
  sortOrder?: number;
}

export interface UpdateClientRequest {
  name?: string;
  description?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  parentId?: number | null;
  sortOrder?: number;
}

export interface MoveClientRequest {
  newParentId: number | null;
}

// ============================================
// Notification API types
// ============================================
export interface CreateNotificationChannelRequest {
  name: string;
  type: string;
  config: Record<string, unknown>;
  isEnabled?: boolean;
}

export interface UpdateNotificationChannelRequest {
  name?: string;
  config?: Record<string, unknown>;
  isEnabled?: boolean;
}

export interface NotificationBinding {
  id: number;
  channelId: number;
  scope: 'global' | 'client' | 'intervention';
  scopeId: number | null;
  overrideMode: OverrideMode;
}

export interface NotificationPluginMeta {
  type: string;
  name: string;
  description: string;
  configFields: NotificationConfigField[];
}

export interface NotificationConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'url' | 'textarea' | 'boolean' | 'smtp_server_select';
  placeholder?: string;
  required?: boolean;
}

// ============================================
// SMTP Server types
// ============================================
export interface SmtpServer {
  id: number;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromAddress: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// App Config types
// ============================================
export interface ObligateConfig {
  url: string | null;
  apiKeySet: boolean;
  enabled: boolean;
}

export interface AppConfig {
  allow_2fa: boolean;
  force_2fa: boolean;
  otp_smtp_server_id: number | null;
  obligate_url: string | null;
  obligate_enabled: boolean;
  company_name: string;
}

// ============================================
// Team & Permission types
// ============================================
export type PermissionLevel = 'ro' | 'rw';
export type PermissionScope = 'client' | 'intervention';

export interface UserTeam {
  id: number;
  name: string;
  description: string | null;
  canCreate: boolean;
  tenantId: number;
  tenantName?: string;
  isGlobal: boolean;
  targetTenants?: { id: number; name: string; slug: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamPermission {
  id: number;
  teamId: number;
  scope: PermissionScope;
  scopeId: number;
  level: PermissionLevel;
}

export interface UserPermissions {
  canCreate: boolean;
  teams: number[];
  permissions: Record<string, PermissionLevel>;
}

// ============================================
// Team API types
// ============================================
export interface CreateTeamRequest {
  name: string;
  description?: string | null;
  canCreate?: boolean;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string | null;
  canCreate?: boolean;
}

export interface SetTeamMembersRequest {
  userIds: number[];
}

export interface SetTeamPermissionsRequest {
  permissions: Array<{
    scope: PermissionScope;
    scopeId: number;
    level: PermissionLevel;
  }>;
}

// ============================================
// User API types
// ============================================
export interface CreateUserRequest {
  username: string;
  password: string;
  displayName?: string | null;
  role?: UserRole;
}

export interface UpdateUserRequest {
  username?: string;
  displayName?: string | null;
  role?: UserRole;
  isActive?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
}

// ============================================
// Tenant types (multi-tenancy)
// ============================================
export interface Tenant {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantMembership {
  tenantId: number;
  userId: number;
  role: 'admin' | 'member';
}

export interface TenantWithRole extends Tenant {
  role: 'admin' | 'member';
}

export interface UserTenantAssignment {
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  isMember: boolean;
  role: 'admin' | 'member';
}
