// =============================================================================
// Authentication Service
// =============================================================================
// Handles user authentication with support for:
// - Auth0 (recommended for production)
// - Basic Auth (email/password with JWT)
// - OAuth providers (Google, GitHub) via Auth0
//
// This service provides a unified interface regardless of auth provider.
// User data persists to a JSON file for development convenience.
// =============================================================================

import { User, SessionUser, UserRole, UserStatus } from '@/types/auth';
import * as fs from 'fs';
import * as path from 'path';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

/**
 * Auth configuration from environment variables
 * In production, these should be set in your deployment environment
 */
export const authConfig = {
  // Which provider to use
  provider: (process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'basic') as 'auth0' | 'basic',

  // Auth0 settings
  auth0: {
    domain: process.env.AUTH0_DOMAIN || '',
    clientId: process.env.AUTH0_CLIENT_ID || '',
    clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
    audience: process.env.AUTH0_AUDIENCE || '',
  },

  // Basic auth settings
  basic: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Session settings
  session: {
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  },
};

// -----------------------------------------------------------------------------
// Persistent User Storage
// -----------------------------------------------------------------------------

// Path to the users data file
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

interface StoredData {
  users: User[];
  passwords: Record<string, string>;
}

// Default users for initial setup
const defaultUsers: User[] = [
  {
    id: 'admin-1',
    email: 'admin@llmctf.com',
    displayName: 'Admin',
    role: 'superadmin',
    status: 'active',
    totalScore: 0,
    levelsCompleted: 0,
    totalAttempts: 0,
    createdAt: new Date('2024-01-01'),
    authProvider: 'basic',
  },
  {
    id: 'user-1',
    email: 'player@example.com',
    displayName: 'Demo Player',
    role: 'player',
    status: 'active',
    totalScore: 2450,
    levelsCompleted: 4,
    totalAttempts: 28,
    bestTime: 1965,
    createdAt: new Date('2024-06-15'),
    lastLoginAt: new Date(),
    authProvider: 'basic',
  },
];

const defaultPasswords: Record<string, string> = {
  'admin@llmctf.com': 'admin123',
  'player@example.com': 'player123',
};

/**
 * Load users from file or initialize with defaults
 */
function loadUsers(): StoredData {
  try {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Load from file if it exists
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(data);

      // Convert date strings back to Date objects
      parsed.users = parsed.users.map((u: any) => ({
        ...u,
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
        lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : undefined,
        suspendedAt: u.suspendedAt ? new Date(u.suspendedAt) : undefined,
      }));

      return parsed;
    }
  } catch (error) {
    console.error('Error loading users file:', error);
  }

  // Return defaults if file doesn't exist or has errors
  return {
    users: defaultUsers,
    passwords: defaultPasswords,
  };
}

/**
 * Save users to file
 */
function saveUsers(): void {
  try {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const data: StoredData = {
      users: mockUsers,
      passwords: mockPasswords,
    };

    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving users file:', error);
  }
}

// Initialize from file
const initialData = loadUsers();
let mockUsers: User[] = initialData.users;
let mockPasswords: Record<string, string> = initialData.passwords;

// -----------------------------------------------------------------------------
// Authentication Functions
// -----------------------------------------------------------------------------

/**
 * Register a new user
 */
export async function registerUser(
  email: string,
  password: string,
  displayName: string
): Promise<{ success: boolean; user?: SessionUser; error?: string }> {
  // Check if email already exists
  const existingUser = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return { success: false, error: 'Email already registered' };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Invalid email format' };
  }

  // Validate password strength
  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }

  // Create new user
  const newUser: User = {
    id: `user-${Date.now()}`,
    email: email.toLowerCase(),
    displayName,
    role: 'player',
    status: 'active',
    totalScore: 0,
    levelsCompleted: 0,
    totalAttempts: 0,
    createdAt: new Date(),
    authProvider: 'basic',
  };

  // Store user and password
  mockUsers.push(newUser);
  mockPasswords[email.toLowerCase()] = password; // In production: hash with bcrypt

  // Persist to file
  saveUsers();

  return {
    success: true,
    user: toSessionUser(newUser),
  };
}

/**
 * Login with email and password
 */
export async function loginWithCredentials(
  email: string,
  password: string
): Promise<{ success: boolean; user?: SessionUser; error?: string }> {
  // Reload users from file to get latest data
  const freshData = loadUsers();
  mockUsers = freshData.users;
  mockPasswords = freshData.passwords;

  const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return { success: false, error: 'Invalid email or password' };
  }

  // Check password (in production: use bcrypt.compare)
  const storedPassword = mockPasswords[email.toLowerCase()];
  if (storedPassword !== password) {
    return { success: false, error: 'Invalid email or password' };
  }

  // Check if user is suspended or banned
  if (user.status === 'suspended') {
    return {
      success: false,
      error: `Account suspended: ${user.suspendedReason || 'Contact administrator'}`
    };
  }

  if (user.status === 'banned') {
    return { success: false, error: 'Account has been banned' };
  }

  // Update last login
  user.lastLoginAt = new Date();
  saveUsers();

  return {
    success: true,
    user: toSessionUser(user),
  };
}

/**
 * Convert full User to SessionUser (for JWT/session storage)
 */
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
// User Management Functions (Admin)
// -----------------------------------------------------------------------------

/**
 * Get all users (admin only)
 */
export async function getAllUsers(
  options?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    status?: UserStatus;
  }
): Promise<{ users: User[]; total: number }> {
  // Reload from file to get latest
  const freshData = loadUsers();
  mockUsers = freshData.users;

  let filteredUsers = [...mockUsers];

  // Apply filters
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

  // Pagination
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const start = (page - 1) * limit;
  const paginatedUsers = filteredUsers.slice(start, start + limit);

  return {
    users: paginatedUsers,
    total: filteredUsers.length,
  };
}

/**
 * Get a single user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  return mockUsers.find(u => u.id === userId) || null;
}

/**
 * Update user details
 */
export async function updateUser(
  userId: string,
  updates: Partial<Pick<User, 'displayName' | 'email' | 'role' | 'status'>>
): Promise<{ success: boolean; user?: User; error?: string }> {
  const userIndex = mockUsers.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    return { success: false, error: 'User not found' };
  }

  // Apply updates
  mockUsers[userIndex] = {
    ...mockUsers[userIndex],
    ...updates,
  };

  saveUsers();

  return { success: true, user: mockUsers[userIndex] };
}

/**
 * Suspend a user
 */
export async function suspendUser(
  userId: string,
  reason: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const user = mockUsers.find(u => u.id === userId);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Can't suspend admins or superadmins (unless you're superadmin)
  if (user.role === 'superadmin') {
    return { success: false, error: 'Cannot suspend superadmin' };
  }

  user.status = 'suspended';
  user.suspendedAt = new Date();
  user.suspendedReason = reason;
  user.suspendedBy = adminId;

  saveUsers();

  return { success: true };
}

/**
 * Unsuspend a user
 */
export async function unsuspendUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const user = mockUsers.find(u => u.id === userId);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  user.status = 'active';
  user.suspendedAt = undefined;
  user.suspendedReason = undefined;
  user.suspendedBy = undefined;

  saveUsers();

  return { success: true };
}

/**
 * Ban a user (permanent)
 */
export async function banUser(
  userId: string,
  reason: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const user = mockUsers.find(u => u.id === userId);

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

  saveUsers();

  return { success: true };
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const userIndex = mockUsers.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    return { success: false, error: 'User not found' };
  }

  const user = mockUsers[userIndex];

  if (user.role === 'superadmin') {
    return { success: false, error: 'Cannot delete superadmin' };
  }

  // Remove user
  mockUsers.splice(userIndex, 1);
  delete mockPasswords[user.email.toLowerCase()];

  saveUsers();

  return { success: true };
}

/**
 * Change user role
 */
export async function changeUserRole(
  userId: string,
  newRole: UserRole,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const user = mockUsers.find(u => u.id === userId);
  const admin = mockUsers.find(u => u.id === adminId);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (!admin) {
    return { success: false, error: 'Admin not found' };
  }

  // Only superadmin can promote to admin
  if (newRole === 'admin' && admin.role !== 'superadmin') {
    return { success: false, error: 'Only superadmin can promote to admin' };
  }

  // Can't change superadmin role
  if (user.role === 'superadmin') {
    return { success: false, error: 'Cannot change superadmin role' };
  }

  // Can't promote to superadmin
  if (newRole === 'superadmin') {
    return { success: false, error: 'Cannot promote to superadmin' };
  }

  user.role = newRole;

  saveUsers();

  return { success: true };
}

// -----------------------------------------------------------------------------
// Leaderboard Functions
// -----------------------------------------------------------------------------

/**
 * Get leaderboard data
 */
export async function getLeaderboard(
  options?: {
    limit?: number;
    timeframe?: 'all' | 'weekly' | 'daily';
  }
): Promise<User[]> {
  let users = mockUsers
    .filter(u => u.status === 'active' && u.role === 'player')
    .sort((a, b) => b.totalScore - a.totalScore);

  // TODO: Add timeframe filtering when we have attempt timestamps

  const limit = options?.limit || 100;
  return users.slice(0, limit);
}

/**
 * Update user score after completing a level
 */
export async function updateUserScore(
  userId: string,
  pointsEarned: number,
  levelCompleted: number,
  timeSpent: number
): Promise<void> {
  const user = mockUsers.find(u => u.id === userId);
  if (!user) return;

  user.totalScore += pointsEarned;
  user.totalAttempts += 1;

  if (!user.levelsCompleted || levelCompleted > user.levelsCompleted) {
    user.levelsCompleted = levelCompleted;
  }

  if (!user.bestTime || timeSpent < user.bestTime) {
    user.bestTime = timeSpent;
  }

  saveUsers();
}
