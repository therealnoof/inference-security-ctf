// =============================================================================
// Authentication Types & Configuration
// =============================================================================
// This file defines the authentication system types and configuration.
// Supports multiple auth providers: Auth0, Basic Auth, or OAuth
// =============================================================================

// -----------------------------------------------------------------------------
// User Types
// -----------------------------------------------------------------------------

/**
 * User roles for access control
 * - player: Regular user, can play CTF and view leaderboard
 * - moderator: Can view all attempts, reset user progress
 * - admin: Full access including user management
 * - superadmin: Can manage other admins (single owner account)
 */
export type UserRole = 'player' | 'moderator' | 'admin' | 'superadmin';

/**
 * User account status
 */
export type UserStatus = 'active' | 'suspended' | 'banned' | 'pending';

/**
 * User profile stored in database
 */
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  
  // Profile
  avatarUrl?: string;
  bio?: string;
  
  // Stats (denormalized for quick access)
  totalScore: number;
  levelsCompleted: number;
  completedLevelIds?: number[]; // Track which specific levels were completed
  totalAttempts: number;
  bestTime?: number; // seconds
  
  // Timestamps
  createdAt: Date;
  lastLoginAt?: Date;
  lastActiveAt?: Date;  // Updated on user activity (chat, score submission)
  suspendedAt?: Date;
  suspendedReason?: string;
  suspendedBy?: string; // Admin user ID
  
  // Auth provider info
  authProvider: 'auth0' | 'basic' | 'google' | 'github';
  authProviderId?: string; // External provider's user ID
}

/**
 * Session user (what's stored in JWT/session)
 */
export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
}

/**
 * Auth configuration
 */
export interface AuthConfig {
  provider: 'auth0' | 'basic' | 'nextauth';
  
  // Auth0 specific
  auth0Domain?: string;
  auth0ClientId?: string;
  auth0ClientSecret?: string;
  auth0Audience?: string;
  
  // Basic auth specific
  jwtSecret?: string;
  jwtExpiresIn?: string; // e.g., '7d'
  
  // Session settings
  sessionMaxAge?: number; // seconds
}

// -----------------------------------------------------------------------------
// Permission Definitions
// -----------------------------------------------------------------------------

/**
 * Actions that can be performed in the system
 */
export type Permission =
  // CTF Actions
  | 'ctf:play'
  | 'ctf:view_leaderboard'
  | 'ctf:view_own_attempts'
  
  // User Management
  | 'users:view_all'
  | 'users:view_details'
  | 'users:edit'
  | 'users:suspend'
  | 'users:unsuspend'
  | 'users:ban'
  | 'users:delete'
  | 'users:change_role'
  | 'users:impersonate'
  
  // Admin Actions
  | 'admin:view_dashboard'
  | 'admin:view_analytics'
  | 'admin:view_all_attempts'
  | 'admin:export_data'
  | 'admin:configure_levels'
  | 'admin:reset_leaderboard'
  
  // Super Admin Actions
  | 'superadmin:manage_admins'
  | 'superadmin:system_config';

/**
 * Role to permissions mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  player: [
    'ctf:play',
    'ctf:view_leaderboard',
    'ctf:view_own_attempts',
  ],
  
  moderator: [
    'ctf:play',
    'ctf:view_leaderboard',
    'ctf:view_own_attempts',
    'users:view_all',
    'users:view_details',
    'admin:view_all_attempts',
  ],
  
  admin: [
    'ctf:play',
    'ctf:view_leaderboard',
    'ctf:view_own_attempts',
    'users:view_all',
    'users:view_details',
    'users:edit',
    'users:suspend',
    'users:unsuspend',
    'users:ban',
    'users:delete',
    'users:impersonate',
    'admin:view_dashboard',
    'admin:view_analytics',
    'admin:view_all_attempts',
    'admin:export_data',
    'admin:configure_levels',
  ],
  
  superadmin: [
    // All permissions
    'ctf:play',
    'ctf:view_leaderboard',
    'ctf:view_own_attempts',
    'users:view_all',
    'users:view_details',
    'users:edit',
    'users:suspend',
    'users:unsuspend',
    'users:ban',
    'users:delete',
    'users:change_role',
    'users:impersonate',
    'admin:view_dashboard',
    'admin:view_analytics',
    'admin:view_all_attempts',
    'admin:export_data',
    'admin:configure_levels',
    'admin:reset_leaderboard',
    'superadmin:manage_admins',
    'superadmin:system_config',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role can manage another role
 */
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    player: 0,
    moderator: 1,
    admin: 2,
    superadmin: 3,
  };
  
  // Can only manage roles below your level
  return roleHierarchy[managerRole] > roleHierarchy[targetRole];
}

// -----------------------------------------------------------------------------
// Admin Action Types
// -----------------------------------------------------------------------------

/**
 * Admin action log entry
 */
export interface AdminAction {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: 'user' | 'level' | 'system';
  targetId?: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
}

/**
 * User suspension request
 */
export interface SuspendUserRequest {
  userId: string;
  reason: string;
  duration?: number; // days, undefined = indefinite
}

/**
 * Bulk action request
 */
export interface BulkActionRequest {
  userIds: string[];
  action: 'suspend' | 'unsuspend' | 'delete' | 'change_role';
  reason?: string;
  newRole?: UserRole;
}
