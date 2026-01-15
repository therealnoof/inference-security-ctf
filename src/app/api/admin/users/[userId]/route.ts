// =============================================================================
// Admin API Routes - Individual User Actions
// =============================================================================
// Routes for actions on a specific user:
// - GET: Get user details
// - PATCH: Update user (suspend, unsuspend, change role)
// - DELETE: Delete user
// =============================================================================

export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import {
  getUserById,
  updateUser,
  suspendUser,
  unsuspendUser,
  banUser,
  deleteUser,
  changeUserRole
} from "@/lib/auth-service";
import { getKV } from "@/lib/cloudflare";
import { hasPermission, canManageRole, UserRole } from "@/types/auth";

// Check admin permission using cookie-based auth
async function checkAdminPermission(request: NextRequest, requiredPermission: string) {
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return {
      authorized: false,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  try {
    const payload = JSON.parse(atob(token));

    // Check if token is expired
    if (payload.exp < Date.now()) {
      return {
        authorized: false,
        error: NextResponse.json({ error: "Token expired" }, { status: 401 })
      };
    }

    // Check if user is admin or superadmin
    if (payload.role !== 'admin' && payload.role !== 'superadmin') {
      return {
        authorized: false,
        error: NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
      };
    }

    return {
      authorized: true,
      adminId: payload.id,
      adminRole: payload.role as UserRole
    };
  } catch {
    return {
      authorized: false,
      error: NextResponse.json({ error: "Invalid token" }, { status: 401 })
    };
  }
}

// -----------------------------------------------------------------------------
// GET /api/admin/users/[userId] - Get User Details
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const auth = await checkAdminPermission(request, 'users:view_details');
  if (!auth.authorized) return auth.error;

  try {
    const kv = getKV();
    const user = await getUserById(kv, userId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// -----------------------------------------------------------------------------
// PATCH /api/admin/users/[userId] - Update User
// -----------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const auth = await checkAdminPermission(request, 'users:edit');
  if (!auth.authorized) return auth.error;

  try {
    const body = await request.json();
    const { action, reason, newRole, displayName, email } = body;
    const kv = getKV();

    // Get target user to check permissions
    const targetUser = await getUserById(kv, userId);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if admin can manage this user's role
    if (!canManageRole(auth.adminRole!, targetUser.role)) {
      return NextResponse.json(
        { error: "Cannot modify users at or above your role level" },
        { status: 403 }
      );
    }

    let result;

    switch (action) {
      case 'suspend':
        if (!hasPermission(auth.adminRole!, 'users:suspend')) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        result = await suspendUser(kv, userId, reason || 'No reason provided', auth.adminId!);
        break;

      case 'unsuspend':
        if (!hasPermission(auth.adminRole!, 'users:unsuspend')) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        result = await unsuspendUser(kv, userId);
        break;

      case 'ban':
        if (!hasPermission(auth.adminRole!, 'users:ban')) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        result = await banUser(kv, userId, reason || 'No reason provided', auth.adminId!);
        break;

      case 'change_role':
        if (!hasPermission(auth.adminRole!, 'users:change_role')) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (!newRole) {
          return NextResponse.json({ error: "newRole required" }, { status: 400 });
        }
        result = await changeUserRole(kv, userId, newRole, auth.adminId!);
        break;

      case 'update':
        result = await updateUser(kv, userId, { displayName, email });
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      ...('user' in result && result.user ? { user: result.user } : {})
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// -----------------------------------------------------------------------------
// DELETE /api/admin/users/[userId] - Delete User
// -----------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const auth = await checkAdminPermission(request, 'users:delete');
  if (!auth.authorized) return auth.error;

  try {
    const kv = getKV();

    // Get target user to check permissions
    const targetUser = await getUserById(kv, userId);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if admin can manage this user's role
    if (!canManageRole(auth.adminRole!, targetUser.role)) {
      return NextResponse.json(
        { error: "Cannot delete users at or above your role level" },
        { status: 403 }
      );
    }

    const result = await deleteUser(kv, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
