// =============================================================================
// Authentication Service - Cloudflare KV Edition
// =============================================================================
// Handles user authentication with Cloudflare KV storage for Edge Runtime.
// All data is stored in KV namespace bound as CTF_KV.
// =============================================================================

import { User, SessionUser, UserRole, UserStatus } from '@/types/auth';
import { getEnv } from '@/lib/cloudflare';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

export const authConfig = {
  provider: (process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'basic') as 'auth0' | 'basic',
  auth0: {
    domain: process.env.AUTH0_DOMAIN || '',
    clientId: process.env.AUTH0_CLIENT_ID || '',
    clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
    audience: process.env.AUTH0_AUDIENCE || '',
  },
  basic: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  session: {
    maxAge: 60 * 60 * 24 * 7,
  },
};

// -----------------------------------------------------------------------------
// KV Storage Keys
// -----------------------------------------------------------------------------

const KV_KEYS = {
  USERS: 'ctf:users',
  PASSWORDS: 'ctf:passwords',
};

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface StoredData {
  users: User[];
  passwords: Record<string, string>;
}

// KV Namespace type (from Cloudflare)
interface KVNamespace {
  get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<any>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expiration?: number; expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

// -----------------------------------------------------------------------------
// Default Data (loaded from environment variables for security)
// -----------------------------------------------------------------------------

function getDefaultUsers(): User[] {
  const adminEmail = getEnv('ADMIN_EMAIL') || 'admin@localhost';

  return [
    {
      id: 'admin-1',
      email: adminEmail,
      displayName: 'Admin',
      role: 'superadmin',
      status: 'active',
      totalScore: 0,
      levelsCompleted: 0,
      totalAttempts: 0,
      createdAt: new Date('2024-01-01'),
      authProvider: 'basic',
    },
  ];
}

function getDefaultPasswords(): Record<string, string> {
  const adminEmail = getEnv('ADMIN_EMAIL') || 'admin@localhost';
  const adminPassword = getEnv('ADMIN_PASSWORD') || '';

  // Only return defaults if both email and password are set
  if (!adminEmail || !adminPassword) {
    return {};
  }

  return {
    [adminEmail]: adminPassword,
  };
}

// -----------------------------------------------------------------------------
// KV Helper Functions
// -----------------------------------------------------------------------------

async function getUsers(kv: KVNamespace): Promise<User[]> {
  try {
    const data = await kv.get(KV_KEYS.USERS, { type: 'json' });
    if (!data) {
      // Initialize with defaults
      await kv.put(KV_KEYS.USERS, JSON.stringify(getDefaultUsers()));
      return getDefaultUsers();
    }
    // Convert date strings back to Date objects
    return data.map((u: any) => ({
      ...u,
      createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
      lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : undefined,
      lastActiveAt: u.lastActiveAt ? new Date(u.lastActiveAt) : undefined,
      suspendedAt: u.suspendedAt ? new Date(u.suspendedAt) : undefined,
    }));
  } catch (error) {
    console.error('Error loading users from KV:', error);
    return getDefaultUsers();
  }
}

async function saveUsers(kv: KVNamespace, users: User[]): Promise<void> {
  try {
    await kv.put(KV_KEYS.USERS, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users to KV:', error);
    throw error; // Re-throw to allow callers to handle
  }
}

async function getPasswords(kv: KVNamespace): Promise<Record<string, string>> {
  try {
    const data = await kv.get(KV_KEYS.PASSWORDS, { type: 'json' });
    if (!data) {
      await kv.put(KV_KEYS.PASSWORDS, JSON.stringify(getDefaultPasswords()));
      return getDefaultPasswords();
    }
    return data;
  } catch (error) {
    console.error('Error loading passwords from KV:', error);
    return getDefaultPasswords();
  }
}

async function savePasswords(kv: KVNamespace, passwords: Record<string, string>): Promise<void> {
  try {
    await kv.put(KV_KEYS.PASSWORDS, JSON.stringify(passwords));
  } catch (error) {
    console.error('Error saving passwords to KV:', error);
    throw error; // Re-throw to allow callers to handle
  }
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl,
  };
}

// -----------------------------------------------------------------------------
// Authentication Functions
// -----------------------------------------------------------------------------

export async function registerUser(
  kv: KVNamespace,
  email: string,
  password: string,
  displayName: string
): Promise<{ success: boolean; user?: SessionUser; error?: string }> {
  const users = await getUsers(kv);
  const passwords = await getPasswords(kv);
  const normalizedEmail = email.toLowerCase();

  const existingUser = users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existingUser) {
    return { success: false, error: 'Email already registered' };
  }

  // Check for orphaned password (password exists but no user record)
  // This can happen if a previous registration partially failed
  const hasOrphanedPassword = passwords[normalizedEmail] !== undefined;
  if (hasOrphanedPassword) {
    console.warn(`Cleaning up orphaned password for email: ${normalizedEmail}`);
    delete passwords[normalizedEmail];
    try {
      await savePasswords(kv, passwords);
    } catch (error) {
      console.error('Failed to clean up orphaned password:', error);
      // Continue with registration anyway
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Invalid email format' };
  }

  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }

  const newUser: User = {
    id: `user-${Date.now()}`,
    email: normalizedEmail,
    displayName,
    role: 'player',
    status: 'active',
    totalScore: 0,
    levelsCompleted: 0,
    totalAttempts: 0,
    createdAt: new Date(),
    authProvider: 'basic',
  };

  // Save user first, then password
  // If user save fails, don't proceed to password
  // If password save fails, roll back the user
  try {
    users.push(newUser);
    await saveUsers(kv, users);
  } catch (error) {
    console.error('Failed to save user during registration:', error);
    return { success: false, error: 'Registration failed. Please try again.' };
  }

  try {
    passwords[normalizedEmail] = password;
    await savePasswords(kv, passwords);
  } catch (error) {
    // Password save failed - roll back user to avoid orphaned user record
    console.error('Failed to save password during registration, rolling back user:', error);
    const userIndex = users.findIndex(u => u.id === newUser.id);
    if (userIndex !== -1) {
      users.splice(userIndex, 1);
      try {
        await saveUsers(kv, users);
      } catch (rollbackError) {
        console.error('Failed to rollback user after password save failure:', rollbackError);
      }
    }
    return { success: false, error: 'Registration failed. Please try again.' };
  }

  return {
    success: true,
    user: toSessionUser(newUser),
  };
}

export async function loginWithCredentials(
  kv: KVNamespace,
  email: string,
  password: string
): Promise<{ success: boolean; user?: SessionUser; error?: string }> {
  const users = await getUsers(kv);
  const passwords = await getPasswords(kv);

  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return { success: false, error: 'Invalid email or password' };
  }

  const storedPassword = passwords[email.toLowerCase()];
  if (storedPassword !== password) {
    return { success: false, error: 'Invalid email or password' };
  }

  if (user.status === 'suspended') {
    return {
      success: false,
      error: `Account suspended: ${user.suspendedReason || 'Contact administrator'}`
    };
  }

  if (user.status === 'banned') {
    return { success: false, error: 'Account has been banned' };
  }

  user.lastLoginAt = new Date();
  await saveUsers(kv, users);

  return {
    success: true,
    user: toSessionUser(user),
  };
}

/**
 * Change user password
 */
export async function changePassword(
  kv: KVNamespace,
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const users = await getUsers(kv);
  const passwords = await getPasswords(kv);

  const user = users.find(u => u.id === userId);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Verify current password
  const storedPassword = passwords[user.email.toLowerCase()];
  if (storedPassword !== currentPassword) {
    return { success: false, error: 'Current password is incorrect' };
  }

  // Validate new password
  if (newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters' };
  }

  if (currentPassword === newPassword) {
    return { success: false, error: 'New password must be different from current password' };
  }

  // Update password
  passwords[user.email.toLowerCase()] = newPassword;
  await savePasswords(kv, passwords);

  return { success: true };
}

// -----------------------------------------------------------------------------
// User Management Functions (Admin)
// -----------------------------------------------------------------------------

export async function getAllUsers(
  kv: KVNamespace,
  options?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    status?: UserStatus;
  }
): Promise<{ users: User[]; total: number }> {
  const users = await getUsers(kv);
  let filteredUsers = [...users];

  if (options?.search) {
    const search = options.search.toLowerCase();
    filteredUsers = filteredUsers.filter(u =>
      u.email.toLowerCase().includes(search) ||
      u.displayName.toLowerCase().includes(search)
    );
  }

  if (options?.role) {
    filteredUsers = filteredUsers.filter(u => u.role === options.role);
  }

  if (options?.status) {
    filteredUsers = filteredUsers.filter(u => u.status === options.status);
  }

  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const start = (page - 1) * limit;
  const paginatedUsers = filteredUsers.slice(start, start + limit);

  return {
    users: paginatedUsers,
    total: filteredUsers.length,
  };
}

export async function getUserById(kv: KVNamespace, userId: string): Promise<User | null> {
  const users = await getUsers(kv);
  return users.find(u => u.id === userId) || null;
}

export async function updateUser(
  kv: KVNamespace,
  userId: string,
  updates: Partial<Pick<User, 'displayName' | 'email' | 'role' | 'status'>>
): Promise<{ success: boolean; user?: User; error?: string }> {
  const users = await getUsers(kv);
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    return { success: false, error: 'User not found' };
  }

  users[userIndex] = {
    ...users[userIndex],
    ...updates,
  };

  await saveUsers(kv, users);

  return { success: true, user: users[userIndex] };
}

export async function suspendUser(
  kv: KVNamespace,
  userId: string,
  reason: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const users = await getUsers(kv);
  const user = users.find(u => u.id === userId);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (user.role === 'superadmin') {
    return { success: false, error: 'Cannot suspend superadmin' };
  }

  user.status = 'suspended';
  user.suspendedAt = new Date();
  user.suspendedReason = reason;
  user.suspendedBy = adminId;

  await saveUsers(kv, users);

  return { success: true };
}

export async function unsuspendUser(
  kv: KVNamespace,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const users = await getUsers(kv);
  const user = users.find(u => u.id === userId);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  user.status = 'active';
  user.suspendedAt = undefined;
  user.suspendedReason = undefined;
  user.suspendedBy = undefined;

  await saveUsers(kv, users);

  return { success: true };
}

export async function banUser(
  kv: KVNamespace,
  userId: string,
  reason: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const users = await getUsers(kv);
  const user = users.find(u => u.id === userId);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (user.role === 'superadmin' || user.role === 'admin') {
    return { success: false, error: 'Cannot ban admin users' };
  }

  user.status = 'banned';
  user.suspendedAt = new Date();
  user.suspendedReason = reason;
  user.suspendedBy = adminId;

  await saveUsers(kv, users);

  return { success: true };
}

export async function deleteUser(
  kv: KVNamespace,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const users = await getUsers(kv);
  const passwords = await getPasswords(kv);
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    return { success: false, error: 'User not found' };
  }

  const user = users[userIndex];

  if (user.role === 'superadmin') {
    return { success: false, error: 'Cannot delete superadmin' };
  }

  users.splice(userIndex, 1);
  delete passwords[user.email.toLowerCase()];

  await saveUsers(kv, users);
  await savePasswords(kv, passwords);

  return { success: true };
}

export async function changeUserRole(
  kv: KVNamespace,
  userId: string,
  newRole: UserRole,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const users = await getUsers(kv);
  const user = users.find(u => u.id === userId);
  const admin = users.find(u => u.id === adminId);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (!admin) {
    return { success: false, error: 'Admin not found' };
  }

  // Only superadmins can promote to admin or superadmin
  if ((newRole === 'admin' || newRole === 'superadmin') && admin.role !== 'superadmin') {
    return { success: false, error: 'Only superadmin can promote to admin or superadmin' };
  }

  if (user.role === 'superadmin') {
    return { success: false, error: 'Cannot change superadmin role' };
  }

  user.role = newRole;

  await saveUsers(kv, users);

  return { success: true };
}

// -----------------------------------------------------------------------------
// Leaderboard Functions
// -----------------------------------------------------------------------------

export async function getLeaderboard(
  kv: KVNamespace,
  options?: {
    limit?: number;
    timeframe?: 'all' | 'weekly' | 'daily';
  }
): Promise<User[]> {
  const users = await getUsers(kv);
  // Show all active users with scores (including admins who play)
  let leaderboard = users
    .filter(u => u.status === 'active' && u.totalScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore);

  const limit = options?.limit || 100;
  return leaderboard.slice(0, limit);
}

export async function updateUserScore(
  kv: KVNamespace,
  userId: string,
  pointsEarned: number,
  levelCompleted: number,
  timeSpent: number
): Promise<{ success: boolean; alreadyCompleted?: boolean }> {
  const users = await getUsers(kv);
  const user = users.find(u => u.id === userId);
  if (!user) return { success: false };

  // Initialize completedLevelIds if it doesn't exist
  if (!user.completedLevelIds) {
    user.completedLevelIds = [];
  }

  // Check if level was already completed - no duplicate points
  if (user.completedLevelIds.includes(levelCompleted)) {
    // Still count the attempt but don't award points
    user.totalAttempts += 1;
    await saveUsers(kv, users);
    return { success: true, alreadyCompleted: true };
  }

  // First time completing this level - award points
  user.completedLevelIds.push(levelCompleted);
  user.totalScore += pointsEarned;
  user.totalAttempts += 1;

  if (!user.levelsCompleted || levelCompleted > user.levelsCompleted) {
    user.levelsCompleted = levelCompleted;
  }

  if (!user.bestTime || timeSpent < user.bestTime) {
    user.bestTime = timeSpent;
  }

  await saveUsers(kv, users);
  return { success: true, alreadyCompleted: false };
}

// -----------------------------------------------------------------------------
// Reset Functions (Admin)
// -----------------------------------------------------------------------------

/**
 * Reset all stats for all users (scores, attempts, levels completed)
 */
export async function resetAllUserStats(kv: KVNamespace): Promise<{ success: boolean; usersReset: number }> {
  const users = await getUsers(kv);

  let usersReset = 0;
  for (const user of users) {
    user.totalScore = 0;
    user.levelsCompleted = 0;
    user.completedLevelIds = [];
    user.totalAttempts = 0;
    user.bestTime = undefined;
    usersReset++;
  }

  await saveUsers(kv, users);

  return { success: true, usersReset };
}

/**
 * Reset stats for a specific user
 */
export async function resetUserStats(
  kv: KVNamespace,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const users = await getUsers(kv);
  const user = users.find(u => u.id === userId);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  user.totalScore = 0;
  user.levelsCompleted = 0;
  user.completedLevelIds = [];
  user.totalAttempts = 0;
  user.bestTime = undefined;

  await saveUsers(kv, users);

  return { success: true };
}

// -----------------------------------------------------------------------------
// Activity Tracking
// -----------------------------------------------------------------------------

/**
 * Update user's last active timestamp
 * Called on user activity (chat messages, score submissions)
 */
export async function updateUserActivity(
  kv: KVNamespace,
  userId: string
): Promise<void> {
  const users = await getUsers(kv);
  const user = users.find(u => u.id === userId);

  if (user) {
    user.lastActiveAt = new Date();
    await saveUsers(kv, users);
  }
}
