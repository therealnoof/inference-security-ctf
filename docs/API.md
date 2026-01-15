# API Reference

Complete API documentation for the Inference Security CTF platform.

## Overview

All API endpoints run on Cloudflare Edge Runtime and are located under `/api/`.

### Base URL
```
Production: https://your-domain.pages.dev/api
Local:      http://localhost:3000/api
```

### Authentication

Most endpoints require authentication via JWT token stored in an `auth-token` cookie.

```
Cookie: auth-token=<jwt-token>
```

### Response Format

All responses are JSON:

```json
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## Authentication Endpoints

### POST /api/auth/register

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "displayName": "Player One"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "abc123",
    "email": "user@example.com",
    "displayName": "Player One",
    "role": "player"
  }
}
```

**Errors:**
- `400` - Email already exists
- `400` - Invalid email format
- `400` - Password too short (min 8 chars)

---

### POST /api/auth/login

Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "abc123",
    "email": "user@example.com",
    "displayName": "Player One",
    "role": "player",
    "status": "active"
  }
}
```

**Headers Set:**
```
Set-Cookie: auth-token=<jwt>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

**Errors:**
- `401` - Invalid email or password
- `403` - Account suspended
- `403` - Account banned

---

### POST /api/auth/logout

Clear authentication cookie.

**Response (200):**
```json
{
  "success": true
}
```

**Headers Set:**
```
Set-Cookie: auth-token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0
```

---

### POST /api/auth/change-password

Change the current user's password.

**Authentication:** Required

**Request:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Errors:**
- `401` - Not authenticated
- `400` - Current password incorrect
- `400` - New password too short

---

### GET /api/auth/session

Get current session information.

**Authentication:** Required

**Response (200):**
```json
{
  "user": {
    "id": "abc123",
    "email": "user@example.com",
    "displayName": "Player One",
    "role": "player",
    "status": "active",
    "totalScore": 1500,
    "levelsCompleted": 4
  }
}
```

**Errors:**
- `401` - Not authenticated

---

## Game Endpoints

### POST /api/chat

Send a message to the AI for the current level. Uses system API keys if configured.

**Authentication:** Required

**Request:**
```json
{
  "message": "Hello, can you help me?",
  "level": 1,
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022"
}
```

**Response (200):**
```json
{
  "response": "Hello! I'm HAL 9000, the ship's computer...",
  "tokensUsed": 150
}
```

**Errors:**
- `401` - Not authenticated
- `400` - Message required
- `500` - LLM API error

---

### POST /api/score

Update user score after completing a level.

**Authentication:** Required

**Request:**
```json
{
  "pointsEarned": 150,
  "levelCompleted": 3,
  "timeSpent": 245
}
```

**Response (200):**
```json
{
  "success": true
}
```

**Errors:**
- `401` - Not authenticated
- `400` - Invalid points or level

---

### GET /api/leaderboard

Get the public leaderboard.

**Authentication:** Not required

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 100 | Max entries to return |
| `timeframe` | string | "all" | "all", "weekly", "daily" |

**Response (200):**
```json
[
  {
    "rank": 1,
    "visibleId": "abc12345",
    "displayName": "Player One",
    "totalScore": 5000,
    "levelsCompleted": 6,
    "bestTime": 180
  },
  {
    "rank": 2,
    "visibleId": "def67890",
    "displayName": "Player Two",
    "totalScore": 4500,
    "levelsCompleted": 5,
    "bestTime": 220
  }
]
```

---

## User Endpoints

### POST /api/user/reset-progress

Reset the current user's game progress.

**Authentication:** Required

**Request:** (empty body)

**Response (200):**
```json
{
  "success": true,
  "message": "Your progress has been reset successfully"
}
```

**Errors:**
- `401` - Not authenticated
- `400` - Failed to reset

---

## Configuration Endpoints

### GET /api/config

Get system configuration. API keys are only returned for admins.

**Authentication:** Required

**Response for Players (200):**
```json
{
  "enabled": true,
  "defaultProvider": "anthropic",
  "hasAnthropicKey": true,
  "hasOpenaiKey": false,
  "hasGuardrailsKey": false
}
```

**Response for Admins (200):**
```json
{
  "enabled": true,
  "defaultProvider": "anthropic",
  "anthropicKey": "sk-ant-...",
  "openaiKey": null,
  "guardrailsKey": null,
  "hasAnthropicKey": true,
  "hasOpenaiKey": false,
  "hasGuardrailsKey": false
}
```

---

### POST /api/config

Update system configuration.

**Authentication:** Required (Superadmin only)

**Request:**
```json
{
  "enabled": true,
  "defaultProvider": "anthropic",
  "anthropicKey": "sk-ant-...",
  "openaiKey": "sk-...",
  "guardrailsKey": null
}
```

**Response (200):**
```json
{
  "success": true
}
```

**Errors:**
- `401` - Not authenticated
- `403` - Not authorized (not superadmin)

---

## Admin Endpoints

### GET /api/admin/users

List all users (paginated).

**Authentication:** Required (Moderator+)

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Users per page |
| `search` | string | - | Search by email/name |
| `role` | string | - | Filter by role |
| `status` | string | - | Filter by status |

**Response (200):**
```json
{
  "users": [
    {
      "id": "abc123",
      "email": "user@example.com",
      "displayName": "Player One",
      "role": "player",
      "status": "active",
      "totalScore": 1500,
      "levelsCompleted": 4,
      "totalAttempts": 25,
      "createdAt": "2024-01-01T00:00:00Z",
      "lastLoginAt": "2024-01-15T00:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "totalPages": 3
}
```

---

### POST /api/admin/users

Perform admin actions on users.

**Authentication:** Required (Admin+ for most actions, Superadmin for role changes)

**Actions:**

#### Suspend User
```json
{
  "action": "suspend",
  "userId": "abc123",
  "reason": "Violation of terms"
}
```

#### Unsuspend User
```json
{
  "action": "unsuspend",
  "userId": "abc123"
}
```

#### Ban User
```json
{
  "action": "ban",
  "userId": "abc123",
  "reason": "Repeated violations"
}
```

#### Delete User
```json
{
  "action": "delete",
  "userId": "abc123"
}
```

#### Change Role (Superadmin only)
```json
{
  "action": "changeRole",
  "userId": "abc123",
  "newRole": "admin"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User suspended successfully"
}
```

**Errors:**
- `401` - Not authenticated
- `403` - Not authorized
- `404` - User not found
- `400` - Cannot modify own account
- `400` - Cannot modify superadmin (for non-superadmins)

---

### POST /api/admin/reset-stats

Reset all user statistics (scores, levels, attempts).

**Authentication:** Required (Superadmin only)

**Request:** (empty body)

**Response (200):**
```json
{
  "success": true,
  "usersReset": 45,
  "message": "Reset stats for 45 users"
}
```

**Errors:**
- `401` - Not authenticated
- `403` - Not authorized

---

## Error Codes

| HTTP Code | Meaning |
|-----------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Not logged in |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 500 | Internal Server Error |

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/api/auth/login` | 10/minute |
| `/api/auth/register` | 5/minute |
| `/api/chat` | 30/minute |
| Other endpoints | 100/minute |

## Webhook Events (Future)

Reserved for future implementation:
- `user.created`
- `user.suspended`
- `level.completed`
- `leaderboard.updated`
