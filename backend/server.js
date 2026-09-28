const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting — prevent brute force on auth endpoints
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window per IP
  message: { error: 'Too many login/register attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// Serve dashboard frontend — serve static assets + SPA fallback in one middleware
const fs = require('fs');
const distPath = path.join(__dirname, '../frontend/dist');
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  // Try to serve a static file from dist (JS, CSS, images, etc.)
  const filePath = path.join(distPath, req.path);
  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      return res.sendFile(filePath);
    }
    // Not a static file — serve the SPA index.html (React Router handles routing)
    res.sendFile(path.join(distPath, 'index.html'));
  });
});

// Database setup (synchronous, built-in node:sqlite — no native deps)
const db = new DatabaseSync('./dashboard.db');

// Initialize schema (create tables if they don't exist)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'locked', 'past_due', 'canceled', 'pending')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subscription_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    price_cents INTEGER NOT NULL,
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    features TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'pending')),
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS usage_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_agent TEXT,
    language TEXT,
    platform TEXT,
    screen_resolution TEXT,
    timezone TEXT,
    hardware_concurrency INTEGER DEFAULT 0,
    memory REAL,
    touch_points INTEGER DEFAULT 0,
    referrer TEXT DEFAULT 'direct',
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, user_agent, platform, screen_resolution)
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key TEXT UNIQUE NOT NULL,
    name TEXT,
    permissions TEXT DEFAULT '["read", "write"]',
    last_used TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
  CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);
  CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
  CREATE INDEX IF NOT EXISTS idx_usage_user_feature ON usage_records(user_id, feature);
  CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_records(timestamp);

  INSERT OR IGNORE INTO users (email, password_hash, role, status) VALUES ('admin@yourapp.local', '\$2b\$12\$Dva0AXQIzQbp4nBjBlY69uzjNX4fb9MXrHg8dfbtPtuZk.LjBABSi', 'admin', 'active');
  UPDATE users SET role='admin', status='active' WHERE email='admin@yourapp.local';
  INSERT OR IGNORE INTO subscription_plans (name, price_cents, billing_cycle, features)
  VALUES
    ('free', 0, 'monthly', '["basic_exams"]'),
    ('pro', 999, 'monthly', '["mock_exams", "ai_explanations", "unlimited_scans"]'),
    ('enterprise', 2499, 'monthly', '["all_features", "priority_support", "team_management"]');
`);

console.log('Connected to SQLite database.');

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Admin middleware
const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const stmt = db.prepare('INSERT INTO users (email, password_hash, status) VALUES (?, ?, ?)');
    const info = stmt.run(email, hashedPassword, 'pending');
    const userId = Number(info.lastInsertRowid);
    const token = jwt.sign({ id: userId, email, role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, user: { id: userId, email, role: 'user', status: 'pending' } });
  } catch (err) {
    if (err.code === 'ERR_SQLITE_ERROR' && err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ message: 'User already exists' });
    }
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password, device } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  // Auto-register new users with 'pending' status
  if (!row) {
    try {
      const hashedPassword = bcrypt.hashSync(password, 12);
      const stmt = db.prepare('INSERT INTO users (email, password_hash, status) VALUES (?, ?, ?)');
      const info = stmt.run(email, hashedPassword, 'pending');
      const userId = Number(info.lastInsertRowid);
      const token = jwt.sign({ id: userId, email, role: 'user' }, JWT_SECRET, { expiresIn: '1h' });

      // Track device on signup (even for pending users)
      if (device) {
        const ua = device.userAgent || '';
        const platform = device.platform || '';
        const screenRes = device.screenResolution || '';
        const stmt2 = db.prepare(
          `INSERT INTO devices (user_id, user_agent, language, platform, screen_resolution, timezone, hardware_concurrency, memory, touch_points, referrer, first_seen, last_seen)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT(user_id, user_agent, platform, screen_resolution)
           DO UPDATE SET last_seen = CURRENT_TIMESTAMP`
        );
        stmt2.run(userId, ua, device.language || '', platform, screenRes, device.timezone || '', device.hardwareConcurrency || 0, device.memory || null, device.touchPoints || 0, device.referrer || 'direct');
      }

      return res.status(201).json({ token, user: { id: userId, email, role: 'user', status: 'pending' } });
    } catch (err) {
      if (err.code === 'ERR_SQLITE_ERROR' && err.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ message: 'User already exists' });
      }
      return res.status(500).json({ message: 'Database error' });
    }
  }

  const validPassword = bcrypt.compareSync(password, row.password_hash);
  if (!validPassword) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ id: row.id, email: row.email, role: row.role }, JWT_SECRET, { expiresIn: '1h' });

  // Track device on login (for all users including pending)
  if (device) {
    const ua = device.userAgent || '';
    const platform = device.platform || '';
    const screenRes = device.screenResolution || '';
    const stmt2 = db.prepare(
      `INSERT INTO devices (user_id, user_agent, language, platform, screen_resolution, timezone, hardware_concurrency, memory, touch_points, referrer, first_seen, last_seen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT first_seen FROM devices WHERE user_id = ? AND user_agent = ? AND platform = ? AND screen_resolution = ?), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, user_agent, platform, screen_resolution)
       DO UPDATE SET last_seen = CURRENT_TIMESTAMP`
    );
    stmt2.run(userId, ua, device.language || '', platform, screenRes, device.timezone || '', device.hardwareConcurrency || 0, device.memory || null, device.touchPoints || 0, device.referrer || 'direct', row.id, ua, platform, screenRes);
  }

  res.json({ token, user: { id: row.id, email: row.email, role: row.role, status: row.status } });
});

// Token validation endpoint (used by apps to check user status)
// Supports both token-based (Dashboard apps) and email-based (cross-app) validation
app.post('/api/auth/validate', (req, res) => {
  const { token, email } = req.body;

  // Cross-app validation by email (used by LET Prep and other integrated apps)
  if (email && !token) {
    const row = db.prepare('SELECT id, email, role, status FROM users WHERE email = ?').get(email);
    if (!row) {
      return res.json({ valid: false, message: 'User not found' });
    }
    return res.json({ valid: true, user: row });
  }

  if (!token) {
    return res.status(400).json({ valid: false, message: 'Token or email required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const row = db.prepare('SELECT id, email, role, status FROM users WHERE id = ?').get(decoded.id);
    if (!row) {
      return res.json({ valid: false, message: 'User not found' });
    }
    res.json({ valid: true, user: row });
  } catch (err) {
    return res.json({ valid: false, message: 'Invalid or expired token' });
  }
});

// User routes (admin only)
app.get('/api/users', authenticateToken, authorizeAdmin, (req, res) => {
  const rows = db.prepare('SELECT id, email, role, status, created_at FROM users ORDER BY created_at DESC').all();
  res.json(rows);
});

app.patch('/api/users/:id/lock', authenticateToken, authorizeAdmin, (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('UPDATE users SET status = ? WHERE id = ?');
  const info = stmt.run('locked', id);
  if (info.changes === 0) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'User locked successfully' });
});

app.patch('/api/users/:id/unlock', authenticateToken, authorizeAdmin, (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('UPDATE users SET status = ? WHERE id = ?');
  const info = stmt.run('active', id);
  if (info.changes === 0) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'User unlocked successfully' });
});

// Approve user (admin only)
app.patch('/api/users/:id/approve', authenticateToken, authorizeAdmin, (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('UPDATE users SET status = ? WHERE id = ?');
  const info = stmt.run('active', id);
  if (info.changes === 0) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'User approved successfully' });
});

// Deny user (admin only)
app.patch('/api/users/:id/deny', authenticateToken, authorizeAdmin, (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('UPDATE users SET status = ? WHERE id = ?');
  const info = stmt.run('locked', id);
  if (info.changes === 0) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'User denied successfully' });
});

// Subscription routes
app.get('/api/subscriptions', authenticateToken, authorizeAdmin, (req, res) => {
  const query = `
    SELECT us.id, u.email, sp.name as plan_name, us.status,
           us.current_period_start, us.current_period_end, us.cancel_at_period_end
    FROM user_subscriptions us
    JOIN users u ON us.user_id = u.id
    JOIN subscription_plans sp ON us.plan_id = sp.id
    ORDER BY us.created_at DESC
  `;
  const rows = db.prepare(query).all();
  res.json(rows);
});

// Usage tracking
app.post('/api/usage', authenticateToken, (req, res) => {
  const { feature, quantity = 1 } = req.body;
  if (!feature) return res.status(400).json({ message: 'Feature required' });

  const stmt = db.prepare('INSERT INTO usage_records (user_id, feature, quantity) VALUES (?, ?, ?)');
  const info = stmt.run(req.user.id, feature, quantity);
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

// Device tracking — called by barcode scanner app on login/visit
app.post('/api/device/track', authenticateToken, (req, res) => {
  const { device } = req.body;
  if (!device) return res.status(400).json({ message: 'Device info required' });

  const userId = req.user.id;
  const ua = device.userAgent || '';
  const platform = device.platform || '';
  const screenRes = device.screenResolution || '';

  // Upsert: update last_seen if same device fingerprint exists
  const stmt = db.prepare(`
    INSERT INTO devices (user_id, user_agent, language, platform, screen_resolution, timezone, hardware_concurrency, memory, touch_points, referrer, last_seen)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, user_agent, platform, screen_resolution)
    DO UPDATE SET last_seen = CURRENT_TIMESTAMP
  `);
  const info = stmt.run(
    userId,
    ua,
    device.language || '',
    platform,
    screenRes,
    device.timezone || '',
    device.hardwareConcurrency || 0,
    device.memory || null,
    device.touchPoints || 0,
    device.referrer || 'direct'
  );
  res.json({ id: Number(info.lastInsertRowid) });
});

// List devices (admin only) — for dashboard to view who's using the app
app.get('/api/devices', authenticateToken, authorizeAdmin, (req, res) => {
  const query = `
    SELECT d.id, d.user_id, u.email, d.user_agent, d.platform, d.screen_resolution,
           d.timezone, d.first_seen, d.last_seen
    FROM devices d
    JOIN users u ON d.user_id = u.id
    ORDER BY d.last_seen DESC
  `;
  const rows = db.prepare(query).all();
  res.json(rows);
});

// Dashboard stats
app.get('/api/dashboard/stats', authenticateToken, authorizeAdmin, (req, res) => {
  const stats = {};

  const r1 = db.prepare('SELECT COUNT(*) as totalUsers FROM users').get();
  stats.totalUsers = r1.totalUsers;

  const r2 = db.prepare('SELECT COUNT(*) as activeUsers FROM users WHERE status = ?').get('active');
  stats.activeUsers = r2.activeUsers;

  const r3 = db.prepare('SELECT COUNT(*) as lockedUsers FROM users WHERE status = ?').get('locked');
  stats.lockedUsers = r3.lockedUsers;

  const r4 = db.prepare('SELECT COUNT(*) as activeSubscriptions FROM user_subscriptions WHERE status = ?').get('active');
  stats.activeSubscriptions = r4.activeSubscriptions || 0;

  const r5 = db.prepare("SELECT SUM(quantity) as totalUsage FROM usage_records WHERE timestamp >= datetime('now', '-30 days')").get();
  stats.totalUsage = (r5 && r5.totalUsage) || 0;

  const r6 = db.prepare('SELECT COUNT(*) as totalDevices FROM devices').get();
  stats.totalDevices = r6.totalDevices || 0;

  res.json(stats);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
