-- Database Schema Initialization for PostgreSQL

-- Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    avatar_url TEXT,
    theme_preference TEXT DEFAULT 'light',
    language TEXT DEFAULT 'es',
    notifications BOOLEAN DEFAULT TRUE,
    microsoft_id TEXT,
    microsoft_email TEXT,
    microsoft_access_token TEXT,
    microsoft_refresh_token TEXT
);

-- User Credentials
CREATE TABLE IF NOT EXISTS user_credentials (
    user_id INTEGER PRIMARY KEY,
    password_hash TEXT NOT NULL,
    last_login TIMESTAMP,
    failed_attempts INTEGER DEFAULT 0,
    is_locked BOOLEAN DEFAULT FALSE,
    lockout_until TIMESTAMP,
    reset_token TEXT,
    reset_token_expires TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Security Settings
CREATE TABLE IF NOT EXISTS security_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE,
    recovery_email_enc TEXT,
    recovery_email_iv TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Admin Inbox
CREATE TABLE IF NOT EXISTS admin_inbox (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    user_id INTEGER,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Folders
CREATE TABLE IF NOT EXISTS folders (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER,
    name TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id),
    FOREIGN KEY(parent_id) REFERENCES folders(id)
);

-- Files
CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    folder_id INTEGER,
    name TEXT NOT NULL,
    physical_path TEXT,
    size INTEGER,
    mime_type TEXT,
    owner_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(folder_id) REFERENCES folders(id),
    FOREIGN KEY(owner_id) REFERENCES users(id)
);

-- Groups
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group Members
CREATE TABLE IF NOT EXISTS group_members (
    group_id INTEGER,
    user_id INTEGER,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(group_id, user_id),
    FOREIGN KEY(group_id) REFERENCES groups(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
    id SERIAL PRIMARY KEY,
    microsoft_id TEXT UNIQUE,
    user_id INTEGER,
    subject TEXT,
    body_preview TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    is_all_day BOOLEAN,
    location TEXT,
    web_link TEXT,
    categories TEXT,
    assigned_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    username TEXT,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shared Files
CREATE TABLE IF NOT EXISTS shared_files (
    id SERIAL PRIMARY KEY,
    path TEXT NOT NULL,
    owner_username TEXT NOT NULL,
    shared_with_username TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(path, owner_username, shared_with_username)
);

-- RDP Connections (for rdp-service)
CREATE TABLE IF NOT EXISTS rdp_connections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL DEFAULT 1,
    server_id TEXT NOT NULL DEFAULT '',
    name VARCHAR(255) NOT NULL,
    hostname VARCHAR(255) NOT NULL,
    port INTEGER DEFAULT 3389,
    username VARCHAR(255),
    password VARCHAR(255),
    protocol VARCHAR(50) DEFAULT 'rdp',
    virtual_ip VARCHAR(50),
    public_key VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RDP Settings (key-value store for rdp-service)
CREATE TABLE IF NOT EXISTS rdp_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value VARCHAR(255)
);

-- Default RDP settings
INSERT INTO rdp_settings (setting_key, setting_value)
VALUES ('lan_only', 'false'), ('server_id', ''), ('maintenance_mode', 'false')
ON CONFLICT (setting_key) DO NOTHING;

-- Event Attachments (links files to calendar events)
CREATE TABLE IF NOT EXISTS event_attachments (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_owner VARCHAR(255) NOT NULL,
    attached_by VARCHAR(255) NOT NULL,
    file_size INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
