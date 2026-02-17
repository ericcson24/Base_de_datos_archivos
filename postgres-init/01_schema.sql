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
    provider_id TEXT DEFAULT NULL,
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

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Folder Metadata (color/icon customization)
CREATE TABLE IF NOT EXISTS folder_metadata (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    folder_path TEXT NOT NULL,
    color TEXT DEFAULT '#5f9ee9',
    icon TEXT DEFAULT 'default',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(username, folder_path)
);

-- =============================================
-- ROADMAP MODULE TABLES
-- =============================================

-- Roadmap Projects
CREATE TABLE IF NOT EXISTS roadmap_projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    project_type TEXT DEFAULT 'personal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Roadmap Columns (Kanban columns per project)
CREATE TABLE IF NOT EXISTS roadmap_columns (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    color TEXT DEFAULT '#5f9ee9',
    wip_limit INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES roadmap_projects(id) ON DELETE CASCADE
);

-- Roadmap Issues (Kanban cards / tasks)
CREATE TABLE IF NOT EXISTS roadmap_issues (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    column_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    issue_type TEXT DEFAULT 'task',
    issue_key TEXT,
    priority TEXT DEFAULT 'medium',
    assigned_to INTEGER,
    reporter_id INTEGER,
    created_by INTEGER NOT NULL,
    due_date TIMESTAMP,
    start_date TIMESTAMP,
    position INTEGER DEFAULT 0,
    labels TEXT DEFAULT '[]',
    story_points NUMERIC(5,1) DEFAULT 0,
    estimated_hours NUMERIC(6,2) DEFAULT 0,
    logged_hours NUMERIC(8,2) DEFAULT 0,
    remaining_hours NUMERIC(6,2) DEFAULT 0,
    status TEXT DEFAULT 'open',
    resolution TEXT,
    sprint_id INTEGER,
    epic_id INTEGER,
    parent_id INTEGER,
    calendar_event_id TEXT,
    environment TEXT,
    acceptance_criteria TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES roadmap_projects(id) ON DELETE CASCADE,
    FOREIGN KEY(column_id) REFERENCES roadmap_columns(id) ON DELETE CASCADE,
    FOREIGN KEY(assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(parent_id) REFERENCES roadmap_issues(id) ON DELETE CASCADE
);

-- Roadmap Issue Comments (threads)
CREATE TABLE IF NOT EXISTS roadmap_comments (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(issue_id) REFERENCES roadmap_issues(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Roadmap Milestones (Hitos)
CREATE TABLE IF NOT EXISTS roadmap_milestones (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    status TEXT DEFAULT 'open',
    calendar_event_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES roadmap_projects(id) ON DELETE CASCADE
);

-- Roadmap Project Members
CREATE TABLE IF NOT EXISTS roadmap_members (
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(project_id, user_id),
    FOREIGN KEY(project_id) REFERENCES roadmap_projects(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Roadmap User Access Control
CREATE TABLE IF NOT EXISTS roadmap_user_access (
    user_id INTEGER PRIMARY KEY,
    access_level TEXT DEFAULT 'member',
    can_create_projects BOOLEAN DEFAULT FALSE,
    granted_by INTEGER,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Roadmap Calendar Links
CREATE TABLE IF NOT EXISTS roadmap_calendar_links (
    id SERIAL PRIMARY KEY,
    calendar_event_id TEXT NOT NULL,
    issue_id INTEGER NOT NULL,
    linked_by INTEGER NOT NULL,
    link_direction TEXT DEFAULT 'both',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(issue_id) REFERENCES roadmap_issues(id) ON DELETE CASCADE,
    FOREIGN KEY(linked_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(calendar_event_id, issue_id)
);

-- Relations: Issue <-> Document (Panel)
CREATE TABLE IF NOT EXISTS roadmap_issue_documents (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL,
    file_id INTEGER,
    file_path TEXT,
    file_name TEXT NOT NULL,
    linked_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(issue_id) REFERENCES roadmap_issues(id) ON DELETE CASCADE,
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE SET NULL,
    FOREIGN KEY(linked_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Relations: Issue <-> Calendar Event
CREATE TABLE IF NOT EXISTS roadmap_issue_events (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL,
    event_id TEXT NOT NULL,
    provider TEXT DEFAULT 'outlook',
    sync_direction TEXT DEFAULT 'both',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(issue_id) REFERENCES roadmap_issues(id) ON DELETE CASCADE
);

-- Roadmap Activity Log
CREATE TABLE IF NOT EXISTS roadmap_activity (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    issue_id INTEGER,
    user_id INTEGER,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES roadmap_projects(id) ON DELETE CASCADE
);

-- =============================================
-- SPRINTS
-- =============================================
CREATE TABLE IF NOT EXISTS roadmap_sprints (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    goal TEXT,
    status TEXT DEFAULT 'planning',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    velocity NUMERIC(6,1) DEFAULT 0,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES roadmap_projects(id) ON DELETE CASCADE,
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Sprint Burndown Data (daily snapshots)
CREATE TABLE IF NOT EXISTS roadmap_sprint_burndown (
    id SERIAL PRIMARY KEY,
    sprint_id INTEGER NOT NULL,
    snapshot_date DATE NOT NULL,
    total_points NUMERIC(6,1) DEFAULT 0,
    completed_points NUMERIC(6,1) DEFAULT 0,
    remaining_points NUMERIC(6,1) DEFAULT 0,
    total_issues INTEGER DEFAULT 0,
    completed_issues INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sprint_id) REFERENCES roadmap_sprints(id) ON DELETE CASCADE
);

-- =============================================
-- SUBTASKS / CHECKLISTS
-- =============================================
CREATE TABLE IF NOT EXISTS roadmap_subtasks (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    assigned_to INTEGER,
    position INTEGER DEFAULT 0,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY(issue_id) REFERENCES roadmap_issues(id) ON DELETE CASCADE,
    FOREIGN KEY(assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- ISSUE LINKS (blocks, is blocked by, relates to, duplicates)
-- =============================================
CREATE TABLE IF NOT EXISTS roadmap_issue_links (
    id SERIAL PRIMARY KEY,
    source_issue_id INTEGER NOT NULL,
    target_issue_id INTEGER NOT NULL,
    link_type TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(source_issue_id) REFERENCES roadmap_issues(id) ON DELETE CASCADE,
    FOREIGN KEY(target_issue_id) REFERENCES roadmap_issues(id) ON DELETE CASCADE,
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(source_issue_id, target_issue_id, link_type)
);

-- =============================================
-- WATCHERS
-- =============================================
CREATE TABLE IF NOT EXISTS roadmap_watchers (
    issue_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(issue_id, user_id),
    FOREIGN KEY(issue_id) REFERENCES roadmap_issues(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- TIME TRACKING / WORK LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS roadmap_time_logs (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    hours NUMERIC(6,2) NOT NULL,
    description TEXT,
    work_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(issue_id) REFERENCES roadmap_issues(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- CUSTOM FIELDS
-- =============================================
CREATE TABLE IF NOT EXISTS roadmap_custom_fields (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    field_type TEXT NOT NULL DEFAULT 'text',
    options JSONB,
    is_required BOOLEAN DEFAULT FALSE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES roadmap_projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roadmap_custom_field_values (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL,
    field_id INTEGER NOT NULL,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(issue_id) REFERENCES roadmap_issues(id) ON DELETE CASCADE,
    FOREIGN KEY(field_id) REFERENCES roadmap_custom_fields(id) ON DELETE CASCADE,
    UNIQUE(issue_id, field_id)
);

-- =============================================
-- ISSUE HISTORY (full audit trail)
-- =============================================
CREATE TABLE IF NOT EXISTS roadmap_issue_history (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(issue_id) REFERENCES roadmap_issues(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- SAVED FILTERS
-- =============================================
CREATE TABLE IF NOT EXISTS roadmap_filters (
    id SERIAL PRIMARY KEY,
    project_id INTEGER,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    filter_config JSONB NOT NULL,
    is_shared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES roadmap_projects(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- PROJECT KEY SEQUENCE (PRJ-1, PRJ-2, etc.)
-- =============================================
ALTER TABLE roadmap_projects ADD COLUMN IF NOT EXISTS project_key TEXT;
ALTER TABLE roadmap_projects ADD COLUMN IF NOT EXISTS issue_counter INTEGER DEFAULT 0;

-- =============================================
-- PROJECT TYPE & ACCESS CONTROL
-- =============================================
ALTER TABLE roadmap_projects ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'personal';
-- project_type: 'personal' (only owner + invited members) | 'general' (visible to all with roadmap access)

-- Roadmap User Access (admin-managed per-user access to Roadmap feature)
CREATE TABLE IF NOT EXISTS roadmap_user_access (
    user_id INTEGER PRIMARY KEY,
    access_level TEXT DEFAULT 'member',
    -- access_level: 'none' | 'viewer' | 'member' | 'manager' | 'admin'
    -- none = no access, viewer = read-only, member = create tasks, manager = create projects, admin = full
    can_create_projects BOOLEAN DEFAULT FALSE,
    granted_by INTEGER,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(granted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Calendar-Roadmap quick link: map calendar events to roadmap issues bidirectionally
CREATE TABLE IF NOT EXISTS roadmap_calendar_links (
    id SERIAL PRIMARY KEY,
    calendar_event_id TEXT NOT NULL,
    issue_id INTEGER NOT NULL,
    linked_by INTEGER NOT NULL,
    link_direction TEXT DEFAULT 'both',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(issue_id) REFERENCES roadmap_issues(id) ON DELETE CASCADE,
    FOREIGN KEY(linked_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(calendar_event_id, issue_id)
);
