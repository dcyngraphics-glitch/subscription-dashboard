# App Integration Implementation Plan

> **For implementer:** Use TDD throughout. Write failing test first. Watch it fail. Then implement.

**Goal:** Connect Let Review and Barcode Scanner apps to the Subscription Dashboard as the central authentication and access control hub.

**Architecture:** The Subscription Dashboard becomes the central auth service. Both apps forward login credentials to the Dashboard API, which validates the user's status (active/pending/locked) and returns a JWT token. Admins approve/deny users from the Dashboard.

**Tech Stack:** Node.js, Express, SQLite, JWT, bcrypt, React, Tailwind CSS, Vite

---

## Task 1: Update Dashboard Backend — Status Field + New Endpoints

**Files:**
- Modify: `subscription-dashboard/backend/server.js`
- Modify: `subscription-dashboard/schema.sql`

**Step 1: Add `status` field to users table**

Add a `status` column with default `'active'` for existing users. New users from apps will be `'pending'`.

**Step 2: Add `/api/auth/validate` endpoint**

POST endpoint that accepts a JWT token and returns the user's status. Used by apps to check if a user is still active on each page load.

```javascript
// POST /api/auth/validate
// Body: { token: "jwt_token" }
// Returns: { valid: true/false, user: { id, email, role, status } }
```

**Step 3: Add `/api/users/:id/approve` endpoint**

PATCH endpoint that changes user status to `'active'`.

**Step 4: Add `/api/users/:id/deny` endpoint**

PATCH endpoint that changes user status to `'locked'`.

**Step 5: Update auto-register on login**

When a new user logs in via `/api/auth/login` and they don't exist, create them with status `'pending'` instead of auto-approving them.

**Step 6: Verify**

```bash
# Test approve endpoint
curl -X PATCH http://localhost:5000/api/users/2/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Test deny endpoint
curl -X PATCH http://localhost:5000/api/users/2/deny \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Test validate endpoint
curl -X POST http://localhost:5000/api/auth/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"'"$USER_TOKEN"'"}'
```

---

## Task 2: Update Dashboard Frontend — Pending Badges + Approve/Deny Buttons

**Files:**
- Modify: `subscription-dashboard/frontend/src/pages/Dashboard.jsx`

**Step 1: Add status filter buttons**

Add filter buttons at the top of the users table: All | Pending | Active | Locked

**Step 2: Add "Approve" and "Deny" buttons for pending users**

Show green "Approve" and red "Deny" buttons next to pending users.

**Step 3: Add "Unlock" button for locked users**

Show an "Unlock" button next to locked users to reactivate them.

**Step 4: Verify**

Open `http://localhost:5173` → Users tab → see filter buttons and approve/deny buttons.

---

## Task 3: Integrate Let Review App

**Files:**
- Modify: `let-prep-bcaed/backend/routes/auth.js`
- Modify: `let-prep-bcaed/frontend/src/api.js`
- Create: `let-prep-bcaed/frontend/src/components/AuthGuard.jsx`

**Step 1: Add Dashboard auth check to Let Review login**

After successful login, call Dashboard's `/api/auth/validate` token to check user status.

**Step 2: Create `AuthGuard` component**

Wrap app routes with an AuthGuard that validates the user's token with the Dashboard on each page load.

**Step 3: Show "pending approval" screen**

If user status is `'pending'`, show a clean screen: "Your account is waiting for admin approval."

**Step 4: Show "access denied" screen**

If user status is `'locked'`, show a clean screen: "Your access has been denied."

**Step 5: Verify**

1. Log in to Let Review with a new email → appears as pending in Dashboard
2. Admin approves → Let Review login succeeds
3. Admin denies → Let Review shows "access denied"

---

## Task 4: Clone + Integrate Barcode Scanner App

**Files:**
- Clone: `dcyngraphics-glitch/barcode-inventory` to `Projects/barcode-scanner`
- Modify: `barcode-scanner/src/` auth logic
- Add: Dashboard API integration

**Step 1: Clone the repo**

```bash
cd Projects
git clone https://github.com/dcyngraphics-glitch/barcode-inventory.git barcode-scanner
```

**Step 2: Add Dashboard auth check**

Add a login screen that forwards credentials to Dashboard's `/api/auth/login` endpoint.

**Step 3: Add AuthGuard**

Same as Let Review — validate token on each page load.

**Step 4: Show appropriate screens**

Pending and locked screens for blocked users.

**Step 5: Verify**

Same flow as Let Review — auto-register → pending → approve/deny works.

---

## Task 5: End-to-End Testing

**Manual test checklist:**

- [ ] New user logs into Let Review → "pending approval" screen
- [ ] Dashboard shows new user as pending
- [ ] Admin clicks "Approve" → user can access Let Review
- [ ] New user logs into Barcode Scanner → "pending approval" screen
- [ ] Admin clicks "Deny" → both apps show "access denied"
- [ ] Admin clicks "Unlock" → user can access apps again
- [ ] Existing admin can still log in to Dashboard
- [ ] All existing app features still work after integration

---

## Execution Order

1. Task 1 → Dashboard backend
2. Task 2 → Dashboard frontend  
3. Task 3 → Let Review integration
4. Task 4 → Barcode Scanner integration
5. Task 5 → Testing

Each task builds on the previous one. No task should be skipped.
