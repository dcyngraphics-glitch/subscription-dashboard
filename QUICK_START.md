# Subscription Dashboard - Quick Start

## Overview
This dashboard allows you to manage user access to your apps (Let Review, Barcode Scanner, etc.) with subscription-based access control. You can:
- Register and login users
- Assign roles (admin/user)
- Create subscription plans (free, pro, enterprise)
- Lock/unlock users to deny/grant app access
- View dashboard statistics (total users, active users, locked users, active subscriptions)
- Track feature usage (for metered billing)

## Tech Stack
- **Backend**: Node.js, Express, SQLite, JWT, bcrypt
- **Frontend**: React, Vite, Tailwind CSS, React Router

## Prerequisites
- Node.js (v16+)
- npm or yarn

## Setup Instructions

### 1. Clone or copy the project
```bash
# If you have the files already, skip this step
# Otherwise, create the directory structure as shown below
```

### 2. Install dependencies
```bash
# Backend
cd subscription-dashboard/backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Set environment variables
Create a `.env` file in the `backend` directory:
```bash
echo "JWT_SECRET=your_secret_key
PORT=5000" > backend/.env
```

### 4. Initialize the database
The database is initialized automatically when the backend starts. An admin user is created:
- Email: `admin@yourapp.local`
- Password: `secret`

### 5. Start the servers
In **Terminal 1** (backend):
```bash
cd subscription-dashboard/backend
npm start
# You should see: "Server running on port 5000" and "Connected to SQLite database."
```

In **Terminal 2** (frontend):
```bash
cd subscription-dashboard/frontend
npm run dev
# You should see: "VITE vX.X.X ready in XXX ms" and "Local:   http://localhost:5173"
```

### 6. Access the dashboard
1. Open your browser to [http://localhost:5173](http://localhost:5173)
2. Login with:
   - Email: `admin@yourapp.local`
   - Password: `secret`
3. You'll see the dashboard with statistics and a user table.

## API Endpoints (for reference)
All endpoints are under `http://localhost:5000/api`

### Auth
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get JWT token

### Users (Admin only)
- `GET /users` - List all users
- `PATCH /users/:id/lock` - Lock a user
- `PATCH /users/:id/unlock` - Unlock a user

### Subscriptions
- `GET /subscriptions` - List all subscriptions with user/plan details

### Usage
- `POST /usage` - Record feature usage (requires auth)
  - Body: `{ "feature": "string", "quantity": number }`

### Dashboard
- `GET /dashboard/stats` - Get statistics (requires admin)

## Integrating Your Apps
In your apps (Let Review, Barcode Scanner), when a user performs a key action (e.g., takes a mock exam, scans a barcode), track usage:

```javascript
// Example: After a user takes a mock exam in Let Review
fetch('http://localhost:5000/api/usage', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}` // You'll need to implement login in your app to get this token
  },
  body: JSON.stringify({
    feature: 'mock_exams_taken',
    quantity: 1
  })
});
```

## Customization
- **Subscription Plans**: Edit `schema.sql` to adjust plans and features
- **UI**: Modify React components in `frontend/src/pages/` and `frontend/src/components/`
- **Styling**: Tailwind CSS configuration in `frontend/tailwind.config.js`

## Troubleshooting
- **CORS errors**: Ensure the backend is running and the frontend is making requests to `http://localhost:5000`
- **Database errors**: Delete `backend/dashboard.db` and restart the backend to reinitialize
- **Login fails**: Verify the admin user exists in the database (check `backend/dashboard.db` with SQLite)

## Next Steps
1. Add payment integration (Stripe) for automated subscription handling
2. Enhance usage analytics with charts and detailed reports
3. Allow admins to create/edit subscription plans via the dashboard
4. Add email notifications for subscription events
5. Improve UI with modals for adding users and viewing subscription details

---
**Built with ❤️ using Hermes Agent**