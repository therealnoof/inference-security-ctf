// =============================================================================
// Admin API Routes - User Management
// =============================================================================
// These API routes handle admin operations like:
// - List all users (with filtering/pagination)
// - Suspend/unsuspend users
// - Ban users
// - Delete users
// - Change user roles
//
// All routes require admin or superadmin role.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { 
  getAllUsers, 
  getUserById,
  suspendUser, 
  unsuspendUser, 
  banUser, 
  deleteUser, 
  changeUserRole 
} from "@/lib/auth-service";
import { hasPermission, UserRole, UserStatus } from "@/types/auth";

// -----------------------------------------------------------------------------
// Helper: Check Admin Permission
// -----------------------------------------------------------------------------

async function checkAdminPermission(requiredPermission: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { 
      authorized: false, 
      error: NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      )
    };
  }

  const userRole = (session.user as any).role as UserRole;
  
  if (!hasPermission(userRole, requiredPermission as any)) {
    return { 
      authorized: false, 
      error: NextResponse.json(
        { error: "Forbidden: Insufficient permissions" }, 
        { status: 403 }
      )
    };
  }

  return { 
    authorized: true, 
    userId: (session.user as any).id,
    userRole 
  };
}

// -----------------------------------------------------------------------------
// GET /api/admin/users - List Users
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // Check permission
  const auth = await checkAdminPermission('users:view_all');
  if (!auth.authorized) return auth.error;

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || undefined;
  const role = searchParams.get('role') as UserRole | undefined;
  const status = searchParams.get('status') as UserStatus | undefined;

  try {
    const result = await getAllUsers({
      page,
      limit,
      search,
      role: role && role !== 'all' as any ? role : undefined,
      status: status && status !== 'all' as any ? status : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// -----------------------------------------------------------------------------
// POST /api/admin/users - Bulk Actions or Create User
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await checkAdminPermission('users:edit');
  if (!auth.authorized) return auth.error;

  try {
    const body = await request.json();
    const { action, userIds, reason, newRole } = body;

    // Handle bulk actions
    if (action && userIds && Array.isArray(userIds)) {
      const results = [];

      for (const userId of userIds) {
        let result;
        
        switch (action) {
          case 'suspend':
            result = await suspendUser(userId, reason || 'Bulk action', auth.userId!);
            break;
          case 'unsuspend':
            result = await unsuspendUser(userId);
            break;
          case 'ban':
            result = await banUser(userId, reason || 'Bulk action', auth.userId!);
            break;
          case 'delete':
            result = await deleteUser(userId);
            break;
          case 'change_role':
            if (!newRole) {
              return NextResponse.json(
                { error: "newRole required for change_role action" },
                { status: 400 }
              );
            }
            result = await changeUserRole(userId, newRole, auth.userId!);
            break;
          default:
            return NextResponse.json(
              { error: `Unknown action: ${action}` },
              { status: 400 }
            );
        }

        results.push({ userId, ...result });
      }

      return NextResponse.json({ results });
    }

    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing admin action:', error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}
