// =============================================================================
// Admin API Routes - User Management
// =============================================================================
// These API routes handle admin operations like listing and managing users.
// All routes require admin or superadmin role.
// =============================================================================

export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import {
  getAllUsers,
  suspendUser,
  unsuspendUser,
  banUser,
  deleteUser,
  changeUserRole
} from "@/lib/auth-service";
import { getKV } from "@/lib/cloudflare";
import { hasPermission, UserRole, UserStatus } from "@/types/auth";

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
      userId: payload.id,
      userRole: payload.role as UserRole
    };
  } catch {
    return {
      authorized: false,
      error: NextResponse.json({ error: "Invalid token" }, { status: 401 })
    };
  }
}

// -----------------------------------------------------------------------------
// GET /api/admin/users - List Users
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const auth = await checkAdminPermission(request, 'users:view_all');
  if (!auth.authorized) return auth.error;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || undefined;
  const role = searchParams.get('role') as UserRole | undefined;
  const status = searchParams.get('status') as UserStatus | undefined;

  try {
    const kv = getKV();
    const result = await getAllUsers(kv, {
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
// POST /api/admin/users - Bulk Actions
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await checkAdminPermission(request, 'users:edit');
  if (!auth.authorized) return auth.error;

  try {
    const body = await request.json();
    const { action, userIds, reason, newRole } = body;
    const kv = getKV();

    if (action && userIds && Array.isArray(userIds)) {
      const results = [];

      for (const userId of userIds) {
        let result;

        switch (action) {
          case 'suspend':
            result = await suspendUser(kv, userId, reason || 'Bulk action', auth.userId!);
            break;
          case 'unsuspend':
            result = await unsuspendUser(kv, userId);
            break;
          case 'ban':
            result = await banUser(kv, userId, reason || 'Bulk action', auth.userId!);
            break;
          case 'delete':
            result = await deleteUser(kv, userId);
            break;
          case 'change_role':
            if (!newRole) {
              return NextResponse.json(
                { error: "newRole required for change_role action" },
                { status: 400 }
              );
            }
            result = await changeUserRole(kv, userId, newRole, auth.userId!);
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
