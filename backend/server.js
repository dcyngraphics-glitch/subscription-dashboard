const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database('./dashboard.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

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
    const stmt = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
    stmt.run(email, hashedPassword, function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(409).json({ message: 'User already exists' });
        }
        return res.status(500).json({ message: 'Database error' });
      }
      const userId = this.lastID;
      const token = jwt.sign({ id: userId, email, role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
      res.status(201).json({ token, user: { id: userId, email, role: 'user' } });
    });
    stmt.finalize();
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) return res.status(500).json({ message: 'Database error' });

    // Auto-register new users with 'pending' status
    if (!row) {
      try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const stmt = db.prepare('INSERT INTO users (email, password_hash, status) VALUES (?, ?, ?)');
        stmt.run(email, hashedPassword, 'pending', function(err) {
          if (err) {
            if (err.code === 'SQLITE_CONSTRAINT') {
              return res.status(409).json({ message: 'User already exists' });
            }
            return res.status(500).json({ message: 'Database error' });
          }
          const userId = this.lastID;
          const token = jwt.sign({ id: userId, email, role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
          return res.status(201).json({ token, user: { id: userId, email, role: 'user', status: 'pending' } });
        });
        stmt.finalize();
      } catch (err) {
        return res.status(500).json({ message: 'Server error' });
      }
      return;
    }

    const validPassword = await bcrypt.compare(password, row.password_hash);
    if (!validPassword) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: row.id, email: row.email, role: row.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: row.id, email: row.email, role: row.role, status: row.status } });
  });
});

// Token validation endpoint (used by apps to check user status)
// Supports both token-based (Dashboard apps) and email-based (cross-app) validation
app.post('/api/auth/validate', (req, res) => {
  const { token, email } = req.body;

  // Cross-app validation by email (used by LET Prep and other integrated apps)
  if (email && !token) {
    db.get('SELECT id, email, role, status FROM users WHERE email = ?', [email], (err, row) => {
      if (err) {
        return res.status(500).json({ valid: false, message: 'Database error' });
      }
      if (!row) {
        return res.json({ valid: false, message: 'User not found' });
      }
      return res.json({ valid: true, user: row });
    });
    return;
  }

  if (!token) {
    return res.status(400).json({ valid: false, message: 'Token or email required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.json({ valid: false, message: 'Invalid or expired token' });
    }

    db.get('SELECT id, email, role, status FROM users WHERE id = ?', [decoded.id], (err, row) => {
      if (err) {
        return res.status(500).json({ valid: false, message: 'Database error' });
      }
      if (!row) {
        return res.json({ valid: false, message: 'User not found' });
      }
      res.json({ valid: true, user: row });
    });
  });
});

// User routes (admin only)
app.get('/api/users', authenticateToken, authorizeAdmin, (req, res) => {
  db.all('SELECT id, email, role, status, created_at FROM users ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(rows);
  });
});

app.patch('/api/users/:id/lock', authenticateToken, authorizeAdmin, (req, res) => {
  const { id } = req.params;
  db.run('UPDATE users SET status = ? WHERE id = ?', ['locked', id], function(err) {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (this.changes === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User locked successfully' });
  });
});

app.patch('/api/users/:id/unlock', authenticateToken, authorizeAdmin, (req, res) => {
  const { id } = req.params;
  db.run('UPDATE users SET status = ? WHERE id = ?', ['active', id], function(err) {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (this.changes === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User unlocked successfully' });
  });
});

// Approve user (admin only)
app.patch('/api/users/:id/approve', authenticateToken, authorizeAdmin, (req, res) => {
  const { id } = req.params;
  db.run('UPDATE users SET status = ? WHERE id = ?', ['active', id], function(err) {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (this.changes === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User approved successfully' });
  });
});

// Deny user (admin only)
app.patch('/api/users/:id/deny', authenticateToken, authorizeAdmin, (req, res) => {
  const { id } = req.params;
  db.run('UPDATE users SET status = ? WHERE id = ?', ['locked', id], function(err) {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (this.changes === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User denied successfully' });
  });
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
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(rows);
  });
});

// Usage tracking
app.post('/api/usage', authenticateToken, (req, res) => {
  const { feature, quantity = 1 } = req.body;
  if (!feature) return res.status(400).json({ message: 'Feature required' });

  const stmt = db.prepare('INSERT INTO usage_records (user_id, feature, quantity) VALUES (?, ?, ?)');
  stmt.run(req.user.id, feature, quantity, function(err) {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.status(201).json({ id: this.lastID });
  });
  stmt.finalize();
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
  db.run(`
    INSERT INTO devices (user_id, user_agent, language, platform, screen_resolution, timezone, hardware_concurrency, memory, touch_points, referrer, last_seen)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, user_agent, platform, screen_resolution)
    DO UPDATE SET last_seen = CURRENT_TIMESTAMP
  `, [
    userId,
    ua,
    device.language || '',
    platform,
    screenRes,
    device.timezone || '',
    device.hardwareConcurrency || 0,
    device.memory || null,
    device.touchPoints || 0,
    device.referrer || 'direct',
  ], function(err) {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json({ id: this.lastID });
  });
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
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(rows);
  });
});

// Dashboard stats
app.get('/api/dashboard/stats', authenticateToken, authorizeAdmin, (req, res) => {
  const stats = {};
  db.serialize(() => {
    db.get('SELECT COUNT(*) as totalUsers FROM users', [], (err, row) => {
      if (err) return;
      stats.totalUsers = row.totalUsers;
    });
    db.get('SELECT COUNT(*) as activeUsers FROM users WHERE status = ?', ['active'], (err, row) => {
      if (err) return;
      stats.activeUsers = row.activeUsers;
    });
    db.get('SELECT COUNT(*) as lockedUsers FROM users WHERE status = ?', ['locked'], (err, row) => {
      if (err) return;
      stats.lockedUsers = row.lockedUsers;
    });
    db.get(`
      SELECT COUNT(*) as activeSubscriptions 
      FROM user_subscriptions 
      WHERE status = ?`, ['active'], (err, row) => {
      if (err) return;
      stats.activeSubscriptions = row.activeSubscriptions;
    });
    db.get(`
      SELECT SUM(quantity) as totalUsage 
      FROM usage_records 
      WHERE timestamp >= datetime('now', '-30 days')`, [], (err, row) => {
      if (err) return;
      stats.totalUsage = row.totalUsage || 0;
    });
    db.get('SELECT COUNT(*) as totalDevices FROM devices', [], (err, row) => {
      if (err) return;
      stats.totalDevices = row.totalDevices || 0;
    });
  });

  setTimeout(() => {
    res.json(stats);
  }, 100);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});