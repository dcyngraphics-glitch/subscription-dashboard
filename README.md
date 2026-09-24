# Subscription Dashboard

A local dashboard to manage user access to your apps (like Let Review and Barcode Scanner) with subscription-based access control.

## Features

- User registration and login (JWT authentication)
- Role-based access (admin/user)
- Subscription plans (free, pro, enterprise)
- Lock/unlock users to deny/grant app access
- View active users, locked users, total users, and active subscriptions
- Usage tracking (for metered features)
- Responsive UI with Tailwind CSS

## Tech Stack

- **Backend**: Node.js, Express, SQLite, JWT, bcrypt
- **Frontend**: React, Vite, Tailwind CSS, React Router

## Setup

1. **Clone the repository** (or copy the files to your local machine)

2. **Install dependencies**:
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

3. **Set up the database**:
   The database is initialized automatically when the backend starts. An admin user is created:
   - Email: `admin@yourapp.local`
   - Password: `secret`

4. **Set environment variables**:
   Create a `.env` file in the `backend` directory with:
   ```
   JWT_SECRET=your_secret_key
   PORT=5000
   ```

5. **Start the servers**:
   ```bash
   # In one terminal, start the backend
   cd backend
   npm start   # or: node server.js

   # In another terminal, start the frontend
   cd frontend
   npm run dev
   ```

6. **Access the dashboard**:
   - Open your browser to `http://localhost:5173`
   - Login with the admin credentials:
     - Email: `admin@yourapp.local`
     - Password: `secret`
   - You'll see the dashboard with stats and a user table.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive a JWT token

### User Management (Admin only)
- `GET /api/users` - Get all users
- `PATCH /api/users/:id/lock` - Lock a user (deny access)
- `PATCH /api/users/:id/unlock` - Unlock a user (grant access)

### Subscriptions
- `GET /api/subscriptions` - Get all subscriptions with user and plan details

### Usage Tracking
- `POST /api/usage` - Record usage of a feature (requires auth)
  - Body: `{ "feature": "string", "quantity": number (optional, default 1) }`

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics (requires admin)

## How to Integrate Your Apps

In each of your apps (Let Review, Barcode Scanner, etc.), when a user performs a key action (e.g., takes a mock exam, scans a barcode), make a POST request to the usage tracking endpoint:

```javascript
fetch('http://localhost:5000/api/usage', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}` // You'll need to implement login in your apps to get this token
  },
  body: JSON.stringify({
    feature: 'mock_exams_taken', // or 'scans_per_day'
    quantity: 1
  })
});
```

Then, in the dashboard, you can view usage statistics (currently total usage in the last 30 days) and build more detailed reports as needed.

## Customizing Subscription Plans

Edit the `schema.sql` file to adjust the subscription plans and their features. The `features` column is a JSON array of feature names that the plan includes.

## Future Improvements

- Add payment integration (Stripe) to automatically handle subscriptions and update access based on payment status.
- Add more detailed usage analytics (charts, per-user usage, etc.).
- Allow admins to create and edit subscription plans.
- Add email notifications for subscription events.
- Improve UI with modals for adding users, viewing subscription details, etc.

## License

MIT