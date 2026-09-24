# App Integration Design — Subscription Dashboard

**Date:** 2026-09-23  
**Status:** Approved

## Overview

Connect **Let Review** (local prep app) and **Barcode Scanner** (GitHub: `dcyngraphics-glitch/barcode-inventory`) to the **Subscription Dashboard** as the central authentication and access control hub.

## User Flow

```
User opens App → Login Screen → Enter email/password
    ↓
App sends credentials to Dashboard API
    ↓
Dashboard checks:
    ├── User exists + status = "active" → ✅ Allow access
    ├── User exists + status = "pending" → ⏳ "Waiting for admin approval"
    ├── User exists + status = "locked" → ❌ "Access denied"
    └── User doesn't exist → Auto-register as "pending" → ⏳ "Waiting for admin approval"
```

## Admin Flow

```
Admin opens Dashboard → Users tab
    ↓
Sees new "pending" users from apps
    ↓
Clicks "Approve" → User status → "active" → User can now log in
Clicks "Deny" → User status → "locked" → User blocked
```

## Architecture

### Central Auth Service

The Subscription Dashboard becomes the **single source of truth** for:
- User accounts (email, password hash, role, status)
- Access control (active / pending / locked)
- App permissions (which apps a user can access)

### App Integration

Each app (Let Review, Barcode Scanner) will:
1. Replace local auth checks with Dashboard API calls
2. Forward login credentials to Dashboard
4. Block access if status ≠ "active"
5. Show appropriate messages (pending approval, access denied)

### API Endpoints (New)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/validate` | Validate token + check status |
| GET | `/api/users` | List all users (admin) |
| PATCH | `/api/users/:id/approve` | Approve user (admin) |
| PATCH | `/api/users/:id/deny` | Deny/lock user (admin) |
| PATCH | `/api/users/:id/lock` | Lock user (admin) |
| PATCH | `/api/users/:id/unlock` | Unlock user (admin) |

### New User Statuses

| Status | Meaning |
|--------|---------|
| `active` | Approved by admin, can use app |
| `pending` | Auto-registered, waiting for admin approval |
| `locked` | Denied by admin, blocked from app |

## Implementation Plan

### Task 1: Update Dashboard Backend
- Add `status` field to users table
- Add `/api/auth/validate` endpoint
- Add `/api/users/:id/approve` and `/api/users/:id/deny` endpoints
- Update login to auto-register new users as "pending"

### Task 2: Update Dashboard Frontend
- Show "pending" badge on users table
- Add "Approve" and "Deny" buttons
- Add status filter (all / pending / active / locked)

### Task 3: Integrate Let Review App
- Replace local auth check with Dashboard API call
- Add loading states for auth check
- Show "pending approval" screen
- Show "access denied" screen

### Task 4: Integrate Barcode Scanner App
- Clone repo locally
- Add Dashboard API integration
- Add auth guard on app load

### Task 5: End-to-End Testing
- Register new user via app → appears as pending in dashboard
- Admin approves → user can log in
- Admin denies → user blocked
- Existing active users can log in normally

## Constraints

- No OAuth (email + password only)
- No separate auth service (dashboard is central)
- Both apps on same machine for now
- No schema changes to existing app databases (apps keep their own data)

## Success Criteria

- [ ] New user logs into Let Review → appears as "pending" in dashboard
- [ ] Admin approves user → user can access Let Review
- [ ] Admin denies user → user blocked from Let Review
- [ ] Same flow works for Barcode Scanner
- [ ] Existing admin can still access dashboard
- [ ] No breaking changes to app functionality
