-- Subscription Dashboard Schema for Local SaaS Apps
-- Run with: sqlite3 dashboard.db < schema.sql

-- Users (extends your existing user table)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'locked', 'past_due', 'canceled', 'pending')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription Plans (define what each plan includes)
CREATE TABLE IF NOT EXISTS subscription_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE, -- e.g., 'free', 'pro', 'enterprise'
    price_cents INTEGER NOT NULL, -- Stripe-compatible (e.g., 999 for $9.99)
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    features TEXT NOT NULL, -- JSON array: ['mock_exams', 'ai_explanations', 'unlimited_scans']
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Subscriptions (tracks active plans)
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

-- Usage Tracking (for metered features & quotas)
CREATE TABLE IF NOT EXISTS usage_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature TEXT NOT NULL, -- e.g., 'mock_exams_taken', 'scans_per_day'
    quantity INTEGER NOT NULL DEFAULT 1,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Device Tracking (for apps to report which devices are accessing)
CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fingerprint TEXT NOT NULL, -- hashed device fingerprint
    user_agent TEXT,
    platform TEXT,
    screen_resolution TEXT,
    timezone TEXT,
    hardware_concurrency INTEGER,
    memory REAL,
    touch_points INTEGER,
    referrer TEXT,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_user_feature ON usage_records(user_id, feature);
CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);

-- Device tracking table (for barcode scanner app)
CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON CASCADE,
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

-- API keys table (for app authentication)
CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON CASCADE,
    key TEXT UNIQUE NOT NULL,
    name TEXT,
    permissions TEXT DEFAULT '["read", "write"]',
    last_used TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial data (free plan + admin user)
INSERT OR IGNORE INTO subscription_plans (name, price_cents, billing_cycle, features)
VALUES 
    ('free', 0, 'monthly', '["basic_exams"]'),
    ('pro', 999, 'monthly', '["mock_exams", "ai_explanations", "unlimited_scans"]'),
    ('enterprise', 2499, 'monthly', '["all_features", "priority_support", "team_management"]');

INSERT OR IGNORE INTO users (email, password_hash, role, status)
VALUES 
    ('admin@yourapp.local', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'admin', 'active'); -- password: 'secret'