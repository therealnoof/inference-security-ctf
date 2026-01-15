// =============================================================================
// Admin Dashboard Page
// =============================================================================
// Admin interface for managing users, viewing analytics, and system configuration.
// Only accessible to users with admin or superadmin roles.
//
// Features:
// - User list with search and filters
// - Suspend/unsuspend/ban/delete users
// - Change user roles
// - View analytics and attempt logs
// - Export data
// =============================================================================

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  MoreVertical,
  Shield,
  ShieldOff,
  Trash2,
  UserCog,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  BarChart3,
  Activity,
  Clock,
  Trophy,
  Flag,
  Key,
  Eye,
  EyeOff,
  Save,
  Bot,
  ArrowLeft,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/form-components";
import { User, UserRole, UserStatus, hasPermission } from "@/types/auth";
import { cn, formatRelativeTime } from "@/lib/utils";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalAttempts: number;
  successfulAttempts: number;
  averageScore: number;
}

// -----------------------------------------------------------------------------
// User Row Component
// -----------------------------------------------------------------------------

interface UserRowProps {
  user: User;
  onAction: (action: string, userId: string) => void;
  currentUserRole: UserRole;
}

function UserRow({ user, onAction, currentUserRole }: UserRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, openUpward: false });
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const handleMenuOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuHeight = 200; // Approximate menu height
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < menuHeight;

      setMenuPosition({
        top: openUpward ? rect.top - menuHeight : rect.bottom,
        left: rect.right - 192, // 192px = w-48 (menu width)
        openUpward,
      });
    }
    setMenuOpen(!menuOpen);
  };

  const statusColors: Record<UserStatus, string> = {
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    suspended: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    banned: "bg-red-500/20 text-red-400 border-red-500/30",
    pending: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  
  const roleColors: Record<UserRole, string> = {
    player: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    moderator: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    admin: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    superadmin: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  
  const canManage = currentUserRole === 'superadmin' || 
    (currentUserRole === 'admin' && user.role !== 'admin' && user.role !== 'superadmin');
  
  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/50">
      {/* User Info */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-200">{user.displayName}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      </td>
      
      {/* Role */}
      <td className="px-4 py-3">
        <span className={cn("px-2 py-1 rounded-full text-xs font-medium border", roleColors[user.role])}>
          {user.role}
        </span>
      </td>
      
      {/* Status */}
      <td className="px-4 py-3">
        <span className={cn("px-2 py-1 rounded-full text-xs font-medium border", statusColors[user.status])}>
          {user.status}
        </span>
      </td>
      
      {/* Score */}
      <td className="px-4 py-3 text-right">
        <span className="font-medium text-gray-200">{user.totalScore.toLocaleString()}</span>
      </td>
      
      {/* Levels */}
      <td className="px-4 py-3 text-center">
        <span className="text-gray-400">{user.levelsCompleted}/6</span>
      </td>
      
      {/* Last Active */}
      <td className="px-4 py-3 text-right">
        <span className="text-sm text-gray-500">
          {user.lastLoginAt ? formatRelativeTime(new Date(user.lastLoginAt)) : 'Never'}
        </span>
      </td>
      
      {/* Actions */}
      <td className="px-4 py-3 text-right">
        {canManage && (
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={handleMenuOpen}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  className="fixed w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1"
                  style={{ top: menuPosition.top, left: menuPosition.left }}
                >
                  {user.status === 'active' ? (
                    <button
                      onClick={() => { onAction('suspend', user.id); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                    >
                      <ShieldOff className="h-4 w-4 text-amber-500" />
                      Suspend User
                    </button>
                  ) : user.status === 'suspended' ? (
                    <button
                      onClick={() => { onAction('unsuspend', user.id); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Shield className="h-4 w-4 text-green-500" />
                      Unsuspend User
                    </button>
                  ) : null}
                  
                  {user.status !== 'banned' && (
                    <button
                      onClick={() => { onAction('ban', user.id); setMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Ban className="h-4 w-4 text-red-500" />
                      Ban User
                    </button>
                  )}
                  
                  <button
                    onClick={() => { onAction('changeRole', user.id); setMenuOpen(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                  >
                    <UserCog className="h-4 w-4 text-blue-500" />
                    Change Role
                  </button>
                  
                  <div className="border-t border-gray-700 my-1" />
                  
                  <button
                    onClick={() => { onAction('delete', user.id); setMenuOpen(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete User
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

// -----------------------------------------------------------------------------
// Confirmation Modal Component
// -----------------------------------------------------------------------------

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  confirmVariant: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
  showReasonInput?: boolean;
  reason?: string;
  onReasonChange?: (reason: string) => void;
}

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  confirmVariant,
  onConfirm,
  onCancel,
  showReasonInput,
  reason,
  onReasonChange,
}: ConfirmModalProps) {
  if (!isOpen) return null;
  
  const buttonColors = {
    danger: "bg-red-600 hover:bg-red-700",
    warning: "bg-amber-600 hover:bg-amber-700",
    default: "bg-blue-600 hover:bg-blue-700",
  };
  
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onCancel} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-gray-400 mb-4">{message}</p>
          
          {showReasonInput && (
            <div className="mb-4">
              <Label htmlFor="reason" className="text-gray-300">Reason</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => onReasonChange?.(e.target.value)}
                placeholder="Enter reason for this action..."
                className="mt-1"
              />
            </div>
          )}
          
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <button
              onClick={onConfirm}
              className={cn(
                "px-4 py-2 rounded-lg font-medium text-white transition-colors",
                buttonColors[confirmVariant]
              )}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// -----------------------------------------------------------------------------
// Stats Card Component
// -----------------------------------------------------------------------------

function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  color = "blue" 
}: { 
  title: string; 
  value: string | number; 
  icon: any;
  trend?: string;
  color?: "blue" | "green" | "amber" | "red";
}) {
  const colorClasses = {
    blue: "text-blue-500 bg-blue-500/10",
    green: "text-green-500 bg-green-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    red: "text-red-500 bg-red-500/10",
  };
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {trend && (
              <p className="text-xs text-green-500 mt-1">{trend}</p>
            )}
          </div>
          <div className={cn("p-3 rounded-lg", colorClasses[color])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// API Key Management Component
// -----------------------------------------------------------------------------

interface ApiKeyConfig {
  anthropicKey: string;
  openaiKey: string;
  guardrailsKey: string;
  defaultProvider: 'anthropic' | 'openai';
  enabled: boolean;
}

function ApiKeyManagement() {
  const [config, setConfig] = useState<ApiKeyConfig>({
    anthropicKey: '',
    openaiKey: '',
    guardrailsKey: '',
    defaultProvider: 'anthropic',
    enabled: false,
  });
  const [showKeys, setShowKeys] = useState({
    anthropic: false,
    openai: false,
    guardrails: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load saved config from API on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          setConfig({
            anthropicKey: data.anthropicKey || '',
            openaiKey: data.openaiKey || '',
            guardrailsKey: data.guardrailsKey || '',
            defaultProvider: data.defaultProvider || 'anthropic',
            enabled: data.enabled || false,
          });
        }
      } catch (e) {
        console.error('Failed to load config:', e);
      }
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        throw new Error('Failed to save config');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save config:', error);
    }
    setSaving(false);
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return key.slice(0, 4) + '••••••••' + key.slice(-4);
  };

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Key className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-white">System API Keys</CardTitle>
              <CardDescription>
                Configure API keys for all users (removes BYOK requirement)
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Enable System Keys</span>
            <button
              onClick={() => setConfig(c => ({ ...c, enabled: !c.enabled }))}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors",
                config.enabled ? "bg-amber-500" : "bg-gray-700"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                  config.enabled ? "left-7" : "left-1"
                )}
              />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {config.enabled && (
          <>
            {/* Default Provider Selection */}
            <div className="space-y-2">
              <Label className="text-gray-300">Default LLM Provider</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfig(c => ({ ...c, defaultProvider: 'anthropic' }))}
                  className={cn(
                    "flex-1 p-3 rounded-lg border transition-all flex items-center justify-center gap-2",
                    config.defaultProvider === 'anthropic'
                      ? "border-amber-500 bg-amber-500/10 text-amber-400"
                      : "border-gray-700 text-gray-400 hover:border-gray-600"
                  )}
                >
                  <Bot className="h-4 w-4" />
                  Anthropic (Claude)
                </button>
                <button
                  onClick={() => setConfig(c => ({ ...c, defaultProvider: 'openai' }))}
                  className={cn(
                    "flex-1 p-3 rounded-lg border transition-all flex items-center justify-center gap-2",
                    config.defaultProvider === 'openai'
                      ? "border-amber-500 bg-amber-500/10 text-amber-400"
                      : "border-gray-700 text-gray-400 hover:border-gray-600"
                  )}
                >
                  <Bot className="h-4 w-4" />
                  OpenAI (GPT)
                </button>
              </div>
            </div>

            {/* Anthropic API Key */}
            <div className="space-y-2">
              <Label className="text-gray-300">Anthropic API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKeys.anthropic ? "text" : "password"}
                    value={config.anthropicKey}
                    onChange={(e) => setConfig(c => ({ ...c, anthropicKey: e.target.value }))}
                    placeholder="sk-ant-api03-..."
                    className="pr-10 bg-gray-900 border-gray-700"
                  />
                  <button
                    onClick={() => setShowKeys(s => ({ ...s, anthropic: !s.anthropic }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showKeys.anthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {config.anthropicKey && !showKeys.anthropic && (
                <p className="text-xs text-gray-500">Key: {maskKey(config.anthropicKey)}</p>
              )}
            </div>

            {/* OpenAI API Key */}
            <div className="space-y-2">
              <Label className="text-gray-300">OpenAI API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKeys.openai ? "text" : "password"}
                    value={config.openaiKey}
                    onChange={(e) => setConfig(c => ({ ...c, openaiKey: e.target.value }))}
                    placeholder="sk-..."
                    className="pr-10 bg-gray-900 border-gray-700"
                  />
                  <button
                    onClick={() => setShowKeys(s => ({ ...s, openai: !s.openai }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showKeys.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {config.openaiKey && !showKeys.openai && (
                <p className="text-xs text-gray-500">Key: {maskKey(config.openaiKey)}</p>
              )}
            </div>

            {/* F5 Guardrails API Key */}
            <div className="space-y-2">
              <Label className="text-gray-300">F5 Guardrails API Key (for Level 6)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKeys.guardrails ? "text" : "password"}
                    value={config.guardrailsKey}
                    onChange={(e) => setConfig(c => ({ ...c, guardrailsKey: e.target.value }))}
                    placeholder="Enter F5 Guardrails API key..."
                    className="pr-10 bg-gray-900 border-gray-700"
                  />
                  <button
                    onClick={() => setShowKeys(s => ({ ...s, guardrails: !s.guardrails }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showKeys.guardrails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {config.guardrailsKey && !showKeys.guardrails && (
                <p className="text-xs text-gray-500">Key: {maskKey(config.guardrailsKey)}</p>
              )}
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-500">
                When enabled, users won't need to provide their own API keys.
              </p>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : saved ? (
                  <CheckCircle className="h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saved ? "Saved!" : "Save Configuration"}
              </Button>
            </div>
          </>
        )}

        {!config.enabled && (
          <p className="text-sm text-gray-500 text-center py-4">
            Enable system API keys to allow users to play without providing their own keys.
            <br />
            <span className="text-amber-500/70">Currently using BYOK (Bring Your Own Key) mode.</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Main Admin Dashboard Component
// -----------------------------------------------------------------------------

export default function AdminDashboard() {
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Modal state
  const [modalAction, setModalAction] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState("");
  
  // Current user (would come from auth context in production)
  const currentUserRole: UserRole = 'superadmin';
  
  // Stats (would be calculated from real data)
  const stats: AdminStats = {
    totalUsers: 156,
    activeUsers: 142,
    suspendedUsers: 8,
    totalAttempts: 2847,
    successfulAttempts: 423,
    averageScore: 1850,
  };
  
  // Load users
  useEffect(() => {
    loadUsers();
  }, [searchQuery, roleFilter, statusFilter, currentPage]);
  
  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      if (searchQuery) params.set('search', searchQuery);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error('Failed to fetch users');

      const result = await response.json();
      setUsers(result.users);
      setTotalUsers(result.total);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
    setLoading(false);
  };
  
  // Handle user actions
  const handleAction = (action: string, userId: string) => {
    setSelectedUserId(userId);
    setModalAction(action);
    setActionReason("");
  };
  
  const executeAction = async () => {
    if (!selectedUserId || !modalAction) return;

    try {
      if (modalAction === 'delete') {
        // DELETE request
        const response = await fetch(`/api/admin/users/${selectedUserId}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete user');
      } else {
        // PATCH request for suspend/unsuspend/ban
        const response = await fetch(`/api/admin/users/${selectedUserId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: modalAction,
            reason: actionReason || undefined,
          }),
        });
        if (!response.ok) throw new Error(`Failed to ${modalAction} user`);
      }

      // Refresh users list
      loadUsers();
    } catch (error) {
      console.error('Action failed:', error);
    }

    setModalAction(null);
    setSelectedUserId(null);
  };
  
  const totalPages = Math.ceil(totalUsers / itemsPerPage);
  
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to CTF</span>
            </Link>
            <div className="h-6 w-px bg-gray-700" />
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-amber-500" />
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/leaderboard">
              <Button variant="ghost" className="text-gray-400 hover:text-white">
                <Trophy className="h-4 w-4 mr-2 text-yellow-500" />
                <span className="hidden sm:inline">Leaderboard</span>
              </Button>
            </Link>
            <Button variant="outline" onClick={loadUsers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Export users as CSV
                const headers = ['ID', 'Display Name', 'Email', 'Role', 'Status', 'Score', 'Levels Completed', 'Created At'];
                const csvRows = [headers.join(',')];

                users.forEach(user => {
                  const row = [
                    user.id,
                    `"${user.displayName}"`,
                    user.email,
                    user.role,
                    user.status,
                    user.totalScore,
                    user.levelsCompleted,
                    user.createdAt ? new Date(user.createdAt).toISOString() : ''
                  ];
                  csvRows.push(row.join(','));
                });

                const csvContent = csvRows.join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ctf-users-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard 
            title="Total Users" 
            value={stats.totalUsers} 
            icon={Users}
            trend="+12 this week"
            color="blue"
          />
          <StatsCard 
            title="Active Users" 
            value={stats.activeUsers} 
            icon={Activity}
            color="green"
          />
          <StatsCard 
            title="Total Attempts" 
            value={stats.totalAttempts.toLocaleString()} 
            icon={Flag}
            color="amber"
          />
          <StatsCard
            title="Avg Score"
            value={stats.averageScore.toLocaleString()}
            icon={Trophy}
            color="blue"
          />
        </div>

        {/* API Key Management */}
        <ApiKeyManagement />

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>{totalUsers} total users</CardDescription>
              </div>
              
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="pl-9 w-48"
                  />
                </div>
                
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="player">Player</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <th className="px-4 py-3 text-sm font-medium text-gray-500">User</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500">Role</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500 text-right">Score</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500 text-center">Levels</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500 text-right">Last Active</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <UserRow 
                        key={user.id} 
                        user={user} 
                        onAction={handleAction}
                        currentUserRole={currentUserRole}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
                <p className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={modalAction === 'suspend'}
        title="Suspend User"
        message="This user will be unable to log in until unsuspended. They will see the suspension reason when attempting to log in."
        confirmText="Suspend User"
        confirmVariant="warning"
        onConfirm={executeAction}
        onCancel={() => setModalAction(null)}
        showReasonInput
        reason={actionReason}
        onReasonChange={setActionReason}
      />
      
      <ConfirmModal
        isOpen={modalAction === 'unsuspend'}
        title="Unsuspend User"
        message="This will restore the user's access to their account."
        confirmText="Unsuspend User"
        confirmVariant="default"
        onConfirm={executeAction}
        onCancel={() => setModalAction(null)}
      />
      
      <ConfirmModal
        isOpen={modalAction === 'ban'}
        title="Ban User"
        message="This will permanently ban the user. This action should only be used for serious violations."
        confirmText="Ban User"
        confirmVariant="danger"
        onConfirm={executeAction}
        onCancel={() => setModalAction(null)}
        showReasonInput
        reason={actionReason}
        onReasonChange={setActionReason}
      />
      
      <ConfirmModal
        isOpen={modalAction === 'delete'}
        title="Delete User"
        message="This will permanently delete the user and all their data. This action cannot be undone."
        confirmText="Delete User"
        confirmVariant="danger"
        onConfirm={executeAction}
        onCancel={() => setModalAction(null)}
      />
    </div>
  );
}
