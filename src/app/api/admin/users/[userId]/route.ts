// =============================================================================
// Admin API Routes - Individual User Actions
// =============================================================================
// Routes for actions on a specific user:
// - GET: Get user details
// - PATCH: Update user (suspend, unsuspend, change role)
// - DELETE: Delete user
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { 
  getUserById,
  updateUser,
  suspendUser, 
  unsuspendUser, 
  banUser, 
  deleteUser, 
  changeUserRole 
} from "@/lib/auth-service";
import { hasPermission, canManageRole, UserRole } from "@/types/auth";

// -----------------------------------------------------------------------------
// Helper: Check Admin Permission
// -----------------------------------------------------------------------------

async function checkAdminPermission(requiredPermission: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { 
      authorized: false, 
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  const userRole = (session.user as any).role as UserRole;
  
  if (!hasPermission(userRole, requiredPermission as any)) {
    return { 
      authorized: false, 
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 })
    };
  }

  return { 
    authorized: true, 
    adminId: (session.user as any).id,
    adminRole: userRole 
  };
}

// -----------------------------------------------------------------------------
// GET /api/admin/users/[userId] - Get User Details
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const auth = await checkAdminPermission('users:view_details');
  if (!auth.authorized) return auth.error;

  try {
    const user = await getUserById(params.userId);
    
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
  { params }: { params: { userId: string } }
) {
  const auth = await checkAdminPermission('users:edit');
  if (!auth.authorized) return auth.error;

  try {
    const body = await request.json();
    const { action, reason, newRole, displayName, email } = body;

    // Get target user to check permissions
    const targetUser = await getUserById(params.userId);
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
        result = await suspendUser(params.userId, reason || 'No reason provided', auth.adminId!);
        break;

      case 'unsuspend':
        if (!hasPermission(auth.adminRole!, 'users:unsuspend')) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        result = await unsuspendUser(params.userId);
        break;

      case 'ban':
        if (!hasPermission(auth.adminRole!, 'users:ban')) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        result = await banUser(params.userId, reason || 'No reason provided', auth.adminId!);
        break;

      case 'change_role':
        if (!hasPermission(auth.adminRole!, 'users:change_role')) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (!newRole) {
          return NextResponse.json({ error: "newRole required" }, { status: 400 });
        }
        result = await changeUserRole(params.userId, newRole, auth.adminId!);
        break;

      case 'update':
        // General update (displayName, email)
        result = await updateUser(params.userId, { displayName, email });
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

    return NextResponse.json({ success: true, user: result.user });
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
  { params }: { params: { userId: string } }
) {
  const auth = await checkAdminPermission('users:delete');
  if (!auth.authorized) return auth.error;

  try {
    // Get target user to check permissions
    const targetUser = await getUserById(params.userId);
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

    const result = await deleteUser(params.userId);

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
