--
-- PostgreSQL database dump
--

\restrict zFSUjsrxJHGCwqlA4NXAG4ijqATZeTscsfzDPs5c8t2qe2NnwZb6uMhV1NnuAXj

-- Dumped from database version 15.17 (Debian 15.17-1.pgdg13+1)
-- Dumped by pg_dump version 15.17 (Debian 15.17-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.user_credentials DROP CONSTRAINT IF EXISTS user_credentials_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.security_settings DROP CONSTRAINT IF EXISTS security_settings_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_watchers DROP CONSTRAINT IF EXISTS roadmap_watchers_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_watchers DROP CONSTRAINT IF EXISTS roadmap_watchers_issue_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_user_access DROP CONSTRAINT IF EXISTS roadmap_user_access_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_time_logs DROP CONSTRAINT IF EXISTS roadmap_time_logs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_time_logs DROP CONSTRAINT IF EXISTS roadmap_time_logs_issue_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_subtasks DROP CONSTRAINT IF EXISTS roadmap_subtasks_issue_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_subtasks DROP CONSTRAINT IF EXISTS roadmap_subtasks_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_subtasks DROP CONSTRAINT IF EXISTS roadmap_subtasks_assigned_to_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_sprints DROP CONSTRAINT IF EXISTS roadmap_sprints_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_sprints DROP CONSTRAINT IF EXISTS roadmap_sprints_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_sprint_burndown DROP CONSTRAINT IF EXISTS roadmap_sprint_burndown_sprint_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_projects DROP CONSTRAINT IF EXISTS roadmap_projects_owner_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_milestones DROP CONSTRAINT IF EXISTS roadmap_milestones_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_members DROP CONSTRAINT IF EXISTS roadmap_members_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_members DROP CONSTRAINT IF EXISTS roadmap_members_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_issues DROP CONSTRAINT IF EXISTS roadmap_issues_reporter_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_issues DROP CONSTRAINT IF EXISTS roadmap_issues_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_issues DROP CONSTRAINT IF EXISTS roadmap_issues_parent_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_issues DROP CONSTRAINT IF EXISTS roadmap_issues_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_issues DROP CONSTRAINT IF EXISTS roadmap_issues_column_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_issues DROP CONSTRAINT IF EXISTS roadmap_issues_assigned_to_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_issue_links DROP CONSTRAINT IF EXISTS roadmap_issue_links_target_issue_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_issue_links DROP CONSTRAINT IF EXISTS roadmap_issue_links_source_issue_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_issue_links DROP CONSTRAINT IF EXISTS roadmap_issue_links_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_issue_history DROP CONSTRAINT IF EXISTS roadmap_issue_history_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_issue_history DROP CONSTRAINT IF EXISTS roadmap_issue_history_issue_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_issue_events DROP CONSTRAINT IF EXISTS roadmap_issue_events_issue_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_issue_documents DROP CONSTRAINT IF EXISTS roadmap_issue_documents_linked_by_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_issue_documents DROP CONSTRAINT IF EXISTS roadmap_issue_documents_issue_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_filters DROP CONSTRAINT IF EXISTS roadmap_filters_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_filters DROP CONSTRAINT IF EXISTS roadmap_filters_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_custom_fields DROP CONSTRAINT IF EXISTS roadmap_custom_fields_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_custom_field_values DROP CONSTRAINT IF EXISTS roadmap_custom_field_values_issue_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_custom_field_values DROP CONSTRAINT IF EXISTS roadmap_custom_field_values_field_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_comments DROP CONSTRAINT IF EXISTS roadmap_comments_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_comments DROP CONSTRAINT IF EXISTS roadmap_comments_issue_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_columns DROP CONSTRAINT IF EXISTS roadmap_columns_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_calendar_links DROP CONSTRAINT IF EXISTS roadmap_calendar_links_linked_by_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_calendar_links DROP CONSTRAINT IF EXISTS roadmap_calendar_links_issue_id_fkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_activity DROP CONSTRAINT IF EXISTS roadmap_activity_project_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.group_members DROP CONSTRAINT IF EXISTS group_members_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.group_members DROP CONSTRAINT IF EXISTS group_members_group_id_fkey;
ALTER TABLE IF EXISTS ONLY public.folders DROP CONSTRAINT IF EXISTS folders_parent_id_fkey;
ALTER TABLE IF EXISTS ONLY public.folders DROP CONSTRAINT IF EXISTS folders_owner_id_fkey;
ALTER TABLE IF EXISTS ONLY public.files DROP CONSTRAINT IF EXISTS files_owner_id_fkey;
ALTER TABLE IF EXISTS ONLY public.files DROP CONSTRAINT IF EXISTS files_folder_id_fkey;
ALTER TABLE IF EXISTS ONLY public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.admin_inbox DROP CONSTRAINT IF EXISTS admin_inbox_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.windows_user_links DROP CONSTRAINT IF EXISTS windows_user_links_windows_username_key;
ALTER TABLE IF EXISTS ONLY public.windows_user_links DROP CONSTRAINT IF EXISTS windows_user_links_pkey;
ALTER TABLE IF EXISTS ONLY public.windows_user_links DROP CONSTRAINT IF EXISTS windows_user_links_cloud_username_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.user_credentials DROP CONSTRAINT IF EXISTS user_credentials_pkey;
ALTER TABLE IF EXISTS ONLY public.shared_files DROP CONSTRAINT IF EXISTS shared_files_pkey;
ALTER TABLE IF EXISTS ONLY public.shared_files DROP CONSTRAINT IF EXISTS shared_files_path_owner_username_shared_with_username_key;
ALTER TABLE IF EXISTS ONLY public.security_settings DROP CONSTRAINT IF EXISTS security_settings_user_id_key;
ALTER TABLE IF EXISTS ONLY public.security_settings DROP CONSTRAINT IF EXISTS security_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_watchers DROP CONSTRAINT IF EXISTS roadmap_watchers_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_user_access DROP CONSTRAINT IF EXISTS roadmap_user_access_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_time_logs DROP CONSTRAINT IF EXISTS roadmap_time_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_subtasks DROP CONSTRAINT IF EXISTS roadmap_subtasks_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_sprints DROP CONSTRAINT IF EXISTS roadmap_sprints_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_sprint_burndown DROP CONSTRAINT IF EXISTS roadmap_sprint_burndown_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_projects DROP CONSTRAINT IF EXISTS roadmap_projects_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_milestones DROP CONSTRAINT IF EXISTS roadmap_milestones_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_members DROP CONSTRAINT IF EXISTS roadmap_members_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_issues DROP CONSTRAINT IF EXISTS roadmap_issues_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_issue_links DROP CONSTRAINT IF EXISTS roadmap_issue_links_source_issue_id_target_issue_id_link_ty_key;
ALTER TABLE IF EXISTS ONLY public.roadmap_issue_links DROP CONSTRAINT IF EXISTS roadmap_issue_links_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_issue_history DROP CONSTRAINT IF EXISTS roadmap_issue_history_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_issue_events DROP CONSTRAINT IF EXISTS roadmap_issue_events_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_issue_documents DROP CONSTRAINT IF EXISTS roadmap_issue_documents_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_filters DROP CONSTRAINT IF EXISTS roadmap_filters_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_custom_fields DROP CONSTRAINT IF EXISTS roadmap_custom_fields_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_custom_field_values DROP CONSTRAINT IF EXISTS roadmap_custom_field_values_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_custom_field_values DROP CONSTRAINT IF EXISTS roadmap_custom_field_values_issue_id_field_id_key;
ALTER TABLE IF EXISTS ONLY public.roadmap_comments DROP CONSTRAINT IF EXISTS roadmap_comments_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_columns DROP CONSTRAINT IF EXISTS roadmap_columns_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_calendar_links DROP CONSTRAINT IF EXISTS roadmap_calendar_links_pkey;
ALTER TABLE IF EXISTS ONLY public.roadmap_calendar_links DROP CONSTRAINT IF EXISTS roadmap_calendar_links_calendar_event_id_issue_id_key;
ALTER TABLE IF EXISTS ONLY public.roadmap_activity DROP CONSTRAINT IF EXISTS roadmap_activity_pkey;
ALTER TABLE IF EXISTS ONLY public.rdp_settings DROP CONSTRAINT IF EXISTS rdp_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.rdp_connections DROP CONSTRAINT IF EXISTS rdp_connections_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.groups DROP CONSTRAINT IF EXISTS groups_pkey;
ALTER TABLE IF EXISTS ONLY public.group_members DROP CONSTRAINT IF EXISTS group_members_pkey;
ALTER TABLE IF EXISTS ONLY public.folders DROP CONSTRAINT IF EXISTS folders_pkey;
ALTER TABLE IF EXISTS ONLY public.folder_metadata DROP CONSTRAINT IF EXISTS folder_metadata_username_folder_path_key;
ALTER TABLE IF EXISTS ONLY public.folder_metadata DROP CONSTRAINT IF EXISTS folder_metadata_pkey;
ALTER TABLE IF EXISTS ONLY public.files DROP CONSTRAINT IF EXISTS files_pkey;
ALTER TABLE IF EXISTS ONLY public.event_attachments DROP CONSTRAINT IF EXISTS event_attachments_pkey;
ALTER TABLE IF EXISTS ONLY public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_pkey;
ALTER TABLE IF EXISTS ONLY public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_microsoft_id_key;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.ai_exclusions DROP CONSTRAINT IF EXISTS ai_exclusions_username_path_key;
ALTER TABLE IF EXISTS ONLY public.ai_exclusions DROP CONSTRAINT IF EXISTS ai_exclusions_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_inbox DROP CONSTRAINT IF EXISTS admin_inbox_pkey;
ALTER TABLE IF EXISTS public.windows_user_links ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.shared_files ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.security_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roadmap_time_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roadmap_subtasks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roadmap_sprints ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roadmap_sprint_burndown ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roadmap_projects ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roadmap_milestones ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roadmap_issues ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roadmap_issue_links ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roadmap_issue_history ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roadmap_issue_events ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roadmap_issue_documents ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roadmap_filters ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roadmap_custom_fields ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roadmap_custom_field_values ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roadmap_comments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roadmap_columns ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roadmap_calendar_links ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roadmap_activity ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.rdp_connections ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.notifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.groups ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.folders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.folder_metadata ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.files ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.event_attachments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.calendar_events ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.audit_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.ai_exclusions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.admin_inbox ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.windows_user_links_id_seq;
DROP TABLE IF EXISTS public.windows_user_links;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.user_credentials;
DROP SEQUENCE IF EXISTS public.shared_files_id_seq;
DROP TABLE IF EXISTS public.shared_files;
DROP SEQUENCE IF EXISTS public.security_settings_id_seq;
DROP TABLE IF EXISTS public.security_settings;
DROP TABLE IF EXISTS public.roadmap_watchers;
DROP TABLE IF EXISTS public.roadmap_user_access;
DROP SEQUENCE IF EXISTS public.roadmap_time_logs_id_seq;
DROP TABLE IF EXISTS public.roadmap_time_logs;
DROP SEQUENCE IF EXISTS public.roadmap_subtasks_id_seq;
DROP TABLE IF EXISTS public.roadmap_subtasks;
DROP SEQUENCE IF EXISTS public.roadmap_sprints_id_seq;
DROP TABLE IF EXISTS public.roadmap_sprints;
DROP SEQUENCE IF EXISTS public.roadmap_sprint_burndown_id_seq;
DROP TABLE IF EXISTS public.roadmap_sprint_burndown;
DROP SEQUENCE IF EXISTS public.roadmap_projects_id_seq;
DROP TABLE IF EXISTS public.roadmap_projects;
DROP SEQUENCE IF EXISTS public.roadmap_milestones_id_seq;
DROP TABLE IF EXISTS public.roadmap_milestones;
DROP TABLE IF EXISTS public.roadmap_members;
DROP SEQUENCE IF EXISTS public.roadmap_issues_id_seq;
DROP TABLE IF EXISTS public.roadmap_issues;
DROP SEQUENCE IF EXISTS public.roadmap_issue_links_id_seq;
DROP TABLE IF EXISTS public.roadmap_issue_links;
DROP SEQUENCE IF EXISTS public.roadmap_issue_history_id_seq;
DROP TABLE IF EXISTS public.roadmap_issue_history;
DROP SEQUENCE IF EXISTS public.roadmap_issue_events_id_seq;
DROP TABLE IF EXISTS public.roadmap_issue_events;
DROP SEQUENCE IF EXISTS public.roadmap_issue_documents_id_seq;
DROP TABLE IF EXISTS public.roadmap_issue_documents;
DROP SEQUENCE IF EXISTS public.roadmap_filters_id_seq;
DROP TABLE IF EXISTS public.roadmap_filters;
DROP SEQUENCE IF EXISTS public.roadmap_custom_fields_id_seq;
DROP TABLE IF EXISTS public.roadmap_custom_fields;
DROP SEQUENCE IF EXISTS public.roadmap_custom_field_values_id_seq;
DROP TABLE IF EXISTS public.roadmap_custom_field_values;
DROP SEQUENCE IF EXISTS public.roadmap_comments_id_seq;
DROP TABLE IF EXISTS public.roadmap_comments;
DROP SEQUENCE IF EXISTS public.roadmap_columns_id_seq;
DROP TABLE IF EXISTS public.roadmap_columns;
DROP SEQUENCE IF EXISTS public.roadmap_calendar_links_id_seq;
DROP TABLE IF EXISTS public.roadmap_calendar_links;
DROP SEQUENCE IF EXISTS public.roadmap_activity_id_seq;
DROP TABLE IF EXISTS public.roadmap_activity;
DROP TABLE IF EXISTS public.rdp_settings;
DROP SEQUENCE IF EXISTS public.rdp_connections_id_seq;
DROP TABLE IF EXISTS public.rdp_connections;
DROP SEQUENCE IF EXISTS public.notifications_id_seq;
DROP TABLE IF EXISTS public.notifications;
DROP SEQUENCE IF EXISTS public.groups_id_seq;
DROP TABLE IF EXISTS public.groups;
DROP TABLE IF EXISTS public.group_members;
DROP SEQUENCE IF EXISTS public.folders_id_seq;
DROP TABLE IF EXISTS public.folders;
DROP SEQUENCE IF EXISTS public.folder_metadata_id_seq;
DROP TABLE IF EXISTS public.folder_metadata;
DROP SEQUENCE IF EXISTS public.files_id_seq;
DROP TABLE IF EXISTS public.files;
DROP SEQUENCE IF EXISTS public.event_attachments_id_seq;
DROP TABLE IF EXISTS public.event_attachments;
DROP SEQUENCE IF EXISTS public.calendar_events_id_seq;
DROP TABLE IF EXISTS public.calendar_events;
DROP SEQUENCE IF EXISTS public.audit_logs_id_seq;
DROP TABLE IF EXISTS public.audit_logs;
DROP SEQUENCE IF EXISTS public.ai_exclusions_id_seq;
DROP TABLE IF EXISTS public.ai_exclusions;
DROP SEQUENCE IF EXISTS public.admin_inbox_id_seq;
DROP TABLE IF EXISTS public.admin_inbox;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_inbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_inbox (
    id integer NOT NULL,
    type text NOT NULL,
    user_id integer,
    message text,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: admin_inbox_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_inbox_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_inbox_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_inbox_id_seq OWNED BY public.admin_inbox.id;


--
-- Name: ai_exclusions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_exclusions (
    id integer NOT NULL,
    username text NOT NULL,
    path text NOT NULL
);


--
-- Name: ai_exclusions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_exclusions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_exclusions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_exclusions_id_seq OWNED BY public.ai_exclusions.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    username text,
    action text NOT NULL,
    details text,
    ip_address text,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_events (
    id integer NOT NULL,
    microsoft_id text,
    user_id integer,
    subject text,
    body_preview text,
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    is_all_day boolean,
    location text,
    web_link text,
    categories text,
    assigned_by text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_synced timestamp without time zone
);


--
-- Name: calendar_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.calendar_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: calendar_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.calendar_events_id_seq OWNED BY public.calendar_events.id;


--
-- Name: event_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_attachments (
    id integer NOT NULL,
    event_id character varying(255) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    file_owner character varying(255) NOT NULL,
    attached_by character varying(255) NOT NULL,
    file_size integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: event_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.event_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.event_attachments_id_seq OWNED BY public.event_attachments.id;


--
-- Name: files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.files (
    id integer NOT NULL,
    folder_id integer,
    name text NOT NULL,
    physical_path text,
    size integer,
    mime_type text,
    owner_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.files_id_seq OWNED BY public.files.id;


--
-- Name: folder_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.folder_metadata (
    id integer NOT NULL,
    username text NOT NULL,
    folder_path text NOT NULL,
    color text DEFAULT '#5f9ee9'::text,
    icon text DEFAULT 'default'::text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: folder_metadata_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.folder_metadata_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: folder_metadata_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.folder_metadata_id_seq OWNED BY public.folder_metadata.id;


--
-- Name: folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.folders (
    id integer NOT NULL,
    parent_id integer,
    name text NOT NULL,
    owner_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: folders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.folders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: folders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.folders_id_seq OWNED BY public.folders.id;


--
-- Name: group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_members (
    group_id integer NOT NULL,
    user_id integer NOT NULL,
    role text DEFAULT 'member'::text,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.groups_id_seq OWNED BY public.groups.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    message text,
    type text DEFAULT 'info'::text,
    is_read boolean DEFAULT false,
    link text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    metadata jsonb
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: rdp_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rdp_connections (
    id integer NOT NULL,
    user_id integer DEFAULT 1 NOT NULL,
    server_id text DEFAULT ''::text NOT NULL,
    name character varying(255) NOT NULL,
    hostname character varying(255) NOT NULL,
    port integer DEFAULT 3389,
    username character varying(255),
    password character varying(255),
    protocol character varying(50) DEFAULT 'rdp'::character varying,
    virtual_ip character varying(50),
    public_key character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    security character varying(20) DEFAULT 'any'::character varying,
    domain character varying(255),
    ignore_cert boolean DEFAULT true,
    enable_drive boolean DEFAULT false,
    drive_path character varying(255),
    enable_audio boolean DEFAULT false,
    password_encrypted text,
    last_used timestamp without time zone,
    is_active boolean DEFAULT true
);


--
-- Name: rdp_connections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rdp_connections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rdp_connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rdp_connections_id_seq OWNED BY public.rdp_connections.id;


--
-- Name: rdp_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rdp_settings (
    setting_key character varying(50) NOT NULL,
    setting_value character varying(255)
);


--
-- Name: roadmap_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_activity (
    id integer NOT NULL,
    project_id integer NOT NULL,
    issue_id integer,
    user_id integer,
    action text NOT NULL,
    details jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roadmap_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_activity_id_seq OWNED BY public.roadmap_activity.id;


--
-- Name: roadmap_calendar_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_calendar_links (
    id integer NOT NULL,
    calendar_event_id text NOT NULL,
    issue_id integer NOT NULL,
    linked_by integer NOT NULL,
    link_direction text DEFAULT 'both'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roadmap_calendar_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_calendar_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_calendar_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_calendar_links_id_seq OWNED BY public.roadmap_calendar_links.id;


--
-- Name: roadmap_columns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_columns (
    id integer NOT NULL,
    project_id integer NOT NULL,
    name text NOT NULL,
    "position" integer DEFAULT 0,
    color text DEFAULT '#5f9ee9'::text,
    wip_limit integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roadmap_columns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_columns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_columns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_columns_id_seq OWNED BY public.roadmap_columns.id;


--
-- Name: roadmap_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_comments (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roadmap_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_comments_id_seq OWNED BY public.roadmap_comments.id;


--
-- Name: roadmap_custom_field_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_custom_field_values (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    field_id integer NOT NULL,
    value text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roadmap_custom_field_values_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_custom_field_values_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_custom_field_values_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_custom_field_values_id_seq OWNED BY public.roadmap_custom_field_values.id;


--
-- Name: roadmap_custom_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_custom_fields (
    id integer NOT NULL,
    project_id integer NOT NULL,
    name text NOT NULL,
    field_type text DEFAULT 'text'::text NOT NULL,
    options jsonb,
    is_required boolean DEFAULT false,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roadmap_custom_fields_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_custom_fields_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_custom_fields_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_custom_fields_id_seq OWNED BY public.roadmap_custom_fields.id;


--
-- Name: roadmap_filters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_filters (
    id integer NOT NULL,
    project_id integer,
    user_id integer NOT NULL,
    name text NOT NULL,
    filter_config jsonb NOT NULL,
    is_shared boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roadmap_filters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_filters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_filters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_filters_id_seq OWNED BY public.roadmap_filters.id;


--
-- Name: roadmap_issue_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_issue_documents (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    file_id integer,
    file_path text,
    file_name text NOT NULL,
    linked_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roadmap_issue_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_issue_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_issue_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_issue_documents_id_seq OWNED BY public.roadmap_issue_documents.id;


--
-- Name: roadmap_issue_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_issue_events (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    event_id text NOT NULL,
    provider text DEFAULT 'outlook'::text,
    sync_direction text DEFAULT 'both'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roadmap_issue_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_issue_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_issue_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_issue_events_id_seq OWNED BY public.roadmap_issue_events.id;


--
-- Name: roadmap_issue_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_issue_history (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    user_id integer NOT NULL,
    field_name text NOT NULL,
    old_value text,
    new_value text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roadmap_issue_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_issue_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_issue_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_issue_history_id_seq OWNED BY public.roadmap_issue_history.id;


--
-- Name: roadmap_issue_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_issue_links (
    id integer NOT NULL,
    source_issue_id integer NOT NULL,
    target_issue_id integer NOT NULL,
    link_type text NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roadmap_issue_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_issue_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_issue_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_issue_links_id_seq OWNED BY public.roadmap_issue_links.id;


--
-- Name: roadmap_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_issues (
    id integer NOT NULL,
    project_id integer NOT NULL,
    column_id integer NOT NULL,
    title text NOT NULL,
    description text,
    issue_type text DEFAULT 'task'::text,
    issue_key text,
    priority text DEFAULT 'medium'::text,
    assigned_to integer,
    reporter_id integer,
    created_by integer NOT NULL,
    due_date timestamp without time zone,
    start_date timestamp without time zone,
    "position" integer DEFAULT 0,
    labels text DEFAULT '[]'::text,
    story_points numeric(5,1) DEFAULT 0,
    estimated_hours numeric(6,2) DEFAULT 0,
    logged_hours numeric(8,2) DEFAULT 0,
    remaining_hours numeric(6,2) DEFAULT 0,
    status text DEFAULT 'open'::text,
    resolution text,
    sprint_id integer,
    epic_id integer,
    parent_id integer,
    calendar_event_id text,
    environment text,
    acceptance_criteria text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone,
    calendar_sync_status text DEFAULT 'not_synced'::text,
    calendar_synced_at timestamp without time zone,
    calendar_sync_error text,
    calendar_synced_hash text
);


--
-- Name: roadmap_issues_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_issues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_issues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_issues_id_seq OWNED BY public.roadmap_issues.id;


--
-- Name: roadmap_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_members (
    project_id integer NOT NULL,
    user_id integer NOT NULL,
    role text DEFAULT 'member'::text,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roadmap_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_milestones (
    id integer NOT NULL,
    project_id integer NOT NULL,
    title text NOT NULL,
    description text,
    due_date timestamp without time zone,
    status text DEFAULT 'open'::text,
    calendar_event_id text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roadmap_milestones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_milestones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_milestones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_milestones_id_seq OWNED BY public.roadmap_milestones.id;


--
-- Name: roadmap_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_projects (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    owner_id integer NOT NULL,
    status text DEFAULT 'active'::text,
    project_type text DEFAULT 'personal'::text,
    project_key text,
    issue_counter integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roadmap_projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_projects_id_seq OWNED BY public.roadmap_projects.id;


--
-- Name: roadmap_sprint_burndown; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_sprint_burndown (
    id integer NOT NULL,
    sprint_id integer NOT NULL,
    snapshot_date date NOT NULL,
    total_points numeric(6,1) DEFAULT 0,
    completed_points numeric(6,1) DEFAULT 0,
    remaining_points numeric(6,1) DEFAULT 0,
    total_issues integer DEFAULT 0,
    completed_issues integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roadmap_sprint_burndown_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_sprint_burndown_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_sprint_burndown_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_sprint_burndown_id_seq OWNED BY public.roadmap_sprint_burndown.id;


--
-- Name: roadmap_sprints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_sprints (
    id integer NOT NULL,
    project_id integer NOT NULL,
    name text NOT NULL,
    goal text,
    status text DEFAULT 'planning'::text,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    velocity numeric(6,1) DEFAULT 0,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone
);


--
-- Name: roadmap_sprints_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_sprints_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_sprints_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_sprints_id_seq OWNED BY public.roadmap_sprints.id;


--
-- Name: roadmap_subtasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_subtasks (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    title text NOT NULL,
    is_completed boolean DEFAULT false,
    assigned_to integer,
    "position" integer DEFAULT 0,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone
);


--
-- Name: roadmap_subtasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_subtasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_subtasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_subtasks_id_seq OWNED BY public.roadmap_subtasks.id;


--
-- Name: roadmap_time_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_time_logs (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    user_id integer NOT NULL,
    hours numeric(6,2) NOT NULL,
    description text,
    work_date date DEFAULT CURRENT_DATE,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roadmap_time_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roadmap_time_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roadmap_time_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roadmap_time_logs_id_seq OWNED BY public.roadmap_time_logs.id;


--
-- Name: roadmap_user_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_user_access (
    user_id integer NOT NULL,
    access_level text DEFAULT 'member'::text,
    can_create_projects boolean DEFAULT false,
    granted_by integer,
    granted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roadmap_watchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_watchers (
    issue_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: security_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_settings (
    id integer NOT NULL,
    user_id integer,
    recovery_email_enc text,
    recovery_email_iv text
);


--
-- Name: security_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.security_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: security_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.security_settings_id_seq OWNED BY public.security_settings.id;


--
-- Name: shared_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shared_files (
    id integer NOT NULL,
    path text NOT NULL,
    owner_username text NOT NULL,
    shared_with_username text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    pinned_to_panel boolean DEFAULT false,
    permission text DEFAULT 'edit'::text
);


--
-- Name: shared_files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shared_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shared_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shared_files_id_seq OWNED BY public.shared_files.id;


--
-- Name: user_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_credentials (
    user_id integer NOT NULL,
    password_hash text NOT NULL,
    last_login timestamp without time zone,
    failed_attempts integer DEFAULT 0,
    is_locked boolean DEFAULT false,
    lockout_until timestamp without time zone,
    reset_token text,
    reset_token_expires timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    role text DEFAULT 'user'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    avatar_url text,
    theme_preference text DEFAULT 'light'::text,
    language text DEFAULT 'es'::text,
    notifications boolean DEFAULT true,
    microsoft_id text,
    microsoft_email text,
    microsoft_access_token text,
    microsoft_refresh_token text,
    deletion_scheduled_at timestamp without time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: windows_user_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.windows_user_links (
    id integer NOT NULL,
    cloud_username text NOT NULL,
    windows_username text NOT NULL,
    sync_enabled boolean DEFAULT true,
    sync_desktop boolean DEFAULT true,
    sync_documents boolean DEFAULT true,
    sync_downloads boolean DEFAULT true,
    linked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_sync timestamp without time zone
);


--
-- Name: windows_user_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.windows_user_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: windows_user_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.windows_user_links_id_seq OWNED BY public.windows_user_links.id;


--
-- Name: admin_inbox id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_inbox ALTER COLUMN id SET DEFAULT nextval('public.admin_inbox_id_seq'::regclass);


--
-- Name: ai_exclusions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_exclusions ALTER COLUMN id SET DEFAULT nextval('public.ai_exclusions_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: calendar_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events ALTER COLUMN id SET DEFAULT nextval('public.calendar_events_id_seq'::regclass);


--
-- Name: event_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_attachments ALTER COLUMN id SET DEFAULT nextval('public.event_attachments_id_seq'::regclass);


--
-- Name: files id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files ALTER COLUMN id SET DEFAULT nextval('public.files_id_seq'::regclass);


--
-- Name: folder_metadata id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folder_metadata ALTER COLUMN id SET DEFAULT nextval('public.folder_metadata_id_seq'::regclass);


--
-- Name: folders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folders ALTER COLUMN id SET DEFAULT nextval('public.folders_id_seq'::regclass);


--
-- Name: groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups ALTER COLUMN id SET DEFAULT nextval('public.groups_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: rdp_connections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rdp_connections ALTER COLUMN id SET DEFAULT nextval('public.rdp_connections_id_seq'::regclass);


--
-- Name: roadmap_activity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_activity ALTER COLUMN id SET DEFAULT nextval('public.roadmap_activity_id_seq'::regclass);


--
-- Name: roadmap_calendar_links id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_calendar_links ALTER COLUMN id SET DEFAULT nextval('public.roadmap_calendar_links_id_seq'::regclass);


--
-- Name: roadmap_columns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_columns ALTER COLUMN id SET DEFAULT nextval('public.roadmap_columns_id_seq'::regclass);


--
-- Name: roadmap_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_comments ALTER COLUMN id SET DEFAULT nextval('public.roadmap_comments_id_seq'::regclass);


--
-- Name: roadmap_custom_field_values id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_custom_field_values ALTER COLUMN id SET DEFAULT nextval('public.roadmap_custom_field_values_id_seq'::regclass);


--
-- Name: roadmap_custom_fields id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_custom_fields ALTER COLUMN id SET DEFAULT nextval('public.roadmap_custom_fields_id_seq'::regclass);


--
-- Name: roadmap_filters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_filters ALTER COLUMN id SET DEFAULT nextval('public.roadmap_filters_id_seq'::regclass);


--
-- Name: roadmap_issue_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issue_documents ALTER COLUMN id SET DEFAULT nextval('public.roadmap_issue_documents_id_seq'::regclass);


--
-- Name: roadmap_issue_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issue_events ALTER COLUMN id SET DEFAULT nextval('public.roadmap_issue_events_id_seq'::regclass);


--
-- Name: roadmap_issue_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issue_history ALTER COLUMN id SET DEFAULT nextval('public.roadmap_issue_history_id_seq'::regclass);


--
-- Name: roadmap_issue_links id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issue_links ALTER COLUMN id SET DEFAULT nextval('public.roadmap_issue_links_id_seq'::regclass);


--
-- Name: roadmap_issues id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issues ALTER COLUMN id SET DEFAULT nextval('public.roadmap_issues_id_seq'::regclass);


--
-- Name: roadmap_milestones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_milestones ALTER COLUMN id SET DEFAULT nextval('public.roadmap_milestones_id_seq'::regclass);


--
-- Name: roadmap_projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_projects ALTER COLUMN id SET DEFAULT nextval('public.roadmap_projects_id_seq'::regclass);


--
-- Name: roadmap_sprint_burndown id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_sprint_burndown ALTER COLUMN id SET DEFAULT nextval('public.roadmap_sprint_burndown_id_seq'::regclass);


--
-- Name: roadmap_sprints id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_sprints ALTER COLUMN id SET DEFAULT nextval('public.roadmap_sprints_id_seq'::regclass);


--
-- Name: roadmap_subtasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_subtasks ALTER COLUMN id SET DEFAULT nextval('public.roadmap_subtasks_id_seq'::regclass);


--
-- Name: roadmap_time_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_time_logs ALTER COLUMN id SET DEFAULT nextval('public.roadmap_time_logs_id_seq'::regclass);


--
-- Name: security_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_settings ALTER COLUMN id SET DEFAULT nextval('public.security_settings_id_seq'::regclass);


--
-- Name: shared_files id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_files ALTER COLUMN id SET DEFAULT nextval('public.shared_files_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: windows_user_links id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.windows_user_links ALTER COLUMN id SET DEFAULT nextval('public.windows_user_links_id_seq'::regclass);


--
-- Data for Name: admin_inbox; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_inbox (id, type, user_id, message, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: ai_exclusions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_exclusions (id, username, path) FROM stdin;
1	administrador	Escritorio/Wired_driver_31
2	administrador	Escritorio/database_storage
3	administrador	Escritorio/Datos
4	administrador	Escritorio/Base_de_datos_archivos
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, user_id, username, action, details, ip_address, "timestamp") FROM stdin;
1	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-29 15:06:07
2	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-29 15:50:30
3	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-29 15:56:01
4	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-29 15:57:24
5	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-29 15:59:48
6	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-29 16:00:05
7	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-29 16:02:11
8	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-29 16:07:33
9	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-29 16:40:07
10	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-29 16:44:53
11	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-29 16:47:19
12	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-29 16:48:17
13	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-29 16:54:04
14	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-29 17:00:56
15	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-29 17:04:14
16	2	eric	FOLDER_CREATE	Creada carpeta: si	::1	2025-12-29 20:44:22
17	2	eric	FOLDER_DELETE	Eliminada carpeta: si	::1	2025-12-29 20:45:31
18	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-29 21:49:53
19	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-31 11:55:11
20	2	eric	FILE_DELETE	Eliminado archivo: Documento.docx	::1	2025-12-31 12:36:05
21	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-31 16:32:20
22	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-31 17:08:06
23	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-31 17:08:57
24	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-31 17:11:51
25	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-31 17:17:38
26	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-31 17:18:01
27	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-31 17:18:21
28	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-31 17:35:53
29	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 17:35:54
30	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 17:35:54
31	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 17:35:54
32	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (30 entradas)	::1	2025-12-31 17:35:54
33	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 17:35:54
34	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 17:35:54
35	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 17:35:54
36	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (34 entradas)	::1	2025-12-31 17:35:54
37	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 17:35:54
38	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 17:35:55
39	\N	administrador	ADMIN	[INFO] Diagn├│sticos iniciados por administrador	::1	2025-12-31 17:35:59
40	\N	administrador	ADMIN	[INFO] Diagn├│sticos completados: 5/7 exitosos	::1	2025-12-31 17:35:59
41	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 17:36:24
42	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 17:36:26
43	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-31 17:47:19
44	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-31 17:49:41
45	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 17:49:41
46	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 17:49:41
47	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 17:49:41
48	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (46 entradas)	::1	2025-12-31 17:49:41
49	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 17:49:41
50	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 17:49:41
51	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 17:49:41
52	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (50 entradas)	::1	2025-12-31 17:49:41
53	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 17:49:41
54	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 17:49:42
55	2	eric	LOGIN_FAILED	Intento fallido (1/5)	::1	2025-12-31 17:50:16
56	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-31 17:50:20
57	2	eric	PASSWORD_RECOVERY_REQUEST	Solicitud de recuperaci├│n de contrase├▒a	::1	2025-12-31 19:23:08
58	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-31 19:24:32
59	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-31 20:22:00
60	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 20:22:01
61	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 20:22:01
62	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:22:01
63	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (61 entradas)	::1	2025-12-31 20:22:01
64	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 20:22:01
65	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 20:22:01
66	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 20:22:01
67	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:22:01
68	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (67 entradas)	::1	2025-12-31 20:22:01
69	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 20:22:02
70	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 20:22:40
71	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 20:22:40
72	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 20:22:40
73	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:22:40
74	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (71 entradas)	::1	2025-12-31 20:22:40
75	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 20:22:40
76	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 20:22:40
77	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:22:41
78	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (77 entradas)	::1	2025-12-31 20:22:41
79	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 20:22:41
80	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 20:23:21
81	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 20:23:21
82	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:23:21
83	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (81 entradas)	::1	2025-12-31 20:23:21
84	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 20:23:22
85	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 20:23:22
86	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 20:23:22
87	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:23:22
88	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (86 entradas)	::1	2025-12-31 20:23:22
89	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 20:23:22
90	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 20:23:30
91	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 20:23:30
92	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:23:30
93	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (91 entradas)	::1	2025-12-31 20:23:30
94	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 20:23:30
95	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 20:23:47
96	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 20:23:47
97	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:23:47
98	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (96 entradas)	::1	2025-12-31 20:23:47
99	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 20:23:47
100	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 20:26:21
101	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 20:26:21
102	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:26:21
103	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (100 entradas)	::1	2025-12-31 20:26:21
104	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 20:26:21
105	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 20:26:22
106	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 20:26:22
107	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:26:22
108	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (100 entradas)	::1	2025-12-31 20:26:22
109	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 20:26:22
110	2	eric	LOGIN_FAILED	Intento fallido (1/5)	::1	2025-12-31 20:27:10
111	2	eric	LOGIN_FAILED	Intento fallido (2/5)	::1	2025-12-31 20:27:10
112	2	eric	LOGIN_FAILED	Intento fallido (3/5)	::1	2025-12-31 20:27:11
113	2	eric	LOGIN_FAILED	Intento fallido (4/5)	::1	2025-12-31 20:27:12
114	1	administrador	LOGIN_FAILED	Intento fallido (1/5)	::1	2025-12-31 20:27:25
115	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-31 20:27:31
116	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 20:27:31
117	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 20:27:31
118	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:27:31
119	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (100 entradas)	::1	2025-12-31 20:27:31
120	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 20:27:31
121	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 20:27:32
122	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 20:27:32
123	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:27:32
124	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (100 entradas)	::1	2025-12-31 20:27:32
125	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 20:27:32
126	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-31 20:28:09
127	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 20:28:09
128	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 20:28:09
129	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:28:10
130	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (100 entradas)	::1	2025-12-31 20:28:10
131	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 20:28:10
132	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 20:28:10
133	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:28:10
134	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 20:28:10
135	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (100 entradas)	::1	2025-12-31 20:28:10
445	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-20 09:55:39.966445
136	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 20:28:11
137	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 20:28:15
138	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 20:28:15
139	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:28:15
140	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (100 entradas)	::1	2025-12-31 20:28:15
141	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 20:28:16
142	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 20:35:15
143	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 20:35:15
144	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:35:15
145	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (100 entradas)	::1	2025-12-31 20:35:15
146	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 20:35:15
147	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 20:35:15
148	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 20:35:15
149	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:35:15
150	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (100 entradas)	::1	2025-12-31 20:35:15
151	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 20:35:16
152	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-31 20:36:01
153	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 20:36:01
154	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 20:36:01
155	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:36:01
156	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (100 entradas)	::1	2025-12-31 20:36:01
157	\N	administrador	ADMIN	[INFO] Informaci├│n del servidor solicitada por administrador	::1	2025-12-31 20:36:02
158	\N	administrador	ADMIN	[INFO] Estad├¡sticas de conexiones solicitadas por administrador	::1	2025-12-31 20:36:02
159	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:36:02
160	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 20:36:02
161	\N	administrador	ADMIN	[INFO] Logs solicitados por administrador (100 entradas)	::1	2025-12-31 20:36:02
162	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2025-12-31 20:36:03
163	\N	administrador	ADMIN	[INFO] Usuario 'eric' desbloqueado por administrador	::1	2025-12-31 20:36:10
164	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2025-12-31 20:36:11
165	2	eric	LOGIN_FAILED	Intento fallido (1/5)	::1	2025-12-31 20:36:18
166	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2025-12-31 20:36:21
167	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-18 16:37:05.471065
168	2	eric	FILE_OPEN	Abierto archivo: Documento.docx	::1	2026-04-18 16:37:13.742401
169	2	eric	FILE_EDIT	Editado archivo: Documento.docx	::1	2026-04-19 01:03:26.845689
170	2	eric	FILE_OPEN	Abierto archivo: Documento.docx	::1	2026-04-19 01:03:30.493227
171	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-19 01:04:58.391174
172	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-19 01:05:00.737521
173	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-19 01:07:11.242576
174	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-19 11:10:24.224488
175	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-19 11:54:46.48709
176	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-19 11:55:56.172131
177	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 11:55:56.353804
178	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-19 11:55:56.459533
179	1	administrador	RATE_LIMIT_CLEAR	IP desbloqueada: ::ffff:172.18.0.2	::1	2026-04-19 11:56:19.806782
180	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 12:16:59.691861
181	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-19 12:16:59.722182
182	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-19 12:27:50.590585
183	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 12:27:50.603158
184	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 12:27:51.924788
185	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 12:27:56.938493
186	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 12:28:01.940469
187	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 12:28:06.933554
188	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 12:28:11.969001
189	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-19 12:31:19.798291
190	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-19 12:33:33.406446
191	2	eric	CREATE_FILE	Creado archivo: Presentaci├│n.pptx	::1	2026-04-19 12:42:31.188694
192	2	eric	FILE_EDIT	Editado archivo: Presentaci├│n.pptx	::1	2026-04-19 12:42:46.805487
193	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-19 14:23:29.501664
194	2	eric	FILE_OPEN	Abierto archivo: Presentaci├│n.pptx	::1	2026-04-19 14:24:03.219292
195	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-19 15:29:19.762511
196	2	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-19 15:46:34.003711
197	2	eric	FILE_SHARE	Compartido Presentaci├│n.pptx con administrador	::1	2026-04-19 16:11:07.074139
198	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-19 16:11:35.868917
199	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:11:40.609523
200	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-19 16:11:40.993262
201	1	administrador	FILE_OPEN	Abierto archivo: Presentaci├│n.pptx (compartido por eric)	::1	2026-04-19 16:11:49.969439
202	1	administrador	FILE_OPEN	Abierto archivo: Presentaci├│n.pptx (compartido por eric)	::1	2026-04-19 16:12:23.486136
203	1	administrador	CREATE_FILE	Creado archivo: Hoja de c├ílculo.xlsx	::1	2026-04-19 16:12:36.537456
204	1	administrador	FILE_OPEN	Abierto archivo: Hoja de c├ílculo.xlsx	::1	2026-04-19 16:12:37.57785
205	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-19 16:33:09.556253
206	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-19 16:33:09.670239
207	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:33:09.676862
208	\N	administrador	ADMIN	[WARNING] Eliminaci├│n programada para usuario ID 2	::1	2026-04-19 16:33:43.678342
209	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-19 16:33:43.710837
210	1	administrador	LOGIN_FAILED	Intento fallido (1/5)	::1	2026-04-19 16:34:12.971782
211	1	administrador	LOGIN_FAILED	Intento fallido (2/5)	::1	2026-04-19 16:34:18.394825
212	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:53:30.005653
213	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-19 16:53:30.006152
214	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-19 16:53:45.668459
215	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:53:45.680538
216	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:53:55.65412
217	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:54:05.67773
218	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:54:15.674001
219	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:54:25.659428
220	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:54:35.658098
221	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:54:45.664807
222	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:54:55.749566
223	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:55:05.671733
224	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:55:15.700025
225	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:55:25.654341
226	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:55:35.752923
227	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:55:45.656636
228	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:55:55.653231
229	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:56:05.664001
230	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:56:15.657896
231	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:56:25.667366
232	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:56:35.663938
233	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:56:45.662993
234	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:56:55.662262
235	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:57:05.667082
236	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:57:15.665595
237	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:57:25.66072
238	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:57:35.655363
239	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-19 16:57:46.206629
240	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 16:57:46.245867
241	\N	system	SYSTEM	[CRITICAL] Usuario eliminado autom├íticamente: eric (solo acceso web)	::1	2026-04-19 17:04:46.34844
242	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 17:40:14.608791
243	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (1 usuarios)	::1	2026-04-19 17:40:14.787193
244	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-19 17:40:22.597676
245	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (1 usuarios)	::1	2026-04-19 17:40:22.798089
246	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 17:40:22.812976
247	1	administrador	FILE_OPEN	Abierto archivo: Hoja de c├ílculo.xlsx	::1	2026-04-19 17:41:51.0581
248	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (1 usuarios)	::1	2026-04-19 17:51:24.184483
249	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 17:51:24.184303
250	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 17:51:26.847211
251	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (1 usuarios)	::1	2026-04-19 18:50:21.670337
252	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-19 18:50:21.690594
253	1	administrador	FILE_OPEN	Abierto archivo: Hoja de c├ílculo.xlsx	::1	2026-04-19 20:00:40.833066
254	1	administrador	FILE_EDIT	Editado archivo: Hoja de c├ílculo.xlsx	::1	2026-04-19 20:00:51.129003
255	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-19 20:01:28.132144
256	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-19 20:01:46.90912
257	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-19 20:02:01.829713
286	1	administrador	FILE_EDIT	Editado archivo: ´┐¢^|	::1	2026-04-19 20:58:55.483511
287	1	administrador	FILE_DELETE	Eliminado archivo: ´┐¢^|	::1	2026-04-19 21:24:22.492729
288	\N	eric	FILE_OPEN	Abierto archivo: Presentaci├│n.pptx	::1	2026-04-20 06:40:50.166739
289	\N	eric	FILE_OPEN	Abierto archivo: Documento.docx	::1	2026-04-20 06:40:53.876967
290	\N	eric	FILE_OPEN	Abierto archivo: Documento.docx	::1	2026-04-20 06:41:03.228471
291	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-20 06:42:21.311041
292	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 06:42:21.613759
293	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (1 usuarios)	::1	2026-04-20 06:42:21.627761
294	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-20 06:42:44.838098
295	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (1 usuarios)	::1	2026-04-20 06:42:45.38466
297	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (1 usuarios)	::1	2026-04-20 09:14:56.189565
421	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:42:12.460305
446	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:55:40.089442
498	1	administrador	FILE_UPLOAD	Subido archivo: Documentos/sub.txt	::1	2026-04-22 11:05:48.820098
499	1	administrador	FILE_DELETE	Eliminado archivo: Documentos/sub.txt	::1	2026-04-22 11:05:49.10087
539	3	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-22 14:58:04.247426
298	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:14:56.207356
422	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:43:12.469759
447	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-20 09:55:40.093936
540	3	eric	FILE_OPEN	Abierto archivo: Documento.docx	::1	2026-04-22 15:38:46.034006
543	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-22 16:42:18.131197
579	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-22 17:01:17.318086
586	1	administrador	FILE_UNSHARE	Dejado de compartir Presentaci├│n.pptx con eric	::1	2026-04-22 17:38:17.865409
588	1	administrador	FILE_UNSHARE_ALL	Dejado de compartir Presentaci├│n.pptx con todos (1)	::1	2026-04-22 17:52:05.208724
589	1	administrador	FILE_SHARE	Compartido Presentaci├│n.pptx con eric (edit)	::1	2026-04-22 17:52:35.229572
590	1	administrador	FILE_DELETE	Eliminado archivo: Presentaci├│n.pptx	::1	2026-04-22 19:45:17.209172
591	1	administrador	FILE_DELETE	Eliminado archivo: Hoja de c├ílculo.xlsx	::1	2026-04-22 19:45:23.036798
592	1	administrador	FILE_UPLOAD	Subido archivo: Calendario.Panel.png	::1	2026-04-22 19:45:26.794378
602	3	eric	LOGIN_FAILED	Intento fallido (1/5)	::1	2026-04-23 08:59:17.29503
603	3	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-23 08:59:23.508593
605	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-23 09:07:24.649471
625	3	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-23 14:14:33.532476
299	1	administrador	FILE_EDIT	Editado archivo: Hoja de c├ílculo.xlsx	::1	2026-04-20 09:19:53.277927
423	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:44:12.482603
448	1	administrador	SAVE_SHARED_TO_MY_FILES	Copied shared file Documento.docx from eric to own files as Documento.docx	::1	2026-04-20 09:55:50.518029
541	3	eric	FILE_OPEN	Abierto archivo: Documento.docx	::1	2026-04-22 15:38:49.037962
544	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-22 16:42:18.539874
580	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-22 17:01:17.271719
587	1	administrador	FILE_SHARE	Compartido Presentaci├│n.pptx con eric (edit)	::1	2026-04-22 17:38:41.019811
593	1	administrador	CREATE_FILE	Creado archivo: Hoja de c├ílculo.xlsx	::1	2026-04-22 19:45:39.402935
604	3	eric	FOLDER_CUSTOMIZE	Carpeta personalizada: Escritorio	::1	2026-04-23 09:00:12.90947
606	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-23 09:07:24.732538
300	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-20 09:20:30.198761
424	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:45:12.505283
449	1	administrador	FILE_OPEN	Abierto archivo: Documento.docx	::1	2026-04-20 09:55:53.737422
542	3	eric	FILE_SHARE	Compartido Presentaci├│n.pptx con administrador (read)	::1	2026-04-22 15:41:37.960568
545	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-22 16:42:18.570343
581	3	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-22 17:02:05.956892
594	1	administrador	FILE_EDIT	Editado archivo: Hoja de c├ílculo.xlsx	::1	2026-04-22 19:46:01.81974
607	1	administrador	FILE_OPEN	Abierto archivo: Hoja de c├ílculo.xlsx	::1	2026-04-23 09:07:38.696718
301	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (1 usuarios)	::1	2026-04-20 09:20:30.388148
425	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:46:12.455534
450	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:56:12.519206
546	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-22 16:56:06.362579
582	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-22 17:02:41.817478
595	3	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-22 19:47:31.774856
608	3	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-23 09:09:32.318146
302	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:20:30.398006
426	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:47:12.496861
451	3	eric	LOGIN_FAILED	Intento fallido (1/5)	::1	2026-04-20 09:56:28.208976
452	3	eric	LOGIN_FAILED	Intento fallido (2/5)	::1	2026-04-20 09:56:34.87851
453	3	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-20 09:56:39.367143
547	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-22 16:56:06.442017
583	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-22 17:02:41.963833
596	3	eric	FILE_DELETE	Eliminado archivo: Presentaci├│n.pptx	::1	2026-04-22 19:47:53.894172
597	3	eric	FILE_DELETE	Eliminado archivo: Documento.docx	::1	2026-04-22 19:47:56.873284
609	3	eric	CREATE_FILE	Creado archivo: Nuevo documento.txt	::1	2026-04-23 09:42:00.94546
303	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-20 09:21:16.368611
427	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:48:12.492034
454	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:57:12.568154
479	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-22 09:58:38.259381
500	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-22 14:27:11.251565
518	1	administrador	FILE_DELETE	Eliminado archivo: Documento.docx	::1	2026-04-22 14:50:28.397218
519	3	eric	LOGIN_FAILED	Intento fallido (1/5)	::1	2026-04-22 14:55:43.350991
520	3	eric	LOGIN_FAILED	Intento fallido (2/5)	::1	2026-04-22 14:55:50.898817
521	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-22 14:55:54.007964
548	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-22 16:56:06.471318
584	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-22 17:02:41.972094
598	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-22 19:47:59.877969
610	3	eric	FILE_OPEN	Abierto archivo: Escritorio/Nuevo documento.txt	::1	2026-04-23 09:42:05.135658
304	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (1 usuarios)	::1	2026-04-20 09:21:16.581691
428	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:49:12.5117
455	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:58:12.450927
478	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-22 09:58:37.982663
501	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-22 14:27:11.391067
522	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-22 14:55:54.175418
585	1	administrador	FILE_SHARE	Compartido Presentaci├│n.pptx con eric (edit)	::1	2026-04-22 17:03:07.201639
599	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-22 19:48:00.054699
611	3	eric	FILE_EDIT	Editado archivo: Escritorio/Nuevo documento.txt	::1	2026-04-23 09:42:17.215939
305	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:21:16.58787
429	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:50:12.67786
456	3	eric	LOGIN_FAILED	Intento fallido (1/5)	::1	2026-04-20 09:58:25.482958
480	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-22 10:18:53.546266
481	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-22 10:18:53.604762
502	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-22 14:28:17.134281
523	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-22 14:55:54.187303
600	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-22 19:48:00.063153
612	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-23 09:44:15.263427
306	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:22:44.49156
307	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:22:49.487084
308	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:22:55.110199
430	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-20 09:51:09.473147
457	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 10:00:18.957251
482	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-22 10:47:55.540051
483	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-22 10:47:55.649365
503	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-22 14:28:17.62495
524	\N	administrador	ADMIN	[WARNING] Usuario actualizado: ID 3 (Rol: user, Pass: cambiado)	::1	2026-04-22 14:56:07.429935
525	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-22 14:56:07.493511
601	1	administrador	FILE_OPEN	Abierto archivo: Hoja de c├ílculo.xlsx	::1	2026-04-22 19:48:25.417545
613	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-23 09:44:15.686117
309	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:27:03.307822
431	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (1 usuarios)	::1	2026-04-20 09:51:09.598509
432	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:51:09.614053
433	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:51:12.495261
458	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-20 10:00:18.965575
484	1	administrador	FILE_OPEN	Abierto archivo: Documento.docx	::1	2026-04-22 10:56:34.110926
504	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-22 14:28:17.63207
505	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-22 14:28:27.261782
506	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-22 14:28:37.270915
526	3	eric	LOGIN_FAILED	Intento fallido (3/5)	::1	2026-04-22 14:56:14.184424
527	3	eric	LOGIN_FAILED	Intento fallido (4/5)	::1	2026-04-22 14:56:16.805257
528	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-22 14:56:19.460734
531	1	administrador	RATE_LIMIT_CLEAR	IP desbloqueada: ::ffff:172.18.0.16	::1	2026-04-22 14:56:23.141117
614	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-23 09:44:15.696666
615	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-23 09:44:16.58622
310	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:27:56.068374
311	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:28:00.812601
312	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:28:05.813021
313	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (1 usuarios)	::1	2026-04-20 09:28:09.526127
434	\N	administrador	ADMIN	[INFO] Usuario creado: eric	::1	2026-04-20 09:51:19.909614
435	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-20 09:51:19.964132
436	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-20 09:51:23.007425
459	1	administrador	RATE_LIMIT_CLEAR	IP desbloqueada: ::ffff:172.18.0.16	::1	2026-04-20 10:00:27.785184
460	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-20 10:00:30.237251
485	1	administrador	FOLDER_CREATE	Creada carpeta: __probe_folder__	::1	2026-04-22 10:57:18.697053
486	1	administrador	FOLDER_DELETE	Eliminada carpeta: __probe_folder__	::1	2026-04-22 10:57:18.819646
507	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-22 14:29:28.368184
508	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-22 14:29:33.373671
509	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-22 14:29:38.361751
510	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-22 14:29:43.359908
529	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-22 14:56:19.597064
616	3	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-23 09:48:33.662527
314	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:28:09.557349
315	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:28:15.844173
316	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:28:20.803937
317	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:28:25.80016
318	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:28:30.804565
319	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:28:35.804703
320	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:28:40.811199
321	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:28:45.841734
322	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:28:50.81575
323	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:28:55.801516
324	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:29:00.806612
325	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:29:05.81482
326	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:29:10.806565
327	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:29:15.805782
328	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:29:20.795817
329	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:29:25.805937
330	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:29:30.80162
331	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:29:35.807728
332	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:29:40.800597
333	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:29:45.800922
334	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:29:50.804832
335	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:29:55.805951
336	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:30:00.798587
337	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:30:05.80571
338	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:30:10.798791
339	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:30:15.809559
340	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:30:20.798564
341	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:30:25.806908
342	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:30:30.803868
343	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:30:35.810554
344	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:30:40.80254
345	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:30:45.805202
346	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:30:50.793474
347	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:30:55.838522
348	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:31:01.400377
349	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:31:05.807333
350	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:31:10.820046
351	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:31:15.81154
352	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:31:20.800713
353	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:31:25.804319
354	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:31:30.809176
355	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:31:35.800015
356	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:31:40.801973
357	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:31:45.806625
358	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:31:50.836921
359	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:31:55.801437
360	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:32:00.808199
361	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:32:05.804428
362	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:32:10.802415
363	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:32:15.801223
364	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:32:20.803827
365	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:32:25.811684
366	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:32:30.802751
367	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:32:36.46494
368	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:32:40.799154
369	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:32:45.8058
370	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:32:50.80321
371	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:32:55.808333
372	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:33:00.803164
373	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:33:05.805341
374	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:33:10.801478
375	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:33:15.802356
376	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:33:20.798201
377	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:33:25.807858
378	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:33:30.874781
379	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:33:35.808213
380	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:33:40.807058
381	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:33:45.810722
382	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:33:50.807782
383	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:33:55.805768
384	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:34:00.804435
385	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:34:05.804876
386	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:34:11.337702
387	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:34:15.802238
388	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:34:20.806061
389	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:34:25.808811
390	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:34:30.811879
391	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:34:35.808925
392	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:34:40.806826
393	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:34:45.805778
394	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:34:50.80194
395	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:34:55.806682
396	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:35:00.812663
397	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:35:05.812356
398	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:35:10.803411
399	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:35:15.813405
400	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:35:20.811796
401	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:35:25.811058
402	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:35:30.81476
403	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:35:36.432449
404	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:35:41.429315
405	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:35:46.427025
406	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:35:51.43309
407	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:35:56.435502
408	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:36:01.435334
409	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:36:06.431552
410	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:36:11.4413
411	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:36:16.431667
412	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:36:21.435629
413	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:36:26.437893
414	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:36:31.446421
437	3	eric	LOGIN_FAILED	Intento fallido (1/5)	::1	2026-04-20 09:51:54.885945
438	3	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-20 09:51:58.700107
461	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-20 10:00:30.350867
462	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 10:00:30.361314
463	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 10:00:40.330447
464	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 10:00:50.334707
465	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 10:01:00.338993
466	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 10:01:10.34472
487	1	administrador	FILE_UPLOAD	Subido archivo: testfile.txt	::1	2026-04-22 10:57:42.10733
488	1	administrador	FILE_DELETE	Eliminado archivo: testfile.txt	::1	2026-04-22 10:57:42.263897
511	1	administrador	FILE_OPEN	Abierto archivo: Documento.docx	::1	2026-04-22 14:31:33.094261
530	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-22 14:56:19.608507
617	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-23 09:49:09.476473
415	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:37:12.469182
439	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:52:12.488823
467	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 10:01:20.924916
468	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 10:01:30.341891
469	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 10:01:40.331161
470	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 10:01:48.60026
489	1	administrador	LOGIN_FAILED	Intento fallido (1/5)	::1	2026-04-22 11:00:38.224142
512	1	administrador	FOLDER_CUSTOMIZE	Carpeta personalizada: Escritorio	::1	2026-04-22 14:31:41.549855
514	1	administrador	CREATE_FILE	Creado archivo: Presentaci├│n.pptx	::1	2026-04-22 14:32:49.911457
532	\N	administrador	ADMIN	[WARNING] Usuario actualizado: ID 3 (Rol: user, Pass: cambiado)	::1	2026-04-22 14:56:38.119854
533	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-22 14:56:38.191612
618	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-23 09:49:09.71624
619	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-23 09:49:09.730757
416	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:38:12.476507
440	3	eric	FILE_SHARE	Compartido Documento.docx con administrador	::1	2026-04-20 09:53:05.121469
471	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-20 10:02:45.782702
473	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 10:02:55.758305
490	1	administrador	FILE_SHARE	Compartido Documento.docx con eric	::1	2026-04-22 11:02:10.95317
491	1	administrador	FILE_UNSHARE	Dejado de compartir Documento.docx con eric	::1	2026-04-22 11:02:11.044344
513	1	administrador	FILE_OPEN	Abierto archivo: Documento.docx	::1	2026-04-22 14:32:29.567014
534	3	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-22 14:56:42.400315
620	1	administrador	FILE_DELETE	Eliminado archivo: Escritorio/ojifowijugnjiouwer.txt	::1	2026-04-23 09:49:47.532002
417	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:39:12.474195
441	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:53:12.439472
472	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 10:02:45.78804
492	\N	administrador	ADMIN	[INFO] Usuario creado: __probe_user__	::1	2026-04-22 11:02:11.958081
515	1	administrador	FILE_OPEN	Abierto archivo: Hoja de c├ílculo.xlsx	::1	2026-04-22 14:33:21.02308
535	3	eric	FILE_SHARE	Compartido Documento.docx con administrador	::1	2026-04-22 14:57:17.963904
621	1	administrador	FILE_OPEN	Abierto archivo: Escritorio/ojifowijugnjiouwer.txt	::1	2026-04-23 09:50:29.361047
418	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:39:22.03363
442	3	eric	FILE_OPEN	Abierto archivo: Documento.docx	::1	2026-04-20 09:53:15.489052
474	3	eric	LOGIN_FAILED	Intento fallido (2/5)	::1	2026-04-20 10:06:44.380465
475	3	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-20 10:06:50.015109
493	\N	administrador	ADMIN	[WARNING] Usuario actualizado: ID 3 (Rol: user, Pass: sin cambio)	::1	2026-04-22 11:02:37.639704
494	\N	administrador	ADMIN	[WARNING] Usuario desbloqueado: ID 3	::1	2026-04-22 11:02:37.874265
516	1	administrador	FILE_EDIT	Editado archivo: Hoja de c├ílculo.xlsx	::1	2026-04-22 14:34:37.172505
536	1	administrador	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-22 14:57:34.405232
622	1	administrador	FILE_DELETE	Eliminado archivo: Escritorio/ojifowijugnjiouwer.txt	::1	2026-04-23 09:52:59.523151
419	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:40:12.490103
443	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:54:12.522118
476	3	eric	LOGIN	Inicio de sesi├│n exitoso	::1	2026-04-20 10:11:52.454173
495	1	administrador	FILE_EDIT	Editado archivo: Documento.docx	::1	2026-04-22 11:02:38.091387
496	1	administrador	FILE_EDIT	Editado archivo: Documento.docx	::1	2026-04-22 11:02:38.346573
517	1	administrador	FILE_OPEN	Abierto archivo: Hoja de c├ílculo.xlsx	::1	2026-04-22 14:34:45.070221
537	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-22 14:57:34.786761
623	1	administrador	FILE_DELETE	Eliminado archivo: Escritorio/holiwisss.txt	::1	2026-04-23 09:53:27.288573
420	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:41:12.788864
444	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 09:55:12.512885
477	1	administrador	FILE_OPEN	Abierto archivo: Documento.docx	::1	2026-04-20 14:11:05.126976
497	1	administrador	FOLDER_CUSTOMIZE	Carpeta personalizada: Documentos	::1	2026-04-22 11:03:53.115763
538	\N	administrador	ADMIN	[INFO] Lista de usuarios solicitada por administrador (2 usuarios)	::1	2026-04-22 14:57:34.799886
624	1	administrador	FILE_DELETE	Eliminado archivo: Escritorio/tyf76uftyrfyrtfytuftyu.txt	::1	2026-04-23 10:34:40.036684
296	\N	administrador	ADMIN	[INFO] Panel de administraci├│n - Estado solicitado por administrador	::1	2026-04-20 06:42:45.391615
\.


--
-- Data for Name: calendar_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.calendar_events (id, microsoft_id, user_id, subject, body_preview, start_time, end_time, is_all_day, location, web_link, categories, assigned_by, created_at, last_synced) FROM stdin;
234643	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kdwAAAA==	3	Defensa Memoria		2026-06-08 00:00:00	2026-06-09 00:00:00	t	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kdwAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a roja"]	\N	2026-04-20 06:45:17.857229	2026-04-23 09:22:46.550816
235167	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJBPxZOAAAAA==	3	[Roadmap] Arreglar UI/UX de sistema IA	Arreglar como se ve y generalizarlo	2026-02-28 00:00:00	2026-03-02 00:00:00	f	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJBPxZOAAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Roadmap"]	\N	2026-04-22 10:47:56.898815	2026-04-23 09:22:45.630962
235188	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAI-3w2ygAAAA==	3	Cena San Valentin		2026-02-14 21:00:00	2026-02-14 22:00:00	f	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAI%2F3w2ygAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a roja"]	\N	2026-04-22 10:47:57.489142	2026-04-23 09:22:45.464879
235191	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAI4ci8bwAAAA==	3	[Asignado] reyessss	(Tarea creada por administrador)	2026-01-06 09:00:00	2026-01-06 09:30:00	f	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAI4ci8bwAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.52127	2026-04-23 09:22:45.387874
235203	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIbW64mAAAAA==	3	Estudiar Front		2025-07-07 07:00:00	2025-07-07 10:00:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIbW64mAAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.654626	2026-04-22 11:03:35.708204
235204	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIbW64lwAAAA==	3	DNI		2025-07-07 11:12:00	2025-07-07 12:00:00	f	Leganes, avenida universidad,27 - Policia	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIbW64lwAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.666946	2026-04-22 11:03:35.717982
235217	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIXjy-lQAAAA==	3	Reserva en Massart Goya		2025-06-14 19:45:00	2025-06-14 21:45:00	f	Calle de Antonio Acu├▒a, 8, 28009 Madrid	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIXjy%2FlQAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.810298	2026-04-22 11:03:35.866561
235233	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAITAqYEwAAAA==	3	Backend	<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<meta name="Generator" content="Microsoft Exchange Server">\n<!-- converted from text -->\n<style><!-- .EmailQuote { margin-left: 1pt; padding-left: 4pt; border-left: #800000 2p	2025-06-30 16:30:00	2025-06-30 19:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAITAqYEwAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.123804	2026-04-22 11:03:36.097261
235234	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIJnM3NgAAAA==	3	Examen Fiables		2025-06-10 06:30:00	2025-06-10 09:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIJnM3NgAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.129584	2026-04-22 11:03:36.113798
235247	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuHAAAAA=	3	Pr├íctica frontend 		2025-03-18 11:30:00	2025-03-18 12:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuHAAAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.190476	2026-04-22 11:03:36.359366
234641	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kegAAAA==	3	Practica front 3		2026-03-23 07:30:00	2026-03-23 10:30:00	f	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kegAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a amarilla"]	\N	2026-04-20 06:45:17.812417	2026-04-23 09:22:45.931318
234651	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kbQAAAA==	3	Terminar Calendario		2026-03-21 15:00:00	2026-03-21 15:30:00	f	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kbQAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a azul"]	\N	2026-04-20 06:45:18.034555	2026-04-23 09:22:45.913383
235199	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIbW64nAAAAA==	3	Estudiar base de datos		2025-07-07 17:30:00	2025-07-07 19:00:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIbW64nAAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.610496	2026-04-22 11:03:35.674882
234652	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kawAAAA==	3	Viaje Portaventura		2026-03-27 14:30:00	2026-04-01 09:30:00	f	Avinguda de l'Alcalde Pere Molas, Vila-seca, Catalu├▒a, Espa├▒a	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kawAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a verde"]	\N	2026-04-20 06:45:18.056786	2026-04-23 09:22:46.052455
234642	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1keQAAAA==	3	Practica front  2		2026-03-02 07:30:00	2026-03-02 10:30:00	f	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1keQAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a amarilla"]	\N	2026-04-20 06:45:17.834618	2026-04-23 09:22:45.75343
234638	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJB0lHkAAAAA==	3	Examen Final Front		2026-05-25 09:30:00	2026-05-25 12:30:00	f	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJB0lHkAAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a roja"]	\N	2026-04-20 06:45:17.047481	2026-04-23 09:22:46.494382
234645	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kdQAAAA==	3	Entrega memoria provisional		2026-04-26 00:00:00	2026-04-27 00:00:00	t	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kdQAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a roja"]	\N	2026-04-20 06:45:17.901623	2026-04-23 09:22:46.375628
234649	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kcAAAAA==	3	Entrega del tfg		2026-05-12 00:00:00	2026-05-13 00:00:00	t	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kcAAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a roja"]	\N	2026-04-20 06:45:17.990456	2026-04-23 09:22:46.427401
234646	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kdAAAAA==	3	Entrega Anteproyecto		2026-03-29 00:00:00	2026-03-30 00:00:00	t	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kdAAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a roja"]	\N	2026-04-20 06:45:17.924523	2026-04-23 09:22:46.019104
234650	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kbwAAAA==	3	Crypto		2026-04-03 09:00:00	2026-04-05 21:48:00	f	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kbwAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a verde"]	\N	2026-04-20 06:45:18.01233	2026-04-23 09:22:46.087424
234648	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kcQAAAA==	3	Congelacion de entrega de tfg		2026-05-03 18:30:00	2026-05-10 19:00:00	f	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kcQAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a verde"]	\N	2026-04-20 06:45:17.967899	2026-04-23 09:22:46.394585
234644	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kdgAAAA==	3	Entrega Memoria		2026-06-07 00:00:00	2026-06-08 00:00:00	t	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kdgAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a roja"]	\N	2026-04-20 06:45:17.879349	2026-04-23 09:22:46.516703
234640	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kewAAAA==	3	Practica Front 4		2026-04-20 06:30:00	2026-04-20 07:30:00	f	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kewAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a amarilla"]	\N	2026-04-20 06:45:17.790172	2026-04-23 09:22:46.167057
234639	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kfAAAAA==	3	Estudiar front		2026-03-07 00:00:00	2026-03-09 00:00:00	t	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kfAAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a verde"]	\N	2026-04-20 06:45:17.773969	2026-04-23 09:22:45.786827
235166	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJBPxZOQAAAA==	3	[Roadmap] Visualizacion en modo lista, y filtros	No se ven bien y no uncionan bien	2026-02-28 00:00:00	2026-03-02 00:00:00	f	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJBPxZOQAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Roadmap"]	\N	2026-04-22 10:47:56.519648	2026-04-23 09:22:45.664452
235165	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJBPxZOgAAAA==	3	[Roadmap] Probar todos los botones	Hay que validar que todos los botones funcionan, y que todos los pop-ups funcionan bien	2026-02-28 00:00:00	2026-03-02 00:00:00	f	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJBPxZOgAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Roadmap"]	\N	2026-04-22 10:47:56.485042	2026-04-23 09:22:45.698083
234653	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kagAAAA==	3	Examen Front Parcial		2026-03-09 07:30:00	2026-03-09 10:30:00	f	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kagAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a roja"]	\N	2026-04-20 06:45:18.078957	2026-04-23 09:22:45.820043
235169	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJBPxZNgAAAA==	3	[Roadmap] Comprobar subir archivos	Revisar todo el sistema de subir archivos	2026-02-23 00:00:00	2026-02-25 00:00:00	f	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJBPxZNgAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Roadmap"]	\N	2026-04-22 10:47:57.208973	2026-04-23 09:22:45.566019
235168	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJBPxZNwAAAA==	3	[Roadmap] Comprobar sistema de compartidos	Hay quever todo el sistema de compartidos porque funciona raro	2026-02-25 00:00:00	2026-02-27 00:00:00	f	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJBPxZNwAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Roadmap"]	\N	2026-04-22 10:47:57.06446	2026-04-23 09:22:45.597942
234637	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJEtElCwAAAA==	3	comer		2026-03-14 13:45:00	2026-03-14 14:45:00	f	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJEtElCwAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a roja"]	\N	2026-04-20 06:45:16.929536	2026-04-23 09:22:45.853898
234654	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAI-GFpkQAAAA==	3	Llamada Inversores Take-Two		2026-05-15 20:15:00	2026-05-15 21:15:00	f	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAI%2FGFpkQAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a azul"]	\N	2026-04-20 06:45:18.101305	2026-04-23 09:22:46.46495
235194	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIiX_oCAAAAA==	3	Contacto Proyecto NTTData	________________________________________________________________________________\r\nMicrosoft Teams ┬┐Necesita ayuda?\r\nUnirse a la reuni├│n ahora\r\nId. de reuni├│n: 324 003 881 049 0\r\nC├│digo de acceso: 36d9d6GV\r\n________________________________\r\nUnirse en un 	2025-08-20 11:00:00	2025-08-20 11:30:00	f	Reuni├│n de Microsoft Teams	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIiX%2BoCAAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.555811	2026-04-22 11:03:35.630486
235195	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIfzrAQwAAAA==	3	Vuelo de 1471 n├║mero Wizz Air con destino Madrid (TWBB4N)	Wizz Air vuelo 1471 (3 horas, 50 minutos)\r\nC├│digo de confirmaci├│n: TWBB4N\r\n\r\nPasajeros: Eric, Laura\r\n\r\nFacturaci├│n en l├¡nea\r\n\r\nSale a las 5:35 el lunes, 25 de agosto de 2025 desde Warsaw (WAW)\r\n\r\nLlega a las 9:25 el lunes, 25 de agosto de 2025 a Madrid (M	2025-08-25 03:35:00	2025-08-25 07:25:00	f	Frederic Chopin Airport	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIfzrAQwAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.565739	2026-04-22 11:03:35.638715
235196	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIfzrAQgAAAA==	3	Vuelo de 1472 n├║mero Wizz Air con destino Warsaw (TWBB4N)		2025-08-05 17:15:00	2025-08-05 20:45:00	f	Adolfo Suarez-Barajas Airport	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIfzrAQgAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a roja"]	\N	2026-04-22 10:47:57.578082	2026-04-22 11:03:35.647047
235197	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIdEqZZgAAAA==	3	Entrevista NTT DATA	<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<meta name="Generator" content="Microsoft Exchange Server">\n<!-- converted from text -->\n<style><!-- .EmailQuote { margin-left: 1pt; padding-left: 4pt; border-left: #800000 2p	2025-07-23 09:00:00	2025-07-23 12:00:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIdEqZZgAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a roja"]	\N	2026-04-22 10:47:57.587949	2026-04-22 11:03:35.658582
235198	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIbW64nQAAAA==	3	Estudiar Front		2025-07-09 07:00:00	2025-07-09 10:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIbW64nQAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.600343	2026-04-22 11:03:35.666606
235190	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAI6yDkvwAAAA==	3	MUID - Entrevista Eric Namlski - M├íster Universitario en Inteligencia Artificial Aplicada a la Ingenier├¡a del Software a distancia - Conv. 26/27		2026-02-06 15:00:00	2026-02-06 15:30:00	f	Reuni├│n de Microsoft Teams	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAI6yDkvwAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a roja"]	\N	2026-04-22 10:47:57.511327	2026-04-23 09:22:45.431721
235192	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAI4ci8bQAAAA==	3	Fin de a├▒o		2025-12-31 22:00:00	2026-01-01 07:30:00	f	74, Calle de Joaqu├¡n Mar├¡a L├│pez, Arapiles, Chamber├¡, Madrid, Comunidad de Madrid, 28015, Espa├▒a	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAI4ci8bQAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a verde"]	\N	2026-04-22 10:47:57.533556	2026-04-23 09:22:45.35435
235170	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJA2VgQgAAAA==	3	[Roadmap] Terminar los editores	Hay que terminar los editores de excel, word y powerpoint	2026-02-20 00:00:00	2026-02-23 00:00:00	f	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJA2VgQgAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Roadmap"]	\N	2026-04-22 10:47:57.266947	2026-04-23 09:22:45.531254
235187	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kZwAAAA==	3	Reunion TFG segundo quatri		2026-02-16 18:00:00	2026-02-16 19:00:00	f	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1kZwAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.479579	2026-04-23 09:22:45.498566
235205	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIbW64lgAAAA==	3	Estudiar Bases		2025-07-06 08:00:00	2025-07-06 12:00:00	f	En casa	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIbW64lgAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.676834	2026-04-22 11:03:35.727615
235206	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIZRkjwAAAAA==	3	Tecnologia		2025-06-28 14:00:00	2025-06-28 18:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIZRkjwAAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.689145	2026-04-22 11:03:35.736035
235207	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIZRkjvwAAAA==	3	Backend		2025-06-28 07:30:00	2025-06-28 12:00:00	f	En casa	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIZRkjvwAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.699056	2026-04-22 11:03:35.74571
235208	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIZRkjvgAAAA==	3	Tecnologia	<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<meta name="Generator" content="Microsoft Exchange Server">\n<!-- converted from text -->\n<style><!-- .EmailQuote { margin-left: 1pt; padding-left: 4pt; border-left: #800000 2p	2025-06-27 14:00:00	2025-06-27 16:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIZRkjvgAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a azul"]	\N	2026-04-22 10:47:57.71323	2026-04-22 11:03:35.756831
235209	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIZRkjvQAAAA==	3	Backend		2025-06-27 07:30:00	2025-06-27 12:00:00	f	En casa	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIZRkjvQAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.721303	2026-04-22 11:03:35.769468
235210	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIZRkjvAAAAA==	3	Alguna del jeffy		2025-06-26 14:00:00	2025-06-26 18:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIZRkjvAAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.733702	2026-04-22 11:03:35.784623
235211	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIZRkjuwAAAA==	3	Backend		2025-06-26 07:30:00	2025-06-26 12:00:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIZRkjuwAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.743669	2026-04-22 11:03:35.795716
235212	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIZRkjugAAAA==	3	Tecnologia	<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<meta name="Generator" content="Microsoft Exchange Server">\n<!-- converted from text -->\n<style><!-- .EmailQuote { margin-left: 1pt; padding-left: 4pt; border-left: #800000 2p	2025-06-25 13:15:00	2025-06-25 16:30:00	f	En casa	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIZRkjugAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a roja"]	\N	2026-04-22 10:47:57.756116	2026-04-22 11:03:35.806822
235213	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIZRkjuQAAAA==	3	Arquitectura	<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<meta name="Generator" content="Microsoft Exchange Server">\n<!-- converted from text -->\n<style><!-- .EmailQuote { margin-left: 1pt; padding-left: 4pt; border-left: #800000 2p	2025-06-25 07:30:00	2025-06-25 11:30:00	f	En casa	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIZRkjuQAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a verde"]	\N	2026-04-22 10:47:57.765735	2026-04-22 11:03:35.817913
235201	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIbW64mgAAAA==	3	Estudiar Front		2025-07-08 13:45:00	2025-07-08 19:00:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIbW64mgAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.63255	2026-04-22 11:03:35.691494
235202	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIbW64mQAAAA==	3	Estudiar Front		2025-07-08 07:00:00	2025-07-08 11:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIbW64mQAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.644778	2026-04-22 11:03:35.699819
235218	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrDwAAAA==	3	Estudiar IA		2025-06-19 07:30:00	2025-06-19 12:00:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrDwAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.822501	2026-04-22 11:03:35.877669
235219	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrDgAAAA==	3	Estudiar IA		2025-06-19 14:00:00	2025-06-19 18:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrDgAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.832429	2026-04-22 11:03:35.888937
235220	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrDQAAAA==	3	Estudiar IA		2025-06-18 14:30:00	2025-06-18 19:00:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrDQAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.844705	2026-04-22 11:03:35.899914
235221	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrCgAAAA==	3	Estudiar Front-end		2025-06-16 14:00:00	2025-06-16 19:00:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrCgAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.854648	2026-04-22 11:03:35.911003
235222	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrCQAAAA==	3	Estudiar estructura de computadores		2025-06-15 14:00:00	2025-06-15 20:00:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrCQAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.866965	2026-04-22 11:03:35.922184
235223	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrCAAAAA==	3	Estudiar estructura de computadores		2025-06-15 06:30:00	2025-06-15 12:00:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrCAAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.876875	2026-04-22 11:03:35.933223
235224	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrBwAAAA==	3	Estudiar estructura de computadores		2025-06-14 13:45:00	2025-06-14 15:00:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrBwAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.916963	2026-04-22 11:03:35.944301
235225	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrBgAAAA==	3	Estudiar base de datos		2025-06-14 07:30:00	2025-06-14 12:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrBgAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.08389	2026-04-22 11:03:35.955418
235226	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrBQAAAA==	3	Estudiar Front-end		2025-06-13 14:00:00	2025-06-13 18:00:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrBQAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.089305	2026-04-22 11:03:35.967091
235227	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrBAAAAA==	3	Estudiar estructura de computadores		2025-06-13 07:00:00	2025-06-13 12:00:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrBAAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.094639	2026-04-22 11:03:35.977664
235228	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrAwAAAA==	3	Estudiar base de datos		2025-06-12 14:00:00	2025-06-12 19:00:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrAwAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.098986	2026-04-22 11:03:35.988807
235215	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIXjy-mgAAAA==	3	Bases de datos	<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<meta name="Generator" content="Microsoft Exchange Server">\n<!-- converted from text -->\n<style><!-- .EmailQuote { margin-left: 1pt; padding-left: 4pt; border-left: #800000 2p	2025-07-10 13:30:00	2025-07-10 16:30:00	f	PRAA106, PRAA108	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIXjy%2FmgAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a roja"]	\N	2026-04-22 10:47:57.788169	2026-04-22 11:03:35.840251
235216	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIXjy-mAAAAA==	3	Frontend	<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<meta name="Generator" content="Microsoft Exchange Server">\n<!-- converted from text -->\n<style><!-- .EmailQuote { margin-left: 1pt; padding-left: 4pt; border-left: #800000 2p	2025-07-11 09:30:00	2025-07-11 12:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIXjy%2FmAAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a roja"]	\N	2026-04-22 10:47:57.800534	2026-04-22 11:03:35.852695
235235	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIJnM3NQAAAA==	3	Frontend		2025-06-18 06:30:00	2025-06-18 09:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIJnM3NQAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.133499	2026-04-22 11:03:36.130531
235236	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIJnM3NAAAAA==	3	Sistemas tolerantes		2025-06-05 00:00:00	2025-06-06 00:00:00	t		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIJnM3NAAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.138451	2026-04-22 11:03:36.147978
235237	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIJnM3MwAAAA==	3	Examen estructura de computadores 		2025-06-16 06:30:00	2025-06-16 09:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIJnM3MwAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.143231	2026-04-22 11:03:36.16486
235238	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIJnM3MgAAAA==	3	Examen bases de datos		2025-06-18 09:30:00	2025-06-18 12:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIJnM3MgAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.147671	2026-04-22 11:03:36.185997
235239	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIJnM3MQAAAA==	3	Examen IA 		2025-06-20 12:30:00	2025-06-20 15:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIJnM3MQAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.152949	2026-04-22 11:03:36.206574
235240	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIGzckjAAAAA==	3	Pr├íctica frontend		2025-03-28 17:30:00	2025-03-28 18:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIGzckjAAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.157318	2026-04-22 11:03:36.241819
235241	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuHYAAAA=	3	Distribuidos examen		2025-06-12 09:30:00	2025-06-12 11:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuHYAAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.161361	2026-04-22 11:03:36.258243
235242	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuHUAAAA=	3	Pr├íctica dise├▒o autom├ítico de sistemas fiables		2025-05-27 10:30:00	2025-05-27 11:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuHUAAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.165693	2026-04-22 11:03:36.274863
235243	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuHQAAAA=	3	Pr├íctica frontend 		2025-05-20 16:30:00	2025-05-20 17:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuHQAAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.169613	2026-04-22 11:03:36.291684
235246	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuHEAAAA=	3	Pr├íctica dise├▒o autom├ítico de sistemas fiables		2025-04-08 10:30:00	2025-04-08 11:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuHEAAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.185095	2026-04-22 11:03:36.341596
235231	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAITAqYFQAAAA==	3	Recu operativos	<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<meta name="Generator" content="Microsoft Exchange Server">\n<!-- converted from text -->\n<style><!-- .EmailQuote { margin-left: 1pt; padding-left: 4pt; border-left: #800000 2p	2025-07-03 12:30:00	2025-07-03 15:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAITAqYFQAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.112711	2026-04-22 11:03:36.052724
235232	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAITAqYFAAAAA==	3	Recu tecnolog├¡a de computadores	<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<meta name="Generator" content="Microsoft Exchange Server">\n<!-- converted from text -->\n<style><!-- .EmailQuote { margin-left: 1pt; padding-left: 4pt; border-left: #800000 2p	2025-07-01 16:30:00	2025-07-01 19:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAITAqYFAAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.118469	2026-04-22 11:03:36.074906
235248	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuG8AAAA=	3	Pr├íctica dise├▒o autom├ítico de sistemas fiables		2025-03-11 11:30:00	2025-03-11 12:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuG8AAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.196218	2026-04-22 11:03:36.374872
235249	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuG4AAAA=	3	Pr├íctica frontend 		2025-03-04 11:30:00	2025-03-04 12:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuG4AAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.201614	2026-04-22 11:03:36.392031
235250	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuG0AAAA=	3	Pr├íctica dise├▒o autom├ítico de sistemas fiables		2025-02-25 11:30:00	2025-02-25 12:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuG0AAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.207901	2026-04-22 11:03:36.40821
235251	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGwAAAA=	3	Pr├íctica frontend 		2025-02-18 11:30:00	2025-02-18 12:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGwAAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.2128	2026-04-22 11:03:36.43065
235252	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGsAAAA=	3	Pr├íctica bases de datos 		2025-05-19 16:30:00	2025-05-19 17:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGsAAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.218438	2026-04-22 11:03:36.447102
235253	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGoAAAA=	3	Pr├íctica bases de datos 		2025-05-05 16:30:00	2025-05-05 17:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGoAAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.222577	2026-04-22 11:03:36.463941
235254	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGkAAAA=	3	Pr├íctica bases de datos 		2025-04-07 16:30:00	2025-04-07 17:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGkAAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.229598	2026-04-22 11:03:36.480426
235255	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGgAAAA=	3	Pr├íctica bases de datos 		2025-03-10 17:30:00	2025-03-10 18:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGgAAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.234924	2026-04-22 11:03:36.497099
235256	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGcAAAA=	3	Pr├íctica bases de datos 		2025-02-24 17:30:00	2025-02-24 18:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGcAAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.240899	2026-04-22 11:03:36.519453
235257	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGYAAAA=	3	Pr├íctica inteligencia artificial 		2025-05-22 09:30:00	2025-05-22 10:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGYAAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.246075	2026-04-22 11:03:36.536127
235258	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGUAAAA=	3	Pr├íctica inteligencia artificial 		2025-04-10 09:30:00	2025-04-10 10:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGUAAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.251823	2026-04-22 11:03:36.552683
235259	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGQAAAA=	3	Pr├íctica inteligencia artificial 		2025-03-13 10:30:00	2025-03-13 11:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGQAAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.257203	2026-04-22 11:03:36.569331
235245	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuHIAAAA=	3	Pr├íctica frontend 		2025-04-29 16:30:00	2025-04-29 17:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuHIAAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.179451	2026-04-22 11:03:36.324877
235200	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIbW64mwAAAA==	3	Estudiar Front	<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<meta name="Generator" content="Microsoft Exchange Server">\n<!-- converted from text -->\n<style><!-- .EmailQuote { margin-left: 1pt; padding-left: 4pt; border-left: #800000 2p	2025-07-07 14:00:00	2025-07-07 17:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIbW64mwAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.622691	2026-04-22 11:03:35.68319
235175	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1keAAAAA==	3	Entrega final TFG		2026-06-12 00:00:00	2026-06-13 00:00:00	t	\N	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAJAP1keAAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a roja"]	\N	2026-04-22 10:47:57.354992	2026-04-23 09:22:46.584113
235214	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIZRkjuAAAAA==	3	Operativos	<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<meta name="Generator" content="Microsoft Exchange Server">\n<!-- converted from text -->\n<style><!-- .EmailQuote { margin-left: 1pt; padding-left: 4pt; border-left: #800000 2p	2025-06-24 13:45:00	2025-06-24 18:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIZRkjuAAAAA%3D%3D&exvsurl=1&path=/calendar/item	["Categor├¡a azul"]	\N	2026-04-22 10:47:57.778369	2026-04-22 11:03:35.829
235229	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrAgAAAA==	3	Estudiar Front		2025-06-11 07:00:00	2025-06-11 09:00:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIWkgrAgAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.104366	2026-04-22 11:03:36.010008
235230	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAITAqYFgAAAA==	3	Recu arquitectura	<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<meta name="Generator" content="Microsoft Exchange Server">\n<!-- converted from text -->\n<style><!-- .EmailQuote { margin-left: 1pt; padding-left: 4pt; border-left: #800000 2p	2025-07-04 12:30:00	2025-07-04 15:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAITAqYFgAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.108698	2026-04-22 11:03:36.036188
235244	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuHMAAAA=	3	Pr├íctica dise├▒o autom├ítico de sistemas fiables		2025-05-06 10:30:00	2025-05-06 11:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuHMAAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.174022	2026-04-22 11:03:36.308231
235260	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGMAAAA=	3	Pr├íctica inteligencia artificial 		2025-02-27 10:30:00	2025-02-27 11:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGMAAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.262912	2026-04-22 11:03:36.586097
235261	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGIAAAA=	3	Pr├íctica inteligencia artificial 		2025-05-08 09:30:00	2025-05-08 10:30:00	f		https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAICABKuGIAAAA%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:58.26828	2026-04-22 11:03:36.602652
235193	AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIwc_tpAAAAA==	3	Sushi Shoo - Mejor Buffet a la carta de Madrid - 	Hola, Eric: Gracias por reservar con nosotros. No dudes en comunicarnos cualquier cambio. | Detalles de la reserva: | Fecha: 14 de noviembre de 2025 | Hora: 22:00 | Tama├▒o del grupo: 2 | Prepayment total price: ${priceSummary.totalFormattedAmounÔÇî ÔÇî ÔÇî ÔÇî ÔÇî 	2025-11-14 21:00:00	2025-11-14 22:30:00	f	C. de L├│pez de Hoyos, 9, 28006 Madrid, Spain	https://outlook.live.com/owa/?itemid=AQMkADAwATY0MDABLWUxOTUtZGQANTAtMDACLTAwCgBGAAADbxH8vIgGLkqoRw2AZhMXyQcASJPGmRbHe0eVTmscVubNVQAAAgENAAAASJPGmRbHe0eVTmscVubNVQAIwc%2BtpAAAAA%3D%3D&exvsurl=1&path=/calendar/item	[]	\N	2026-04-22 10:47:57.543532	2026-04-22 11:03:35.622064
\.


--
-- Data for Name: event_attachments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.event_attachments (id, event_id, file_name, file_path, file_owner, attached_by, file_size, created_at) FROM stdin;
\.


--
-- Data for Name: files; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.files (id, folder_id, name, physical_path, size, mime_type, owner_id, created_at) FROM stdin;
2189	\N	pruebas.txt	/app/uploads/eric/Escritorio/pruebas.txt	0	text/plain	3	2026-04-23 09:44:26.44461
2190	\N	pruebas.txt	/app/uploads/administrador/Escritorio/Datos/eric/Escritorio/pruebas.txt	0	text/plain	1	2026-04-23 09:45:19.18027
2192	\N	ojifowijugnjiouwer.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/ojifowijugnjiouwer.txt	0	text/plain	1	2026-04-23 09:50:10.210481
2187	\N	Nuevo documento.txt	/app/uploads/eric/Escritorio/Nuevo documento.txt	7	text/plain	3	2026-04-23 09:42:11.723124
2163	\N	0000n.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000n.sp1	570661	application/octet-stream	1	2026-04-22 14:57:59.453918
2174	\N	0000v.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000v.sp1	693464	application/octet-stream	1	2026-04-22 17:52:36.125085
2188	\N	Nuevo documento.txt	/app/uploads/administrador/Escritorio/Datos/eric/Escritorio/Nuevo documento.txt	7	text/plain	1	2026-04-23 09:42:34.948037
2168	\N	0000s.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000s.sp1	591595	application/octet-stream	1	2026-04-22 15:01:59.831007
2191	\N	holiwisss.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/holiwisss.txt	0	text/plain	1	2026-04-23 09:49:10.253973
2138	\N	body.json	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/body.json	70	application/json	1	2026-04-22 10:55:29.82583
2176	\N	CreateFileModal.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/CreateFileModal.css	2498	application/octet-stream	1	2026-04-22 18:23:44.288279
2130	\N	avatar-1776678648372-206962709.png	/app/uploads/administrador/Escritorio/database_storage/avatars/avatar-1776678648372-206962709.png	9176	image/png	1	2026-04-20 09:51:28.86804
2145	\N	00007.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/00007.sp1	615901	application/octet-stream	1	2026-04-22 14:30:20.705485
2149	\N	0000b.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000b.sp1	611159	application/octet-stream	1	2026-04-22 14:31:21.09215
2151	\N	0000d.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000d.sp1	682566	application/octet-stream	1	2026-04-22 14:32:21.225587
2158	\N	0000i.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000i.sp1	734163	application/octet-stream	1	2026-04-22 14:35:50.750209
2160	\N	0000k.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000k.sp1	655958	application/octet-stream	1	2026-04-22 14:51:20.137276
2165	\N	0000p.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000p.sp1	604775	application/octet-stream	1	2026-04-22 15:00:00.174907
2166	\N	0000q.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000q.sp1	486320	application/octet-stream	1	2026-04-22 15:00:32.93708
2173	\N	0000u.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000u.sp1	650081	application/octet-stream	1	2026-04-22 17:38:58.072476
2175	\N	0000w.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000w.sp1	699739	application/octet-stream	1	2026-04-22 17:53:05.830468
2179	\N	MoveModal.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/MoveModal.css	7628	application/octet-stream	1	2026-04-22 18:27:49.693605
2181	\N	FileItem.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/UserPanel/FileItem.css	2269	application/octet-stream	1	2026-04-22 19:37:13.226564
2178	\N	RenameModal.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/RenameModal.css	1979	application/octet-stream	1	2026-04-22 18:25:44.218025
2180	\N	extract_1.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/extract_1.txt	27650	text/plain	1	2026-04-22 19:37:09.848361
2150	\N	0000c.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000c.sp1	664365	application/octet-stream	1	2026-04-22 14:31:50.843775
2194	\N	tyf76uftyrfyrtfytuftyu.txt	/app/uploads/administrador/Escritorio/tyf76uftyrfyrtfytuftyu.txt	0	text/plain	1	2026-04-23 10:18:39.437006
2146	\N	00008.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/00008.sp1	616108	application/octet-stream	1	2026-04-22 14:30:50.967847
2159	\N	0000j.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000j.sp1	759992	application/octet-stream	1	2026-04-22 14:48:49.903207
2161	\N	0000l.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000l.sp1	737869	application/octet-stream	1	2026-04-22 14:55:30.571121
2164	\N	0000o.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000o.sp1	658213	application/octet-stream	1	2026-04-22 14:58:29.484548
2157	\N	0000h.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000h.sp1	721332	application/octet-stream	1	2026-04-22 14:35:50.729563
2141	\N	00003.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/00003.sp1	758381	application/octet-stream	1	2026-04-22 14:28:20.661622
2148	\N	0000a.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000a.sp1	581172	application/octet-stream	1	2026-04-22 14:31:21.086744
2193	\N	test_delete_cloud.txt	/app/uploads/eric/Escritorio/test_delete_cloud.txt	5	text/plain	3	2026-04-23 10:07:44.737628
2177	\N	CreateFolderModal.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/CreateFolderModal.css	2112	application/octet-stream	1	2026-04-22 18:24:44.1202
2137	\N	ai2.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/ai2.txt	963	text/plain	1	2026-04-22 10:54:59.598538
2144	\N	00006.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/00006.sp1	605029	application/octet-stream	1	2026-04-22 14:30:20.700703
2129	\N	´┐¢^_	/app/uploads/administrador/Descargas/´┐¢^_	55708	application/octet-stream	1	2026-04-19 21:24:55.947482
2131	\N	Documento.docx	/app/uploads/eric/Documento.docx	4636	application/vnd.openxmlformats-officedocument.wordprocessingml.document	3	2026-04-20 09:51:45.739
2132	\N	Presentaci├│n.pptx	/app/uploads/eric/Presentaci├│n.pptx	15385	application/vnd.openxmlformats-officedocument.presentationml.presentation	3	2026-04-20 09:51:45.747
75	\N	NotificationCenter.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Common/NotificationCenter.css	4266	application/octet-stream	1	2026-04-19 16:39:55.779955
2128	\N	´┐¢^|	/app/uploads/administrador/Escritorio/Datos/administrador/´┐¢^|	55708	application/octet-stream	1	2026-04-19 21:02:35.568
129	\N	RDPConnectionModal.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/RDPConnectionModal.css	2744	application/octet-stream	1	2026-04-19 16:39:56.520422
78	\N	Toast.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Common/Toast.jsx	1247	application/octet-stream	1	2026-04-19 16:39:55.812095
2171	\N	avatar-1776877354057-686842928.png	/app/uploads/administrador/Escritorio/database_storage/avatars/avatar-1776877354057-686842928.png	127983	image/png	1	2026-04-22 17:03:20.053429
2185	\N	Calendario.Panel.png	/app/uploads/administrador/Calendario.Panel.png	127983	image/png	1	2026-04-22 19:46:16.01
2147	\N	00009.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/00009.sp1	587008	application/octet-stream	1	2026-04-22 14:30:50.972458
46	\N	nginx.conf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/gateway/nginx.conf	7315	application/octet-stream	1	2026-04-19 16:39:55.467442
2152	\N	0000e.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000e.sp1	707162	application/octet-stream	1	2026-04-22 14:32:52.796376
2154	\N	0000f.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000f.sp1	566165	application/octet-stream	1	2026-04-22 14:33:20.753904
2167	\N	0000r.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000r.sp1	478968	application/octet-stream	1	2026-04-22 15:01:00.770978
140	\N	RemotePageDesktop.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Remote/RemotePageDesktop.css	796	application/octet-stream	1	2026-04-19 16:39:56.582716
2169	\N	0000t.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000t.sp1	1076133	application/octet-stream	1	2026-04-22 15:42:17.848463
2140	\N	Antigravity.exe	/app/uploads/administrador/Descargas/Antigravity.exe	21299200	application/octet-stream	1	2026-04-22 10:58:28.766422
284	\N	de_de.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/de_de.qm	122994	application/octet-stream	1	2026-04-19 17:44:03.952591
70	\N	FormContainer.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Common/FormContainer.jsx	735	application/octet-stream	1	2026-04-19 16:39:55.723212
31	\N	SETUP_WINDOWS_SERVER_2025.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/SETUP_WINDOWS_SERVER_2025.txt	12514	text/plain	1	2026-04-19 16:39:55.316164
2136	\N	ai1.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/ai1.txt	2182	text/plain	1	2026-04-22 10:54:59.591433
72	\N	FrostedContainer.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Common/FrostedContainer.jsx	918	application/octet-stream	1	2026-04-19 16:39:55.745422
2142	\N	00004.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/00004.sp1	559660	application/octet-stream	1	2026-04-22 14:29:20.548707
2162	\N	0000m.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000m.sp1	833301	application/octet-stream	1	2026-04-22 14:55:30.596975
292	\N	lt.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/lt.qm	132400	application/octet-stream	1	2026-04-19 17:44:04.041148
2133	\N	Documento.docx	/app/uploads/administrador/Escritorio/Datos/eric/Documento.docx	4636	application/vnd.openxmlformats-officedocument.wordprocessingml.document	1	2026-04-20 09:56:15.812
2170	\N	find_missing_i18n.py	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/scripts/find_missing_i18n.py	1164	text/x-python	1	2026-04-22 17:02:32.839327
2153	\N	Presentaci├│n.pptx	/app/uploads/administrador/Escritorio/Datos/eric/Presentaci├│n.pptx	15385	application/octet-stream	1	2026-04-22 14:33:00.688
2127	\N	´┐¢^|	/app/uploads/administrador/Escritorio/Datos/administrador/´┐¢^|	55708	application/octet-stream	1	2026-04-19 20:59:05.578
3	\N	Hoja de c├ílculo.xlsx	/app/uploads/administrador/Hoja de c├ílculo.xlsx	55471	application/vnd.openxmlformats-officedocument.spreadsheetml.sheet	1	2026-04-19 16:12:47.221
2184	\N	Calendario.Panel.png	/app/uploads/administrador/Escritorio/Datos/administrador/Calendario.Panel.png	127983	image/png	1	2026-04-22 19:45:46.013
2134	\N	Documento.docx	/app/uploads/administrador/Escritorio/Datos/administrador/Documento.docx	9	application/vnd.openxmlformats-officedocument.wordprocessingml.document	1	2026-04-20 09:56:45.831
2143	\N	00005.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/00005.sp1	574501	application/octet-stream	1	2026-04-22 14:29:20.55331
330	\N	msvcp140_1.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/msvcp140_1.dll	35976	application/octet-stream	1	2026-04-19 17:44:04.542847
2135	\N	lghub_installer.exe	/app/uploads/administrador/Descargas/lghub_installer.exe	69735576	application/octet-stream	1	2026-04-22 10:48:31.51603
2182	\N	HoverPreview.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/UserPanel/HoverPreview.css	2231	application/octet-stream	1	2026-04-22 19:37:13.326363
2172	\N	add_missing_i18n.py	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/scripts/add_missing_i18n.py	3965	text/x-python	1	2026-04-22 17:03:38.170211
2183	\N	temp_fileitem.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/temp_fileitem.jsx	41920	application/octet-stream	1	2026-04-22 19:37:16.781838
87	\N	ExcelEditor.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/ExcelEditor.jsx	58977	application/octet-stream	1	2026-04-19 16:39:55.913318
139	\N	RemotePage.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Remote/RemotePage.jsx	11612	application/octet-stream	1	2026-04-19 16:39:56.577375
2155	\N	Presentaci├│n.pptx	/app/uploads/administrador/Presentaci├│n.pptx	12533	application/vnd.openxmlformats-officedocument.presentationml.presentation	1	2026-04-22 14:33:30.694
2186	\N	Calendario.Panel.png	/app/uploads/administrador/Calendario.Panel.png	127983	image/png	1	2026-04-22 19:46:46.011
2139	\N	Sin confirmar 104640.crdownload	/app/uploads/administrador/Descargas/Sin confirmar 104640.crdownload	55902208	application/octet-stream	1	2026-04-22 10:58:02.070017
2156	\N	0000g.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/0000g.sp1	733527	application/octet-stream	1	2026-04-22 14:33:50.802095
73	\N	Input.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Common/Input.css	3240	application/octet-stream	1	2026-04-19 16:39:55.757737
105	\N	BaseLayout.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Layout/BaseLayout.css	1380	application/octet-stream	1	2026-04-19 16:39:56.114789
125	\N	FolderCustomizeModal.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/FolderCustomizeModal.jsx	3927	application/octet-stream	1	2026-04-19 16:39:56.502357
37	\N	nube.svg	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/public/icons/nube.svg	340	application/octet-stream	1	2026-04-19 16:39:55.377341
60	\N	Calendar.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Calendar/Calendar.css	16843	application/octet-stream	1	2026-04-19 16:39:55.624575
178	\N	calendarController.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/ai-service/src/controllers/calendarController.js	40265	text/javascript	1	2026-04-19 16:39:57.077363
182	\N	cache.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/ai-service/src/utils/cache.js	1283	text/javascript	1	2026-04-19 16:39:57.122986
190	\N	performanceOptimizations.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/ai-service/src/utils/performanceOptimizations.js	9236	text/javascript	1	2026-04-19 16:39:57.200789
27	\N	packed-refs	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/packed-refs	1362	application/octet-stream	1	2026-04-19 16:39:55.271789
88	\N	ExcelEditor.jsx.bak	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/ExcelEditor.jsx.bak	15824	application/octet-stream	1	2026-04-19 16:39:55.923241
189	\N	notificationClient.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/ai-service/src/utils/notificationClient.js	2241	text/javascript	1	2026-04-19 16:39:57.191272
192	\N	syncDiskToDb.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/file-service/src/utils/syncDiskToDb.js	4785	text/javascript	1	2026-04-19 16:39:57.456521
170	\N	proyectonube.csr	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/gateway/certs/proyectonube.csr	1030	application/octet-stream	1	2026-04-19 16:39:56.782973
169	\N	tailwind.config.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/tailwind.config.js	1170	text/javascript	1	2026-04-19 16:39:56.767723
65	\N	Button.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Common/Button.css	2749	application/octet-stream	1	2026-04-19 16:39:55.667619
32	\N	cloudflared-config.yml	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/cloudflared-config.yml	220	application/octet-stream	1	2026-04-19 16:39:55.321897
86	\N	ExcelEditor.css.bak	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/ExcelEditor.css.bak	10301	application/octet-stream	1	2026-04-19 16:39:55.901163
67	\N	FileTypeIcon.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Common/FileTypeIcon.jsx	4801	application/octet-stream	1	2026-04-19 16:39:55.691075
81	\N	FileEditorPanel.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/FileEditorPanel.css	3565	application/octet-stream	1	2026-04-19 16:39:55.846633
126	\N	LocationPickerModal.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/LocationPickerModal.css	11265	application/octet-stream	1	2026-04-19 16:39:56.506323
128	\N	MoveModal.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/MoveModal.jsx	9913	application/octet-stream	1	2026-04-19 16:39:56.516176
167	\N	setupProxy.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/setupProxy.js	624	text/javascript	1	2026-04-19 16:39:56.755148
97	\N	TextEditor.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/TextEditor.css	889	application/octet-stream	1	2026-04-19 16:39:56.02587
98	\N	TextEditor.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/TextEditor.jsx	6706	application/octet-stream	1	2026-04-19 16:39:56.035811
109	\N	AITaskModal.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/AITaskModal.css	2450	application/octet-stream	1	2026-04-19 16:39:56.159181
202	\N	test_rdp_flow.py	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/tests/e2e/test_rdp_flow.py	6280	text/x-python	1	2026-04-19 16:39:58.12042
1956	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixsmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixsmsg.dll	120528	application/octet-stream	1	2026-04-19 18:22:49.407933
23	\N	update.sample	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/hooks/update.sample	3650	application/octet-stream	1	2026-04-19 16:39:20.462101
92	\N	PDFEditor.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/PDFEditor.jsx	25005	application/octet-stream	1	2026-04-19 16:39:55.967668
131	\N	RenameModal.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/RenameModal.jsx	1857	application/octet-stream	1	2026-04-19 16:39:56.530133
135	\N	ShareModal.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/ShareModal.jsx	14232	application/octet-stream	1	2026-04-19 16:39:56.55514
141	\N	RemotePageMobile.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Remote/RemotePageMobile.css	2380	application/octet-stream	1	2026-04-19 16:39:56.58847
146	\N	FolderSelector.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/UserPanel/FolderSelector.jsx	3254	application/octet-stream	1	2026-04-19 16:39:56.621597
181	\N	list_models.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/ai-service/src/list_models.js	1654	text/javascript	1	2026-04-19 16:39:57.113462
14	\N	pre-applypatch.sample	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/hooks/pre-applypatch.sample	424	application/octet-stream	1	2026-04-19 16:39:20.418852
152	\N	UserPanel.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/UserPanel/UserPanel.css	81413	application/octet-stream	1	2026-04-19 16:39:56.660613
153	\N	UserPanel.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/UserPanel/UserPanel.jsx	79555	application/octet-stream	1	2026-04-19 16:39:56.666262
154	\N	UserPanelDesktop.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/UserPanel/UserPanelDesktop.css	167	application/octet-stream	1	2026-04-19 16:39:56.671821
52	\N	AdminPanel.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Admin/AdminPanel.css	16498	application/octet-stream	1	2026-04-19 16:39:55.546817
80	\N	DocumentAIEditor.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/DocumentAIEditor.jsx	16042	application/octet-stream	1	2026-04-19 16:39:55.834297
96	\N	PowerPointEditor.jsx.bak	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/PowerPointEditor.jsx.bak	28542	application/octet-stream	1	2026-04-19 16:39:56.012093
171	\N	proyectonube.key	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/gateway/certs/proyectonube.key	1732	application/octet-stream	1	2026-04-19 16:39:56.789675
179	\N	documentController.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/ai-service/src/controllers/documentController.js	8863	text/javascript	1	2026-04-19 16:39:57.08965
185	\N	documentUtils.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/ai-service/src/utils/documentUtils.js	9841	text/javascript	1	2026-04-19 16:39:57.155174
173	\N	02_data.sql	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/postgres-init/02_data.sql	127597	application/octet-stream	1	2026-04-19 16:39:56.832939
41	\N	488.24eb15e6.chunk.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/build/static/js/488.24eb15e6.chunk.js	164	text/javascript	1	2026-04-19 16:39:55.421811
38	\N	index.html	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/public/index.html	1652	application/octet-stream	1	2026-04-19 16:39:55.389701
200	\N	test_calendar_flow.py	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/tests/e2e/test_calendar_flow.py	14817	text/x-python	1	2026-04-19 16:39:58.110683
33	\N	docker-compose.yml	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/docker-compose.yml	8404	application/octet-stream	1	2026-04-19 16:39:55.328559
184	\N	diskSync.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/ai-service/src/utils/diskSync.js	4246	text/javascript	1	2026-04-19 16:39:57.145252
130	\N	RDPConnectionModal.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/RDPConnectionModal.jsx	5637	application/octet-stream	1	2026-04-19 16:39:56.524384
158	\N	ToastContext.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/context/ToastContext.js	1500	text/javascript	1	2026-04-19 16:39:56.699517
199	\N	test_ai_scenarios.py	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/tests/e2e/test_ai_scenarios.py	9727	text/x-python	1	2026-04-19 16:39:58.106331
44	\N	main.92feb968.js.LICENSE.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/build/static/js/main.92feb968.js.LICENSE.txt	1830	text/plain	1	2026-04-19 16:39:55.445246
36	\N	file.svg	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/public/icons/file.svg	292	application/octet-stream	1	2026-04-19 16:39:55.367458
58	\N	Login.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Auth/Login.css	4817	application/octet-stream	1	2026-04-19 16:39:55.610707
156	\N	LanguageContext.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/context/LanguageContext.js	2102	text/javascript	1	2026-04-19 16:39:56.68421
168	\N	fileUtils.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/utils/fileUtils.js	3474	text/javascript	1	2026-04-19 16:39:56.761893
83	\N	AudioPlayer.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/AudioPlayer.css	1566	application/octet-stream	1	2026-04-19 16:39:55.868933
85	\N	ExcelEditor.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/ExcelEditor.css	25623	application/octet-stream	1	2026-04-19 16:39:55.89117
93	\N	PowerPointEditor.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/PowerPointEditor.css	22001	application/octet-stream	1	2026-04-19 16:39:55.979966
61	\N	Calendar.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Calendar/Calendar.jsx	42029	application/octet-stream	1	2026-04-19 16:39:55.634102
138	\N	RemotePage.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Remote/RemotePage.css	8897	application/octet-stream	1	2026-04-19 16:39:56.571621
150	\N	UploadPopup.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/UserPanel/UploadPopup.css	7237	application/octet-stream	1	2026-04-19 16:39:56.645234
160	\N	index.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/index.css	619	application/octet-stream	1	2026-04-19 16:39:56.711902
102	\N	WordEditor.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/WordEditor.jsx	54808	application/octet-stream	1	2026-04-19 16:39:56.080255
95	\N	PowerPointEditor.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/PowerPointEditor.jsx	57177	application/octet-stream	1	2026-04-19 16:39:56.002182
119	\N	ExportCalendarModal.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/ExportCalendarModal.css	5115	application/octet-stream	1	2026-04-19 16:39:56.474581
177	\N	cryptoUtils.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/auth-service/src/utils/cryptoUtils.js	1255	text/javascript	1	2026-04-19 16:39:57.024426
195	\N	responseHandler.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/outlook-service/src/utils/responseHandler.js	272	text/javascript	1	2026-04-19 16:39:57.734356
187	\N	fileParser.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/ai-service/src/utils/fileParser.js	5388	text/javascript	1	2026-04-19 16:39:57.177358
20	\N	prepare-commit-msg.sample	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/hooks/prepare-commit-msg.sample	1492	application/octet-stream	1	2026-04-19 16:39:20.446627
34	\N	Dockerfile	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/gateway/Dockerfile	58	application/octet-stream	1	2026-04-19 16:39:55.345283
12	\N	fsmonitor-watchman.sample	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/hooks/fsmonitor-watchman.sample	4726	application/octet-stream	1	2026-04-19 16:39:20.410518
196	\N	check_models.py	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/tests/check_models.py	1222	text/x-python	1	2026-04-19 16:39:58.091263
9	\N	description	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/description	73	application/octet-stream	1	2026-04-19 16:39:20.395431
42	\N	488.24eb15e6.chunk.js.map	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/build/static/js/488.24eb15e6.chunk.js.map	6204	application/octet-stream	1	2026-04-19 16:39:55.428555
176	\N	db.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/windows-service/src/database/db.js	178	text/javascript	1	2026-04-19 16:39:56.956337
11	\N	commit-msg.sample	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/hooks/commit-msg.sample	896	application/octet-stream	1	2026-04-19 16:39:20.403767
15	\N	pre-commit.sample	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/hooks/pre-commit.sample	1649	application/octet-stream	1	2026-04-19 16:39:20.423215
35	\N	asset-manifest.json	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/build/asset-manifest.json	531	application/json	1	2026-04-19 16:39:55.355167
30	\N	README.md	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/README.md	3486	application/octet-stream	1	2026-04-19 16:39:55.309294
51	\N	App.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/App.js	19827	text/javascript	1	2026-04-19 16:39:55.539661
55	\N	GroupManager.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Admin/GroupManager.jsx	12061	application/octet-stream	1	2026-04-19 16:39:55.578556
68	\N	FolderIcon.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Common/FolderIcon.jsx	6222	application/octet-stream	1	2026-04-19 16:39:55.700982
204	\N	test_guacd_handshake.py	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/tests/test_guacd_handshake.py	2533	text/x-python	1	2026-04-19 16:39:58.131531
56	\N	RDPManager.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Admin/RDPManager.css	16120	application/octet-stream	1	2026-04-19 16:39:55.588478
106	\N	BaseLayout.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Layout/BaseLayout.jsx	1022	application/octet-stream	1	2026-04-19 16:39:56.124716
112	\N	CreateFolderModal.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/CreateFolderModal.jsx	1846	application/octet-stream	1	2026-04-19 16:39:56.442451
148	\N	RecentFileItem.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/UserPanel/RecentFileItem.jsx	7805	application/octet-stream	1	2026-04-19 16:39:56.632728
348	\N	Documento.docx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Documento.docx	4636	application/vnd.openxmlformats-officedocument.wordprocessingml.document	1	2026-04-19 18:22:34.429258
91	\N	PDFEditor.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/PDFEditor.css	11318	application/octet-stream	1	2026-04-19 16:39:55.958202
99	\N	VideoPlayer.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/VideoPlayer.css	13245	application/octet-stream	1	2026-04-19 16:39:56.04804
107	\N	AIResultsModal.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/AIResultsModal.css	6596	application/octet-stream	1	2026-04-19 16:39:56.136904
142	\N	ContextMenu.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/UserPanel/ContextMenu.css	572	application/octet-stream	1	2026-04-19 16:39:56.594338
144	\N	FileItem.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/UserPanel/FileItem.jsx	41616	application/octet-stream	1	2026-04-19 16:39:56.610509
151	\N	UploadPopup.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/UserPanel/UploadPopup.jsx	8676	application/octet-stream	1	2026-04-19 16:39:56.653797
155	\N	UserPanelMobile.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/UserPanel/UserPanelMobile.css	4862	application/octet-stream	1	2026-04-19 16:39:56.677371
121	\N	FileDeleteModal.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/FileDeleteModal.jsx	2369	application/octet-stream	1	2026-04-19 16:39:56.482947
123	\N	FileViewerModal.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/FileViewerModal.jsx	14905	application/octet-stream	1	2026-04-19 16:39:56.492644
124	\N	FolderCustomizeModal.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/FolderCustomizeModal.css	5214	application/octet-stream	1	2026-04-19 16:39:56.498006
127	\N	LocationPickerModal.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/LocationPickerModal.jsx	14509	application/octet-stream	1	2026-04-19 16:39:56.510754
136	\N	RDPViewer.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/RDP/RDPViewer.css	7713	application/octet-stream	1	2026-04-19 16:39:56.56048
10	\N	applypatch-msg.sample	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/hooks/applypatch-msg.sample	478	application/octet-stream	1	2026-04-19 16:39:20.399406
183	\N	database.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/ai-service/src/utils/database.js	489	text/javascript	1	2026-04-19 16:39:57.132918
1694	\N	PROAVF´ÇªWinx64´ÇªNDIS68´Çªmanifest_iavf68.man	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS68´Çªmanifest_iavf68.man	29661	application/octet-stream	1	2026-04-19 18:22:46.728205
203	\N	test_rdp_full.py	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/tests/e2e/test_rdp_full.py	28330	text/x-python	1	2026-04-19 16:39:58.124399
48	\N	package.json	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/package.json	1576	application/json	1	2026-04-19 16:39:55.484108
43	\N	main.92feb968.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/build/static/js/main.92feb968.js	2439305	text/javascript	1	2026-04-19 16:39:55.435689
165	\N	logo.svg	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/logo.svg	2632	application/octet-stream	1	2026-04-19 16:39:56.744038
6	\N	COMMIT_EDITMSG	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/COMMIT_EDITMSG	8	application/octet-stream	1	2026-04-19 16:39:20.382775
47	\N	package-lock.json	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/package-lock.json	18580	application/json	1	2026-04-19 16:39:55.477346
172	\N	01_schema.sql	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/postgres-init/01_schema.sql	6259	application/octet-stream	1	2026-04-19 16:39:56.823029
166	\N	reportWebVitals.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/reportWebVitals.js	375	text/javascript	1	2026-04-19 16:39:56.749417
174	\N	db-postgres.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/windows-service/src/database/db-postgres.js	2514	text/javascript	1	2026-04-19 16:39:56.889677
161	\N	index.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/windows-service/src/index.js	20242	text/javascript	1	2026-04-19 16:39:56.72042
175	\N	db-sqlite.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/user-service/src/database/db-sqlite.js	10278	text/javascript	1	2026-04-19 16:39:56.921852
13	\N	post-update.sample	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/hooks/post-update.sample	189	application/octet-stream	1	2026-04-19 16:39:20.414876
18	\N	pre-rebase.sample	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/hooks/pre-rebase.sample	4898	application/octet-stream	1	2026-04-19 16:39:20.436902
25	\N	exclude	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/info/exclude	240	application/octet-stream	1	2026-04-19 16:39:20.477389
29	\N	settings.json	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.vscode/settings.json	221	application/json	1	2026-04-19 16:39:55.303549
7	\N	HEAD	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/refs/remotes/origin/HEAD	30	application/octet-stream	1	2026-04-19 16:39:20.387107
26	\N	main	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/refs/remotes/origin/main	41	application/octet-stream	1	2026-04-19 16:39:20.489891
63	\N	CalendarMobile.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Calendar/CalendarMobile.css	4457	application/octet-stream	1	2026-04-19 16:39:55.650777
45	\N	main.92feb968.js.map	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/build/static/js/main.92feb968.js.map	10936832	application/octet-stream	1	2026-04-19 16:39:55.455152
50	\N	App.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/App.css	1748	application/octet-stream	1	2026-04-19 16:39:55.532926
53	\N	AdminPanel.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Admin/AdminPanel.jsx	77541	application/octet-stream	1	2026-04-19 16:39:55.556343
54	\N	GroupManager.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Admin/GroupManager.css	4382	application/octet-stream	1	2026-04-19 16:39:55.566264
59	\N	Login.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Auth/Login.jsx	4996	application/octet-stream	1	2026-04-19 16:39:55.617454
71	\N	FrostedContainer.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Common/FrostedContainer.css	2763	application/octet-stream	1	2026-04-19 16:39:55.735501
74	\N	Input.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Common/Input.jsx	1919	application/octet-stream	1	2026-04-19 16:39:55.767643
76	\N	NotificationCenter.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Common/NotificationCenter.jsx	5177	application/octet-stream	1	2026-04-19 16:39:55.78985
133	\N	SettingsModal.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/SettingsModal.jsx	31973	application/octet-stream	1	2026-04-19 16:39:56.542647
49	\N	postcss.config.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/postcss.config.js	86	text/javascript	1	2026-04-19 16:39:55.491322
64	\N	DayPanel.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Calendar/DayPanel.jsx	1797	application/octet-stream	1	2026-04-19 16:39:55.658019
115	\N	DuplicateFilesModal.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/DuplicateFilesModal.css	4325	application/octet-stream	1	2026-04-19 16:39:56.457903
269	\N	00002.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/00002.sp1	815905	application/octet-stream	1	2026-04-19 17:44:03.789912
270	\N	hoedown.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/hoedown.dll	186880	application/octet-stream	1	2026-04-19 17:44:03.798061
277	\N	qsvg.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/imageformats/qsvg.dll	29184	application/octet-stream	1	2026-04-19 17:44:03.87541
254	\N	Qt6Network.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/Qt6Network.dll	1420288	application/octet-stream	1	2026-04-19 17:44:03.664709
288	\N	fr_fr.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/fr_fr.qm	125376	application/octet-stream	1	2026-04-19 17:44:03.996823
255	\N	Qt6OpenGL.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/Qt6OpenGL.dll	1925632	application/octet-stream	1	2026-04-19 17:44:03.673035
260	\N	Snipaste.exe	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/Snipaste.exe	7008768	application/octet-stream	1	2026-04-19 17:44:03.71497
271	\N	qsvgicon.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/iconengines/qsvgicon.dll	53760	application/octet-stream	1	2026-04-19 17:44:03.808285
289	\N	it_it.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/it_it.qm	126256	application/octet-stream	1	2026-04-19 17:44:04.007773
290	\N	ja_jp.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/ja_jp.qm	74131	application/octet-stream	1	2026-04-19 17:44:04.018845
261	\N	api-ms-win-core-libraryloader-l1-2-0.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/api-ms-win-core-libraryloader-l1-2-0.dll	19136	application/octet-stream	1	2026-04-19 17:44:03.723047
278	\N	qtga.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/imageformats/qtga.dll	27648	application/octet-stream	1	2026-04-19 17:44:03.885517
291	\N	ko.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/ko.qm	90649	application/octet-stream	1	2026-04-19 17:44:04.030147
263	\N	api-ms-win-core-winrt-string-l1-1-0.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/api-ms-win-core-winrt-string-l1-1-0.dll	20240	application/octet-stream	1	2026-04-19 17:44:03.739818
267	\N	00000.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/00000.sp1	824425	application/octet-stream	1	2026-04-19 17:44:03.773064
268	\N	00001.sp1	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/history/snip/00001.sp1	894056	application/octet-stream	1	2026-04-19 17:44:03.781632
279	\N	qtiff.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/imageformats/qtiff.dll	400384	application/octet-stream	1	2026-04-19 17:44:03.896964
281	\N	qwebp.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/imageformats/qwebp.dll	528896	application/octet-stream	1	2026-04-19 17:44:03.919169
282	\N	ar_jo.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/ar_jo.qm	82536	application/octet-stream	1	2026-04-19 17:44:03.930573
248	\N	Git-2.53.0.3-64-bit.exe	/app/uploads/administrador/Descargas/Git-2.53.0.3-64-bit.exe	64557224	application/octet-stream	1	2026-04-19 17:44:03.469105
249	\N	D3Dcompiler_47.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/D3Dcompiler_47.dll	4575232	application/octet-stream	1	2026-04-19 17:44:03.62409
251	\N	Qt6Core.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/Qt6Core.dll	5436928	application/octet-stream	1	2026-04-19 17:44:03.639731
272	\N	qapng.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/imageformats/qapng.dll	147456	application/octet-stream	1	2026-04-19 17:44:03.81894
273	\N	qgif.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/imageformats/qgif.dll	37376	application/octet-stream	1	2026-04-19 17:44:03.830199
283	\N	cs_cz.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/cs_cz.qm	47012	application/octet-stream	1	2026-04-19 17:44:03.941153
285	\N	el_gr.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/el_gr.qm	85905	application/octet-stream	1	2026-04-19 17:44:03.963554
253	\N	Qt6Gui.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/Qt6Gui.dll	7112704	application/octet-stream	1	2026-04-19 17:44:03.656557
256	\N	Qt6PrintSupport.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/Qt6PrintSupport.dll	382976	application/octet-stream	1	2026-04-19 17:44:03.681392
257	\N	Qt6Svg.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/Qt6Svg.dll	343040	application/octet-stream	1	2026-04-19 17:44:03.689758
258	\N	Qt6Widgets.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/Qt6Widgets.dll	5860352	application/octet-stream	1	2026-04-19 17:44:03.698196
274	\N	qicns.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/imageformats/qicns.dll	44032	application/octet-stream	1	2026-04-19 17:44:03.84113
276	\N	qjpeg.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/imageformats/qjpeg.dll	449536	application/octet-stream	1	2026-04-19 17:44:03.863624
287	\N	fi_fi.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/fi_fi.qm	3435	application/octet-stream	1	2026-04-19 17:44:03.985532
319	\N	ru.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/ru.qm	124035	application/octet-stream	1	2026-04-19 17:44:04.359367
326	\N	zh_tw.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/zh_tw.qm	83487	application/octet-stream	1	2026-04-19 17:44:04.476065
301	\N	qt_fi_fi.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_fi_fi.qm	2279	application/octet-stream	1	2026-04-19 17:44:04.146831
313	\N	qt_sv.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_sv.qm	67753	application/octet-stream	1	2026-04-19 17:44:04.280057
308	\N	qt_pl_pl.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_pl_pl.qm	22455	application/octet-stream	1	2026-04-19 17:44:04.224422
314	\N	qt_tr_tr.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_tr_tr.qm	22522	application/octet-stream	1	2026-04-19 17:44:04.291232
320	\N	sr.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/sr.qm	100456	application/octet-stream	1	2026-04-19 17:44:04.37585
327	\N	libcrypto-3-x64.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/libcrypto-3-x64.dll	5014016	application/octet-stream	1	2026-04-19 17:44:04.492548
302	\N	qt_fr_fr.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_fr_fr.qm	23399	application/octet-stream	1	2026-04-19 17:44:04.158516
309	\N	qt_pt_br.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_pt_br.qm	11153	application/octet-stream	1	2026-04-19 17:44:04.235827
294	\N	pl_pl.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/pl_pl.qm	63363	application/octet-stream	1	2026-04-19 17:44:04.063468
303	\N	qt_it_it.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_it_it.qm	23351	application/octet-stream	1	2026-04-19 17:44:04.169158
321	\N	sv.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/sv.qm	50998	application/octet-stream	1	2026-04-19 17:44:04.392766
329	\N	msvcp140.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/msvcp140.dll	557704	application/octet-stream	1	2026-04-19 17:44:04.525874
304	\N	qt_ja_jp.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_ja_jp.qm	19601	application/octet-stream	1	2026-04-19 17:44:04.180116
310	\N	qt_pt_pt.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_pt_pt.qm	11193	application/octet-stream	1	2026-04-19 17:44:04.246762
315	\N	qt_vi_vn.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_vi_vn.qm	11278	application/octet-stream	1	2026-04-19 17:44:04.302274
322	\N	tr_tr.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/tr_tr.qm	90023	application/octet-stream	1	2026-04-19 17:44:04.409173
331	\N	msvcp140_2.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/msvcp140_2.dll	280168	application/octet-stream	1	2026-04-19 17:44:04.559105
295	\N	pt_br.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/pt_br.qm	121150	application/octet-stream	1	2026-04-19 17:44:04.074751
323	\N	vi_vn.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/vi_vn.qm	96145	application/octet-stream	1	2026-04-19 17:44:04.426151
305	\N	qt_ko.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_ko.qm	154608	application/octet-stream	1	2026-04-19 17:44:04.191232
324	\N	zh_cn.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/zh_cn.qm	83693	application/octet-stream	1	2026-04-19 17:44:04.442466
296	\N	pt_pt.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/pt_pt.qm	121280	application/octet-stream	1	2026-04-19 17:44:04.090989
297	\N	qt_cs_cz.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_cs_cz.qm	190560	application/octet-stream	1	2026-04-19 17:44:04.106751
298	\N	qt_de_de.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_de_de.qm	23225	application/octet-stream	1	2026-04-19 17:44:04.113719
306	\N	qt_lt.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_lt.qm	24644	application/octet-stream	1	2026-04-19 17:44:04.202491
311	\N	qt_ru.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_ru.qm	23305	application/octet-stream	1	2026-04-19 17:44:04.257759
316	\N	qt_zh_cn.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_zh_cn.qm	119088	application/octet-stream	1	2026-04-19 17:44:04.31351
317	\N	qt_zh_hk.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_zh_hk.qm	26	application/octet-stream	1	2026-04-19 17:44:04.325876
299	\N	qt_el_gr.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_el_gr.qm	69116	application/octet-stream	1	2026-04-19 17:44:04.124778
300	\N	qt_es_mx.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_es_mx.qm	23313	application/octet-stream	1	2026-04-19 17:44:04.135679
307	\N	qt_nl_nl.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_nl_nl.qm	10943	application/octet-stream	1	2026-04-19 17:44:04.2135
312	\N	qt_sr.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_sr.qm	10416	application/octet-stream	1	2026-04-19 17:44:04.270352
318	\N	qt_zh_tw.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/qt_zh_tw.qm	118920	application/octet-stream	1	2026-04-19 17:44:04.342522
325	\N	zh_hk.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/zh_hk.qm	6281	application/octet-stream	1	2026-04-19 17:44:04.459389
66	\N	Button.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Common/Button.jsx	1469	application/octet-stream	1	2026-04-19 16:39:55.678739
117	\N	EventModal.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/EventModal.css	18290	application/octet-stream	1	2026-04-19 16:39:56.466269
94	\N	PowerPointEditor.css.bak	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/PowerPointEditor.css.bak	5464	application/octet-stream	1	2026-04-19 16:39:55.989885
100	\N	VideoPlayer.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/VideoPlayer.jsx	25609	application/octet-stream	1	2026-04-19 16:39:56.057984
77	\N	Toast.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Common/Toast.css	1893	application/octet-stream	1	2026-04-19 16:39:55.802172
79	\N	DocumentAIEditor.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/DocumentAIEditor.css	9710	application/octet-stream	1	2026-04-19 16:39:55.824398
101	\N	WordEditor.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/WordEditor.css	25083	application/octet-stream	1	2026-04-19 16:39:56.070373
104	\N	ZipViewer.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/ZipViewer.jsx	9927	application/octet-stream	1	2026-04-19 16:39:56.102389
120	\N	ExportCalendarModal.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/ExportCalendarModal.jsx	17589	application/octet-stream	1	2026-04-19 16:39:56.478543
198	\N	test_advanced_features.py	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/tests/e2e/test_advanced_features.py	3787	text/x-python	1	2026-04-19 16:39:58.102357
252	\N	Qt6Core5Compat.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/Qt6Core5Compat.dll	815104	application/octet-stream	1	2026-04-19 17:44:03.648172
259	\N	Qt6Xml.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/Qt6Xml.dll	122880	application/octet-stream	1	2026-04-19 17:44:03.706346
17	\N	pre-push.sample	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/hooks/pre-push.sample	1374	application/octet-stream	1	2026-04-19 16:39:20.431531
262	\N	api-ms-win-core-winrt-error-l1-1-0.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/api-ms-win-core-winrt-error-l1-1-0.dll	19720	application/octet-stream	1	2026-04-19 17:44:03.731816
275	\N	qico.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/imageformats/qico.dll	35840	application/octet-stream	1	2026-04-19 17:44:03.852394
280	\N	qwbmp.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/imageformats/qwbmp.dll	26112	application/octet-stream	1	2026-04-19 17:44:03.907814
286	\N	es_mx.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/es_mx.qm	124410	application/octet-stream	1	2026-04-19 17:44:03.974537
293	\N	nl_nl.qm	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/lang/nl_nl.qm	118930	application/octet-stream	1	2026-04-19 17:44:04.052588
19	\N	pre-receive.sample	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/hooks/pre-receive.sample	544	application/octet-stream	1	2026-04-19 16:39:20.442652
40	\N	main.fb5b6919.css.map	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/build/static/css/main.fb5b6919.css.map	587260	application/octet-stream	1	2026-04-19 16:39:55.41189
134	\N	ShareModal.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/ShareModal.css	10644	application/octet-stream	1	2026-04-19 16:39:56.5494
103	\N	ZipViewer.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/ZipViewer.css	8493	application/octet-stream	1	2026-04-19 16:39:56.092473
24	\N	index	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/index	28192	application/octet-stream	1	2026-04-19 16:39:20.46886
62	\N	CalendarDesktop.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Calendar/CalendarDesktop.css	167	application/octet-stream	1	2026-04-19 16:39:55.644023
82	\N	FileEditorPanel.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/FileEditorPanel.jsx	16911	application/octet-stream	1	2026-04-19 16:39:55.85655
1337	\N	DOCS´ÇªQUICK´ÇªKOR´Çªlicense.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªKOR´Çªlicense.htm	9455	application/octet-stream	1	2026-04-19 18:22:43.524537
1860	\N	PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInIXT.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInIXT.dll	100296	application/octet-stream	1	2026-04-19 18:22:48.371912
143	\N	ContextMenu.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/UserPanel/ContextMenu.jsx	1148	application/octet-stream	1	2026-04-19 16:39:56.600976
188	\N	indexingOptimizations.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/ai-service/src/utils/indexingOptimizations.js	8871	text/javascript	1	2026-04-19 16:39:57.184113
332	\N	qnetworklistmanager.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/networkinformation/qnetworklistmanager.dll	32256	application/octet-stream	1	2026-04-19 17:47:23.604211
333	\N	qwindows.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/platforms/qwindows.dll	776192	application/octet-stream	1	2026-04-19 17:47:23.621655
334	\N	quazip.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/quazip.dll	204288	application/octet-stream	1	2026-04-19 17:47:23.65498
335	\N	bubble.wav	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/sound/bubble.wav	9678	application/octet-stream	1	2026-04-19 17:47:23.693783
336	\N	snip.wav	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/sound/snip.wav	33494	application/octet-stream	1	2026-04-19 17:47:23.721927
337	\N	splog.txt	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/splog.txt	60636	text/plain	1	2026-04-19 17:47:23.754976
339	\N	qcertonlybackend.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/tls/qcertonlybackend.dll	84992	application/octet-stream	1	2026-04-19 17:47:23.821692
340	\N	qopensslbackend.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/tls/qopensslbackend.dll	222720	application/octet-stream	1	2026-04-19 17:47:23.855053
341	\N	qschannelbackend.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/tls/qschannelbackend.dll	195584	application/octet-stream	1	2026-04-19 17:47:23.888288
342	\N	vcruntime140.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/vcruntime140.dll	124544	application/octet-stream	1	2026-04-19 17:47:23.921649
343	\N	vcruntime140_1.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/vcruntime140_1.dll	49824	application/octet-stream	1	2026-04-19 17:47:23.954929
344	\N	Snipaste-2.11.3-x64.zip	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64.zip	19484393	application/zip	1	2026-04-19 17:47:23.988574
345	\N	VSCodeUserSetup-x64-1.116.0.exe	/app/uploads/administrador/Descargas/VSCodeUserSetup-x64-1.116.0.exe	158197968	application/octet-stream	1	2026-04-19 17:47:24.022198
346	\N	cloudflared-windows-amd64.msi	/app/uploads/administrador/Descargas/cloudflared-windows-amd64.msi	19095552	application/octet-stream	1	2026-04-19 17:47:24.05504
201	\N	test_endpoints.py	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/tests/e2e/test_endpoints.py	3273	text/x-python	1	2026-04-19 16:39:58.11606
250	\N	Qt6Concurrent.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/Qt6Concurrent.dll	25600	application/octet-stream	1	2026-04-19 17:44:03.631474
347	\N	Documento.docx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/eric/Documento.docx	4636	application/vnd.openxmlformats-officedocument.wordprocessingml.document	1	2026-04-19 18:22:34.429059
338	\N	qwindowsvistastyle.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/styles/qwindowsvistastyle.dll	152064	application/octet-stream	1	2026-04-19 17:47:23.788308
349	\N	Presentaci├│n.pptx	/app/uploads/administrador/Escritorio/Datos/eric/Presentaci├│n.pptx	15385	application/octet-stream	1	2026-04-19 18:22:34.448631
350	\N	Presentaci├│n.pptx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/eric/Presentaci├│n.pptx	15385	application/octet-stream	1	2026-04-19 18:22:34.450356
218	\N	Docker Desktop Installer (1).exe	/app/uploads/administrador/Descargas/Docker Desktop Installer (1).exe	441516032	application/octet-stream	1	2026-04-19 17:12:40.973107
220	\N	Docker Desktop Installer.exe	/app/uploads/administrador/Descargas/Docker Desktop Installer.exe	29491200	application/octet-stream	1	2026-04-19 17:12:41.455752
215	\N	Docker Desktop Installer (1).exe	/app/uploads/administrador/Descargas/Docker Desktop Installer (1).exe	132644864	application/octet-stream	1	2026-04-19 17:12:40.774221
216	\N	Docker Desktop Installer (1).exe	/app/uploads/administrador/Descargas/Docker Desktop Installer (1).exe	647826864	application/octet-stream	1	2026-04-19 17:12:40.83629
217	\N	Docker Desktop Installer (1).exe	/app/uploads/administrador/Descargas/Docker Desktop Installer (1).exe	446038016	application/octet-stream	1	2026-04-19 17:12:40.836786
1275	\N	DOCS´ÇªQUICK´ÇªDEU´Çªwarranty.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªDEU´Çªwarranty.htm	9740	application/octet-stream	1	2026-04-19 18:22:43.206482
1292	\N	DOCS´ÇªQUICK´ÇªESN´Çªlicense.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªESN´Çªlicense.htm	12712	application/octet-stream	1	2026-04-19 18:22:43.283688
1259	\N	DOCS´ÇªQUICK´ÇªCHT´Çªnote.gif	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHT´Çªnote.gif	1008	image/gif	1	2026-04-19 18:22:43.123384
1290	\N	DOCS´ÇªQUICK´ÇªESN´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªESN´Çªlegaldis.htm	964	application/octet-stream	1	2026-04-19 18:22:43.275436
1303	\N	DOCS´ÇªQUICK´ÇªFRA´Çªlicense.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªFRA´Çªlicense.htm	12908	application/octet-stream	1	2026-04-19 18:22:43.357588
1320	\N	DOCS´ÇªQUICK´ÇªITA´Çªqi_ita.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªITA´Çªqi_ita.htm	13897	application/octet-stream	1	2026-04-19 18:22:43.430063
1334	\N	DOCS´ÇªQUICK´ÇªJPN´Çªwarranty.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªJPN´Çªwarranty.htm	10520	application/octet-stream	1	2026-04-19 18:22:43.497541
1348	\N	DOCS´ÇªQUICK´ÇªPTB´Çªlicense.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªPTB´Çªlicense.htm	11764	application/octet-stream	1	2026-04-19 18:22:43.592061
1276	\N	DOCS´ÇªQUICK´ÇªDEU´Çªwarranty.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªDEU´Çªwarranty.htm	9740	application/octet-stream	1	2026-04-19 18:22:43.211957
1243	\N	DOCS´ÇªAdapter_User_Guide.pdf	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªAdapter_User_Guide.pdf	85638	application/pdf	1	2026-04-19 18:22:42.851864
1245	\N	DOCS´ÇªQUICK´ÇªCHS´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHS´Çªlegaldis.htm	825	application/octet-stream	1	2026-04-19 18:22:42.873701
1247	\N	DOCS´ÇªQUICK´ÇªCHS´Çªlicense.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHS´Çªlicense.htm	6729	application/octet-stream	1	2026-04-19 18:22:42.896245
1253	\N	DOCS´ÇªQUICK´ÇªCHS´Çªstyle.css	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHS´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:42.96263
1265	\N	DOCS´ÇªQUICK´ÇªCHT´Çªwarranty.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHT´Çªwarranty.htm	7587	application/octet-stream	1	2026-04-19 18:22:43.150552
1274	\N	DOCS´ÇªQUICK´ÇªDEU´Çªstyle.css	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªDEU´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:43.1962
1282	\N	DOCS´ÇªQUICK´ÇªENU´Çªnote.gif	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªENU´Çªnote.gif	1008	image/gif	1	2026-04-19 18:22:43.241174
1307	\N	DOCS´ÇªQUICK´ÇªFRA´Çªqi_fra.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªFRA´Çªqi_fra.htm	14606	application/octet-stream	1	2026-04-19 18:22:43.374351
1314	\N	DOCS´ÇªQUICK´ÇªITA´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªITA´Çªlegaldis.htm	953	application/octet-stream	1	2026-04-19 18:22:43.400697
1321	\N	DOCS´ÇªQUICK´ÇªITA´Çªstyle.css	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªITA´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:43.435637
1257	\N	DOCS´ÇªQUICK´ÇªCHT´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHT´Çªlegaldis.htm	779	application/octet-stream	1	2026-04-19 18:22:43.106471
1261	\N	DOCS´ÇªQUICK´ÇªCHT´Çªqi_cht.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHT´Çªqi_cht.htm	12366	application/octet-stream	1	2026-04-19 18:22:43.129945
1267	\N	DOCS´ÇªQUICK´ÇªDEU´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªDEU´Çªlegaldis.htm	905	application/octet-stream	1	2026-04-19 18:22:43.161261
1269	\N	DOCS´ÇªQUICK´ÇªDEU´Çªlicense.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªDEU´Çªlicense.htm	13266	application/octet-stream	1	2026-04-19 18:22:43.170341
1241	\N	3rd_party_licenses.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/3rd_party_licenses.txt	122682	text/plain	1	2026-04-19 18:22:42.829853
1264	\N	DOCS´ÇªQUICK´ÇªCHT´Çªstyle.css	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHT´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:43.147925
1287	\N	DOCS´ÇªQUICK´ÇªENU´Çªwarranty.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªENU´Çªwarranty.htm	8529	application/octet-stream	1	2026-04-19 18:22:43.262661
1295	\N	DOCS´ÇªQUICK´ÇªESN´Çªqi_esn.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªESN´Çªqi_esn.htm	13932	application/octet-stream	1	2026-04-19 18:22:43.302296
1317	\N	DOCS´ÇªQUICK´ÇªITA´Çªnote.gif	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªITA´Çªnote.gif	1008	image/gif	1	2026-04-19 18:22:43.417252
1323	\N	DOCS´ÇªQUICK´ÇªITA´Çªwarranty.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªITA´Çªwarranty.htm	9674	application/octet-stream	1	2026-04-19 18:22:43.444095
1332	\N	DOCS´ÇªQUICK´ÇªJPN´Çªstyle.css	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªJPN´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:43.485859
1340	\N	DOCS´ÇªQUICK´ÇªKOR´Çªnote.gif	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªKOR´Çªnote.gif	1008	image/gif	1	2026-04-19 18:22:43.537908
1254	\N	DOCS´ÇªQUICK´ÇªCHS´Çªstyle.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHS´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:42.984134
1291	\N	DOCS´ÇªQUICK´ÇªESN´Çªlicense.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªESN´Çªlicense.htm	12712	application/octet-stream	1	2026-04-19 18:22:43.282828
1333	\N	DOCS´ÇªQUICK´ÇªJPN´Çªstyle.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªJPN´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:43.496585
328	\N	libssl-3-x64.dll	/app/uploads/administrador/Descargas/Snipaste-2.11.3-x64/libssl-3-x64.dll	1248768	application/octet-stream	1	2026-04-19 17:44:04.509326
1258	\N	DOCS´ÇªQUICK´ÇªCHT´Çªlicense.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHT´Çªlicense.htm	6763	application/octet-stream	1	2026-04-19 18:22:43.113453
1271	\N	DOCS´ÇªQUICK´ÇªDEU´Çªnote.gif	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªDEU´Çªnote.gif	1008	image/gif	1	2026-04-19 18:22:43.180583
1279	\N	DOCS´ÇªQUICK´ÇªENU´Çªlicense.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªENU´Çªlicense.htm	11009	application/octet-stream	1	2026-04-19 18:22:43.229424
1285	\N	DOCS´ÇªQUICK´ÇªENU´Çªstyle.css	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªENU´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:43.25517
1305	\N	DOCS´ÇªQUICK´ÇªFRA´Çªnote.gif	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªFRA´Çªnote.gif	1008	image/gif	1	2026-04-19 18:22:43.366557
1315	\N	DOCS´ÇªQUICK´ÇªITA´Çªlicense.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªITA´Çªlicense.htm	12768	application/octet-stream	1	2026-04-19 18:22:43.408967
1335	\N	DOCS´ÇªQUICK´ÇªKOR´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªKOR´Çªlegaldis.htm	907	application/octet-stream	1	2026-04-19 18:22:43.508838
1353	\N	DOCS´ÇªQUICK´ÇªPTB´Çªstyle.css	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªPTB´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:43.631359
1242	\N	3rd_party_licenses.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/3rd_party_licenses.txt	122682	text/plain	1	2026-04-19 18:22:42.830096
1281	\N	DOCS´ÇªQUICK´ÇªENU´Çªnote.gif	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªENU´Çªnote.gif	1008	image/gif	1	2026-04-19 18:22:43.237616
1289	\N	DOCS´ÇªQUICK´ÇªESN´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªESN´Çªlegaldis.htm	964	application/octet-stream	1	2026-04-19 18:22:43.271503
1158	\N	Hoja de c├ílculo.xlsx	/app/uploads/administrador/Hoja de c├ílculo.xlsx	2552	application/vnd.openxmlformats-officedocument.spreadsheetml.sheet	1	2026-04-19 18:22:42.071
1250	\N	DOCS´ÇªQUICK´ÇªCHS´Çªnote.gif	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHS´Çªnote.gif	1008	image/gif	1	2026-04-19 18:22:42.927346
1244	\N	DOCS´ÇªAdapter_User_Guide.pdf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªAdapter_User_Guide.pdf	85638	application/pdf	1	2026-04-19 18:22:42.85185
1277	\N	DOCS´ÇªQUICK´ÇªENU´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªENU´Çªlegaldis.htm	920	application/octet-stream	1	2026-04-19 18:22:43.220772
1263	\N	DOCS´ÇªQUICK´ÇªCHT´Çªstyle.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHT´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:43.139446
1293	\N	DOCS´ÇªQUICK´ÇªESN´Çªnote.gif	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªESN´Çªnote.gif	1008	image/gif	1	2026-04-19 18:22:43.293107
1270	\N	DOCS´ÇªQUICK´ÇªDEU´Çªnote.gif	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªDEU´Çªnote.gif	1008	image/gif	1	2026-04-19 18:22:43.179673
1280	\N	DOCS´ÇªQUICK´ÇªENU´Çªlicense.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªENU´Çªlicense.htm	11009	application/octet-stream	1	2026-04-19 18:22:43.229574
1286	\N	DOCS´ÇªQUICK´ÇªENU´Çªstyle.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªENU´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:43.258818
1310	\N	DOCS´ÇªQUICK´ÇªFRA´Çªstyle.css	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªFRA´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:43.38362
1322	\N	DOCS´ÇªQUICK´ÇªITA´Çªwarranty.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªITA´Çªwarranty.htm	9674	application/octet-stream	1	2026-04-19 18:22:43.443954
1329	\N	DOCS´ÇªQUICK´ÇªJPN´Çªnote.gif	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªJPN´Çªnote.gif	1008	image/gif	1	2026-04-19 18:22:43.46882
1378	\N	DOCS´ÇªQUICK´Çªquick.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªquick.htm	3201	application/octet-stream	1	2026-04-19 18:22:43.781535
1379	\N	DOCS´ÇªQUICK´Çªstyle.css	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:43.792225
1381	\N	PRO1000´ÇªWinx64´Çª	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´Çª	0	application/octet-stream	1	2026-04-19 18:22:43.803902
1385	\N	PRO1000´ÇªWinx64´ÇªNDIS65´ÇªNicInVQ.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´ÇªNicInVQ.dll	89976	application/octet-stream	1	2026-04-19 18:22:43.825579
1417	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1r65x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1r65x64.sys	601288	application/octet-stream	1	2026-04-19 18:22:44.121224
1418	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1rmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1rmsg.dll	120520	application/octet-stream	1	2026-04-19 18:22:44.13681
1437	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1d.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1d.cat	23324	application/octet-stream	1	2026-04-19 18:22:44.296207
1441	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1d.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1d.sys	615560	application/octet-stream	1	2026-04-19 18:22:44.331207
1443	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1dmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1dmsg.dll	33920	application/octet-stream	1	2026-04-19 18:22:44.349898
1268	\N	DOCS´ÇªQUICK´ÇªDEU´Çªlicense.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªDEU´Çªlicense.htm	13266	application/octet-stream	1	2026-04-19 18:22:43.165581
1444	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1r68x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1r68x64.cat	20815	application/octet-stream	1	2026-04-19 18:22:44.371585
1278	\N	DOCS´ÇªQUICK´ÇªENU´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªENU´Çªlegaldis.htm	920	application/octet-stream	1	2026-04-19 18:22:43.222105
1260	\N	DOCS´ÇªQUICK´ÇªCHT´Çªnote.gif	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHT´Çªnote.gif	1008	image/gif	1	2026-04-19 18:22:43.124546
1246	\N	DOCS´ÇªQUICK´ÇªCHS´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHS´Çªlegaldis.htm	825	application/octet-stream	1	2026-04-19 18:22:42.874088
1248	\N	DOCS´ÇªQUICK´ÇªCHS´Çªlicense.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHS´Çªlicense.htm	6729	application/octet-stream	1	2026-04-19 18:22:42.896616
1266	\N	DOCS´ÇªQUICK´ÇªDEU´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªDEU´Çªlegaldis.htm	905	application/octet-stream	1	2026-04-19 18:22:43.157462
1316	\N	DOCS´ÇªQUICK´ÇªITA´Çªlicense.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªITA´Çªlicense.htm	12768	application/octet-stream	1	2026-04-19 18:22:43.409053
1252	\N	DOCS´ÇªQUICK´ÇªCHS´Çªqi_chs.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHS´Çªqi_chs.htm	11892	application/octet-stream	1	2026-04-19 18:22:42.950937
1301	\N	DOCS´ÇªQUICK´ÇªFRA´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªFRA´Çªlegaldis.htm	1047	application/octet-stream	1	2026-04-19 18:22:43.349166
1312	\N	DOCS´ÇªQUICK´ÇªFRA´Çªwarranty.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªFRA´Çªwarranty.htm	9836	application/octet-stream	1	2026-04-19 18:22:43.391001
1345	\N	DOCS´ÇªQUICK´ÇªKOR´Çªwarranty.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªKOR´Çªwarranty.htm	9243	application/octet-stream	1	2026-04-19 18:22:43.569793
1405	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1d65x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1d65x64.din	3130	application/octet-stream	1	2026-04-19 18:22:43.996044
1406	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1d65x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1d65x64.inf	221832	application/octet-stream	1	2026-04-19 18:22:44.01527
1297	\N	DOCS´ÇªQUICK´ÇªESN´Çªstyle.css	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªESN´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:43.31906
1299	\N	DOCS´ÇªQUICK´ÇªESN´Çªwarranty.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªESN´Çªwarranty.htm	9922	application/octet-stream	1	2026-04-19 18:22:43.339009
1327	\N	DOCS´ÇªQUICK´ÇªJPN´Çªlicense.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªJPN´Çªlicense.htm	10388	application/octet-stream	1	2026-04-19 18:22:43.460814
1249	\N	DOCS´ÇªQUICK´ÇªCHS´Çªnote.gif	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHS´Çªnote.gif	1008	image/gif	1	2026-04-19 18:22:42.918247
1251	\N	DOCS´ÇªQUICK´ÇªCHS´Çªqi_chs.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHS´Çªqi_chs.htm	11892	application/octet-stream	1	2026-04-19 18:22:42.941034
1256	\N	DOCS´ÇªQUICK´ÇªCHT´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHT´Çªlegaldis.htm	779	application/octet-stream	1	2026-04-19 18:22:43.103055
1302	\N	DOCS´ÇªQUICK´ÇªFRA´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªFRA´Çªlegaldis.htm	1047	application/octet-stream	1	2026-04-19 18:22:43.350027
1304	\N	DOCS´ÇªQUICK´ÇªFRA´Çªlicense.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªFRA´Çªlicense.htm	12908	application/octet-stream	1	2026-04-19 18:22:43.357838
1318	\N	DOCS´ÇªQUICK´ÇªITA´Çªnote.gif	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªITA´Çªnote.gif	1008	image/gif	1	2026-04-19 18:22:43.417774
1319	\N	DOCS´ÇªQUICK´ÇªITA´Çªqi_ita.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªITA´Çªqi_ita.htm	13897	application/octet-stream	1	2026-04-19 18:22:43.427979
1342	\N	DOCS´ÇªQUICK´ÇªKOR´Çªqi_kor.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªKOR´Çªqi_kor.htm	14164	application/octet-stream	1	2026-04-19 18:22:43.552115
1328	\N	DOCS´ÇªQUICK´ÇªJPN´Çªnote.gif	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªJPN´Çªnote.gif	1008	image/gif	1	2026-04-19 18:22:43.468626
1347	\N	DOCS´ÇªQUICK´ÇªPTB´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªPTB´Çªlegaldis.htm	935	application/octet-stream	1	2026-04-19 18:22:43.585479
1350	\N	DOCS´ÇªQUICK´ÇªPTB´Çªnote.gif	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªPTB´Çªnote.gif	1008	image/gif	1	2026-04-19 18:22:43.607659
1352	\N	DOCS´ÇªQUICK´ÇªPTB´Çªqi_ptb.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªPTB´Çªqi_ptb.htm	13291	application/octet-stream	1	2026-04-19 18:22:43.620716
1358	\N	DOCS´ÇªQUICK´Çªchs.gif	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªchs.gif	263	image/gif	1	2026-04-19 18:22:43.66398
1368	\N	DOCS´ÇªQUICK´Çªfra.png	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªfra.png	621	image/png	1	2026-04-19 18:22:43.721942
1374	\N	DOCS´ÇªQUICK´Çªkor.gif	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªkor.gif	217	image/gif	1	2026-04-19 18:22:43.759012
1255	\N	DOCS´ÇªQUICK´ÇªCHS´Çªwarranty.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHS´Çªwarranty.htm	7160	application/octet-stream	1	2026-04-19 18:22:42.985572
1273	\N	DOCS´ÇªQUICK´ÇªDEU´Çªqi_deu.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªDEU´Çªqi_deu.htm	14304	application/octet-stream	1	2026-04-19 18:22:43.189641
1283	\N	DOCS´ÇªQUICK´ÇªENU´Çªqi_enu.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªENU´Çªqi_enu.htm	13196	application/octet-stream	1	2026-04-19 18:22:43.246386
1296	\N	DOCS´ÇªQUICK´ÇªESN´Çªqi_esn.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªESN´Çªqi_esn.htm	13932	application/octet-stream	1	2026-04-19 18:22:43.302739
1262	\N	DOCS´ÇªQUICK´ÇªCHT´Çªqi_cht.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªCHT´Çªqi_cht.htm	12366	application/octet-stream	1	2026-04-19 18:22:43.135244
1306	\N	DOCS´ÇªQUICK´ÇªFRA´Çªnote.gif	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªFRA´Çªnote.gif	1008	image/gif	1	2026-04-19 18:22:43.366696
1308	\N	DOCS´ÇªQUICK´ÇªFRA´Çªqi_fra.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªFRA´Çªqi_fra.htm	14606	application/octet-stream	1	2026-04-19 18:22:43.37453
1284	\N	DOCS´ÇªQUICK´ÇªENU´Çªqi_enu.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªENU´Çªqi_enu.htm	13196	application/octet-stream	1	2026-04-19 18:22:43.250372
1359	\N	DOCS´ÇªQUICK´Çªcht.gif	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªcht.gif	279	image/gif	1	2026-04-19 18:22:43.669993
1288	\N	DOCS´ÇªQUICK´ÇªENU´Çªwarranty.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªENU´Çªwarranty.htm	8529	application/octet-stream	1	2026-04-19 18:22:43.268112
1369	\N	DOCS´ÇªQUICK´Çªita.png	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªita.png	583	image/png	1	2026-04-19 18:22:43.730641
1390	\N	PRO1000´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	357856	application/octet-stream	1	2026-04-19 18:22:43.881478
1413	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1r65x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1r65x64.din	3112	application/octet-stream	1	2026-04-19 18:22:44.081928
1423	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	139464	application/octet-stream	1	2026-04-19 18:22:44.181678
1430	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1q65x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1q65x64.inf	50864	application/octet-stream	1	2026-04-19 18:22:44.248023
1439	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1d.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1d.inf	475278	application/octet-stream	1	2026-04-19 18:22:44.315282
1447	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1r68x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1r68x64.din	3096	application/octet-stream	1	2026-04-19 18:22:44.393703
1448	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1r68x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1r68x64.inf	237029	application/octet-stream	1	2026-04-19 18:22:44.416138
1468	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1d.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1d.sys	615512	application/octet-stream	1	2026-04-19 18:22:44.664219
1478	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1dnmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1dnmsg.dll	86144	application/octet-stream	1	2026-04-19 18:22:44.772187
1480	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1r.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1r.cat	19576	application/octet-stream	1	2026-04-19 18:22:44.79528
1272	\N	DOCS´ÇªQUICK´ÇªDEU´Çªqi_deu.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªDEU´Çªqi_deu.htm	14304	application/octet-stream	1	2026-04-19 18:22:43.187234
1298	\N	DOCS´ÇªQUICK´ÇªESN´Çªstyle.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªESN´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:43.32005
1300	\N	DOCS´ÇªQUICK´ÇªESN´Çªwarranty.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªESN´Çªwarranty.htm	9922	application/octet-stream	1	2026-04-19 18:22:43.339337
1294	\N	DOCS´ÇªQUICK´ÇªESN´Çªnote.gif	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªESN´Çªnote.gif	1008	image/gif	1	2026-04-19 18:22:43.293484
1393	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1c65x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1c65x64.cat	12513	application/octet-stream	1	2026-04-19 18:22:43.89642
1410	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1dmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1dmsg.dll	89464	application/octet-stream	1	2026-04-19 18:22:44.053488
1309	\N	DOCS´ÇªQUICK´ÇªFRA´Çªstyle.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªFRA´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:43.383123
1311	\N	DOCS´ÇªQUICK´ÇªFRA´Çªwarranty.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªFRA´Çªwarranty.htm	9836	application/octet-stream	1	2026-04-19 18:22:43.39081
1338	\N	DOCS´ÇªQUICK´ÇªKOR´Çªlicense.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªKOR´Çªlicense.htm	9455	application/octet-stream	1	2026-04-19 18:22:43.525471
1360	\N	DOCS´ÇªQUICK´Çªcht.gif	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªcht.gif	279	image/gif	1	2026-04-19 18:22:43.675068
1336	\N	DOCS´ÇªQUICK´ÇªKOR´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªKOR´Çªlegaldis.htm	907	application/octet-stream	1	2026-04-19 18:22:43.515565
1339	\N	DOCS´ÇªQUICK´ÇªKOR´Çªnote.gif	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªKOR´Çªnote.gif	1008	image/gif	1	2026-04-19 18:22:43.536546
1341	\N	DOCS´ÇªQUICK´ÇªKOR´Çªqi_kor.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªKOR´Çªqi_kor.htm	14164	application/octet-stream	1	2026-04-19 18:22:43.547405
1349	\N	DOCS´ÇªQUICK´ÇªPTB´Çªlicense.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªPTB´Çªlicense.htm	11764	application/octet-stream	1	2026-04-19 18:22:43.602294
1407	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1d65x64.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1d65x64.inf	221832	application/octet-stream	1	2026-04-19 18:22:44.020163
1324	\N	DOCS´ÇªQUICK´ÇªJPN´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªJPN´Çªlegaldis.htm	1030	application/octet-stream	1	2026-04-19 18:22:43.452998
1331	\N	DOCS´ÇªQUICK´ÇªJPN´Çªqi_jpn.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªJPN´Çªqi_jpn.htm	17150	application/octet-stream	1	2026-04-19 18:22:43.480188
1344	\N	DOCS´ÇªQUICK´ÇªKOR´Çªstyle.css	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªKOR´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:43.568947
1355	\N	DOCS´ÇªQUICK´ÇªPTB´Çªwarranty.htm	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªPTB´Çªwarranty.htm	9427	application/octet-stream	1	2026-04-19 18:22:43.643218
1383	\N	PRO1000´ÇªWinx64´ÇªNDIS65´ÇªNicInE1R.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´ÇªNicInE1R.dll	100552	application/octet-stream	1	2026-04-19 18:22:43.815146
1389	\N	PRO1000´ÇªWinx64´ÇªNDIS65´ÇªNicInstD.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´ÇªNicInstD.dll	99704	application/octet-stream	1	2026-04-19 18:22:43.859769
1343	\N	DOCS´ÇªQUICK´ÇªKOR´Çªstyle.css	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªKOR´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:43.559032
1313	\N	DOCS´ÇªQUICK´ÇªITA´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªITA´Çªlegaldis.htm	953	application/octet-stream	1	2026-04-19 18:22:43.400444
1356	\N	DOCS´ÇªQUICK´ÇªPTB´Çªwarranty.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªPTB´Çªwarranty.htm	9427	application/octet-stream	1	2026-04-19 18:22:43.652115
1363	\N	DOCS´ÇªQUICK´Çªenu.png	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªenu.png	560	image/png	1	2026-04-19 18:22:43.697664
1325	\N	DOCS´ÇªQUICK´ÇªJPN´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªJPN´Çªlegaldis.htm	1030	application/octet-stream	1	2026-04-19 18:22:43.453113
1326	\N	DOCS´ÇªQUICK´ÇªJPN´Çªlicense.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªJPN´Çªlicense.htm	10388	application/octet-stream	1	2026-04-19 18:22:43.460423
1330	\N	DOCS´ÇªQUICK´ÇªJPN´Çªqi_jpn.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªJPN´Çªqi_jpn.htm	17150	application/octet-stream	1	2026-04-19 18:22:43.476606
1346	\N	DOCS´ÇªQUICK´ÇªPTB´Çªlegaldis.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªPTB´Çªlegaldis.htm	935	application/octet-stream	1	2026-04-19 18:22:43.583178
1486	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1rmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1rmsg.dll	121944	application/octet-stream	1	2026-04-19 18:22:44.861589
1489	\N	PRO1000´ÇªWinx64´ÇªWS2022´Çªe1d.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2022´Çªe1d.cat	23324	application/octet-stream	1	2026-04-19 18:22:44.906853
1495	\N	PRO1000´ÇªWinx64´ÇªWS2022´Çªe1dmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2022´Çªe1dmsg.dll	33920	application/octet-stream	1	2026-04-19 18:22:44.9722
1505	\N	PRO1000´ÇªWinx64´ÇªWS2022´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2022´Çªreadme.txt	458	text/plain	1	2026-04-19 18:22:45.212024
1351	\N	DOCS´ÇªQUICK´ÇªPTB´Çªqi_ptb.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªPTB´Çªqi_ptb.htm	13291	application/octet-stream	1	2026-04-19 18:22:43.620616
1370	\N	DOCS´ÇªQUICK´Çªita.png	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªita.png	583	image/png	1	2026-04-19 18:22:43.735659
1373	\N	DOCS´ÇªQUICK´Çªkor.gif	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªkor.gif	217	image/gif	1	2026-04-19 18:22:43.758565
1506	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1d.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1d.cat	20450	application/octet-stream	1	2026-04-19 18:22:45.220329
1511	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1d.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1d.sys	615512	application/octet-stream	1	2026-04-19 18:22:45.23719
1388	\N	PRO1000´ÇªWinx64´ÇªNDIS65´ÇªNicInstD.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´ÇªNicInstD.dll	99704	application/octet-stream	1	2026-04-19 18:22:43.859314
1391	\N	PRO1000´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	357856	application/octet-stream	1	2026-04-19 18:22:43.882968
1392	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1c65x64.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1c65x64.cat	12513	application/octet-stream	1	2026-04-19 18:22:43.895328
1412	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1r65x64.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1r65x64.din	3112	application/octet-stream	1	2026-04-19 18:22:44.081359
1416	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1r65x64.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1r65x64.sys	601288	application/octet-stream	1	2026-04-19 18:22:44.117469
1514	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dn.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dn.cat	15309	application/octet-stream	1	2026-04-19 18:22:45.256781
1372	\N	DOCS´ÇªQUICK´Çªjpn.gif	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªjpn.gif	242	image/gif	1	2026-04-19 18:22:43.747621
1387	\N	PRO1000´ÇªWinx64´ÇªNDIS65´ÇªNicInstC.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´ÇªNicInstC.dll	91088	application/octet-stream	1	2026-04-19 18:22:43.838483
1433	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1q65x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1q65x64.sys	125808	application/octet-stream	1	2026-04-19 18:22:44.262516
1455	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªv1q68x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªv1q68x64.cat	11105	application/octet-stream	1	2026-04-19 18:22:44.516021
1483	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1r.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1r.sys	609880	application/octet-stream	1	2026-04-19 18:22:44.839491
1384	\N	PRO1000´ÇªWinx64´ÇªNDIS65´ÇªNicInE1R.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´ÇªNicInE1R.dll	100552	application/octet-stream	1	2026-04-19 18:22:43.816488
1362	\N	DOCS´ÇªQUICK´Çªdeu.png	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªdeu.png	640	image/png	1	2026-04-19 18:22:43.686833
1365	\N	DOCS´ÇªQUICK´Çªesn.png	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªesn.png	651	image/png	1	2026-04-19 18:22:43.709041
1394	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1c65x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1c65x64.din	3113	application/octet-stream	1	2026-04-19 18:22:43.914423
1422	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	139464	application/octet-stream	1	2026-04-19 18:22:44.181302
1354	\N	DOCS´ÇªQUICK´ÇªPTB´Çªstyle.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´ÇªPTB´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:43.635644
1357	\N	DOCS´ÇªQUICK´Çªchs.gif	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªchs.gif	263	image/gif	1	2026-04-19 18:22:43.65784
1367	\N	DOCS´ÇªQUICK´Çªfra.png	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªfra.png	621	image/png	1	2026-04-19 18:22:43.721834
1397	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1c65x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1c65x64.inf	91655	application/octet-stream	1	2026-04-19 18:22:43.928694
1380	\N	DOCS´ÇªQUICK´Çªstyle.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªstyle.css	2649	application/octet-stream	1	2026-04-19 18:22:43.792505
1382	\N	PRO1000´ÇªWinx64´Çª	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´Çª	0	application/octet-stream	1	2026-04-19 18:22:43.804003
1399	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1c65x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1c65x64.sys	472016	application/octet-stream	1	2026-04-19 18:22:43.94819
1411	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1r65x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1r65x64.cat	21349	application/octet-stream	1	2026-04-19 18:22:44.062292
1425	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	692	text/plain	1	2026-04-19 18:22:44.195626
1361	\N	DOCS´ÇªQUICK´Çªdeu.png	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªdeu.png	640	image/png	1	2026-04-19 18:22:43.685602
1364	\N	DOCS´ÇªQUICK´Çªenu.png	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªenu.png	560	image/png	1	2026-04-19 18:22:43.697766
1366	\N	DOCS´ÇªQUICK´Çªesn.png	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªesn.png	651	image/png	1	2026-04-19 18:22:43.709273
1371	\N	DOCS´ÇªQUICK´Çªjpn.gif	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªjpn.gif	242	image/gif	1	2026-04-19 18:22:43.746748
1401	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1cmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1cmsg.dll	80848	application/octet-stream	1	2026-04-19 18:22:43.962221
1408	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1d65x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1d65x64.sys	593776	application/octet-stream	1	2026-04-19 18:22:44.028912
1377	\N	DOCS´ÇªQUICK´Çªquick.htm	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªquick.htm	3201	application/octet-stream	1	2026-04-19 18:22:43.781402
1386	\N	PRO1000´ÇªWinx64´ÇªNDIS65´ÇªNicInVQ.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´ÇªNicInVQ.dll	89976	application/octet-stream	1	2026-04-19 18:22:43.829924
1395	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1c65x64.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1c65x64.din	3113	application/octet-stream	1	2026-04-19 18:22:43.915005
1404	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1d65x64.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1d65x64.din	3130	application/octet-stream	1	2026-04-19 18:22:43.995745
1409	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1dmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1dmsg.dll	89464	application/octet-stream	1	2026-04-19 18:22:44.049029
1438	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1d.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1d.inf	475278	application/octet-stream	1	2026-04-19 18:22:44.314536
1436	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1d.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1d.cat	23324	application/octet-stream	1	2026-04-19 18:22:44.296113
1440	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1d.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1d.sys	615560	application/octet-stream	1	2026-04-19 18:22:44.330624
1442	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1dmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1dmsg.dll	33920	application/octet-stream	1	2026-04-19 18:22:44.349674
1402	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1d65x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1d65x64.cat	18925	application/octet-stream	1	2026-04-19 18:22:43.982471
1414	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1r65x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1r65x64.inf	193158	application/octet-stream	1	2026-04-19 18:22:44.095307
1479	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1r.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1r.cat	19576	application/octet-stream	1	2026-04-19 18:22:44.794116
1458	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªv1q68x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªv1q68x64.inf	50158	application/octet-stream	1	2026-04-19 18:22:44.54944
1490	\N	PRO1000´ÇªWinx64´ÇªWS2022´Çªe1d.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2022´Çªe1d.cat	23324	application/octet-stream	1	2026-04-19 18:22:44.916041
1461	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªv1qmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªv1qmsg.dll	82096	application/octet-stream	1	2026-04-19 18:22:44.593965
1470	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1dmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1dmsg.dll	33888	application/octet-stream	1	2026-04-19 18:22:44.682602
1474	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1dn.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1dn.inf	93199	application/octet-stream	1	2026-04-19 18:22:44.728413
1476	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1dn.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1dn.sys	1744000	application/octet-stream	1	2026-04-19 18:22:44.749681
1396	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1c65x64.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1c65x64.inf	91655	application/octet-stream	1	2026-04-19 18:22:43.928414
1398	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1c65x64.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1c65x64.sys	472016	application/octet-stream	1	2026-04-19 18:22:43.947908
1400	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1cmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1cmsg.dll	80848	application/octet-stream	1	2026-04-19 18:22:43.96203
1376	\N	DOCS´ÇªQUICK´Çªptb.png	/app/uploads/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªptb.png	763	image/png	1	2026-04-19 18:22:43.770341
1420	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªnicco4.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªnicco4.dll	134344	application/octet-stream	1	2026-04-19 18:22:44.161518
1428	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1q65x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1q65x64.din	2758	application/octet-stream	1	2026-04-19 18:22:44.228963
1375	\N	DOCS´ÇªQUICK´Çªptb.png	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/DOCS´ÇªQUICK´Çªptb.png	763	image/png	1	2026-04-19 18:22:43.770147
1558	\N	PRO2500´ÇªWinx64´ÇªWS2022´Çªe2f.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªWS2022´Çªe2f.sys	537680	application/octet-stream	1	2026-04-19 18:22:45.476919
1560	\N	PRO2500´ÇªWinx64´ÇªWS2022´Çªe2fmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªWS2022´Çªe2fmsg.dll	255080	application/octet-stream	1	2026-04-19 18:22:45.494142
1643	\N	PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40eb.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40eb.sys	1488008	application/octet-stream	1	2026-04-19 18:22:46.26323
1403	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1d65x64.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1d65x64.cat	18925	application/octet-stream	1	2026-04-19 18:22:43.982544
1446	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1r68x64.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1r68x64.din	3096	application/octet-stream	1	2026-04-19 18:22:44.393556
1494	\N	PRO1000´ÇªWinx64´ÇªWS2022´Çªe1dmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2022´Çªe1dmsg.dll	33920	application/octet-stream	1	2026-04-19 18:22:44.97203
1427	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1q65x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1q65x64.cat	11957	application/octet-stream	1	2026-04-19 18:22:44.215363
1451	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1rmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1rmsg.dll	121952	application/octet-stream	1	2026-04-19 18:22:44.46059
1512	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dmsg.dll	33888	application/octet-stream	1	2026-04-19 18:22:45.245819
1519	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dn.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dn.sys	1744000	application/octet-stream	1	2026-04-19 18:22:45.276121
1540	\N	PRO2500´ÇªWinx64´ÇªNDIS68´Çªe2fmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªNDIS68´Çªe2fmsg.dll	255080	application/octet-stream	1	2026-04-19 18:22:45.3782
1550	\N	PRO2500´ÇªWinx64´ÇªW11´Çªe2fnmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªW11´Çªe2fnmsg.dll	86104	application/octet-stream	1	2026-04-19 18:22:45.432555
1557	\N	PRO2500´ÇªWinx64´ÇªWS2022´Çªe2f.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªWS2022´Çªe2f.inf	167854	application/octet-stream	1	2026-04-19 18:22:45.466208
1429	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1q65x64.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1q65x64.din	2758	application/octet-stream	1	2026-04-19 18:22:44.229405
1431	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1q65x64.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1q65x64.inf	50864	application/octet-stream	1	2026-04-19 18:22:44.248808
1469	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1dmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1dmsg.dll	33888	application/octet-stream	1	2026-04-19 18:22:44.682521
1435	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1qmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1qmsg.dll	82096	application/octet-stream	1	2026-04-19 18:22:44.282187
1465	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1d.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1d.inf	383290	application/octet-stream	1	2026-04-19 18:22:44.638167
1507	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1d.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1d.cat	20450	application/octet-stream	1	2026-04-19 18:22:45.220554
1492	\N	PRO1000´ÇªWinx64´ÇªWS2022´Çªe1d.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2022´Çªe1d.sys	615560	application/octet-stream	1	2026-04-19 18:22:44.949519
1499	\N	PRO1000´ÇªWinx64´ÇªWS2022´Çªe1r.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2022´Çªe1r.inf	192021	application/octet-stream	1	2026-04-19 18:22:45.016114
1502	\N	PRO1000´ÇªWinx64´ÇªWS2022´Çªe1rmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2022´Çªe1rmsg.dll	121952	application/octet-stream	1	2026-04-19 18:22:45.194034
1517	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dn.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dn.inf	93199	application/octet-stream	1	2026-04-19 18:22:45.266229
1529	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1rmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1rmsg.dll	121936	application/octet-stream	1	2026-04-19 18:22:45.322119
1552	\N	PRO2500´ÇªWinx64´ÇªW11´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªW11´Çªreadme.txt	669	text/plain	1	2026-04-19 18:22:45.443506
1565	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´ÇªNicIn40B.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´ÇªNicIn40B.dll	101584	application/octet-stream	1	2026-04-19 18:22:45.531622
1573	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ea65.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ea65.din	3064	application/octet-stream	1	2026-04-19 18:22:45.580251
1590	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ebmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ebmsg.dll	360656	application/octet-stream	1	2026-04-19 18:22:45.674621
1597	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40ea68.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40ea68.din	2967	application/octet-stream	1	2026-04-19 18:22:45.732819
1542	\N	PRO2500´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	696	text/plain	1	2026-04-19 18:22:45.390122
1419	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1rmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1rmsg.dll	120520	application/octet-stream	1	2026-04-19 18:22:44.148091
1421	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªnicco4.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªnicco4.dll	134344	application/octet-stream	1	2026-04-19 18:22:44.161896
1548	\N	PRO2500´ÇªWinx64´ÇªW11´Çªe2fn.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªW11´Çªe2fn.sys	1471576	application/octet-stream	1	2026-04-19 18:22:45.422407
1426	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1q65x64.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1q65x64.cat	11957	application/octet-stream	1	2026-04-19 18:22:44.214923
1432	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1q65x64.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1q65x64.sys	125808	application/octet-stream	1	2026-04-19 18:22:44.261932
1434	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1qmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªv1qmsg.dll	82096	application/octet-stream	1	2026-04-19 18:22:44.282005
1611	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40ebmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40ebmsg.dll	367744	application/octet-stream	1	2026-04-19 18:22:45.883972
1484	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1r.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1r.sys	609880	application/octet-stream	1	2026-04-19 18:22:44.840112
1454	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªv1q68x64.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªv1q68x64.cat	11105	application/octet-stream	1	2026-04-19 18:22:44.505968
1513	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dmsg.dll	33888	application/octet-stream	1	2026-04-19 18:22:45.246152
1459	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªv1q68x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªv1q68x64.sys	125808	application/octet-stream	1	2026-04-19 18:22:44.576594
1482	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1r.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1r.inf	177837	application/octet-stream	1	2026-04-19 18:22:44.816491
1487	\N	PRO1000´ÇªWinx64´ÇªW11´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªreadme.txt	702	text/plain	1	2026-04-19 18:22:44.882935
1501	\N	PRO1000´ÇªWinx64´ÇªWS2022´Çªe1r.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2022´Çªe1r.sys	608352	application/octet-stream	1	2026-04-19 18:22:45.045163
1525	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1r.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1r.inf	192021	application/octet-stream	1	2026-04-19 18:22:45.303982
1527	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1r.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1r.sys	610384	application/octet-stream	1	2026-04-19 18:22:45.313291
1415	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1r65x64.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªe1r65x64.inf	193158	application/octet-stream	1	2026-04-19 18:22:44.103491
1424	\N	PRO1000´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	692	text/plain	1	2026-04-19 18:22:44.195054
1445	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1r68x64.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1r68x64.cat	20815	application/octet-stream	1	2026-04-19 18:22:44.371972
1449	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1r68x64.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1r68x64.inf	237029	application/octet-stream	1	2026-04-19 18:22:44.427088
1452	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1rmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1rmsg.dll	121952	application/octet-stream	1	2026-04-19 18:22:44.47169
1460	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªv1q68x64.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªv1q68x64.sys	125808	application/octet-stream	1	2026-04-19 18:22:44.57794
1473	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1dn.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1dn.inf	93199	application/octet-stream	1	2026-04-19 18:22:44.72814
1488	\N	PRO1000´ÇªWinx64´ÇªW11´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªreadme.txt	702	text/plain	1	2026-04-19 18:22:44.883393
1456	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªv1q68x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªv1q68x64.din	2742	application/octet-stream	1	2026-04-19 18:22:44.528045
1493	\N	PRO1000´ÇªWinx64´ÇªWS2022´Çªe1d.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2022´Çªe1d.sys	615560	application/octet-stream	1	2026-04-19 18:22:44.950432
1498	\N	PRO1000´ÇªWinx64´ÇªWS2022´Çªe1r.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2022´Çªe1r.inf	192021	application/octet-stream	1	2026-04-19 18:22:45.016003
1516	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dn.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dn.inf	93199	application/octet-stream	1	2026-04-19 18:22:45.265958
1559	\N	PRO2500´ÇªWinx64´ÇªWS2022´Çªe2f.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªWS2022´Çªe2f.sys	537680	application/octet-stream	1	2026-04-19 18:22:45.47724
1561	\N	PRO2500´ÇªWinx64´ÇªWS2022´Çªe2fmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªWS2022´Çªe2fmsg.dll	255080	application/octet-stream	1	2026-04-19 18:22:45.494556
1463	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1d.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1d.cat	20450	application/octet-stream	1	2026-04-19 18:22:44.616392
1508	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1d.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1d.inf	383290	application/octet-stream	1	2026-04-19 18:22:45.228817
1598	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40ea68.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40ea68.din	2967	application/octet-stream	1	2026-04-19 18:22:45.739697
1520	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dnmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dnmsg.dll	86144	application/octet-stream	1	2026-04-19 18:22:45.282381
1562	\N	PRO2500´ÇªWinx64´ÇªWS2022´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªWS2022´Çªreadme.txt	462	text/plain	1	2026-04-19 18:22:45.50581
1592	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	139472	application/octet-stream	1	2026-04-19 18:22:45.691202
1594	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	548	text/plain	1	2026-04-19 18:22:45.705842
1596	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40ea68.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40ea68.cat	27016	application/octet-stream	1	2026-04-19 18:22:45.725333
1603	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40eamsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40eamsg.dll	367752	application/octet-stream	1	2026-04-19 18:22:45.791186
1457	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªv1q68x64.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªv1q68x64.inf	50158	application/octet-stream	1	2026-04-19 18:22:44.549328
1466	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1d.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1d.inf	383290	application/octet-stream	1	2026-04-19 18:22:44.638302
1467	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1d.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1d.sys	615512	application/octet-stream	1	2026-04-19 18:22:44.660891
1475	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1dn.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1dn.sys	1744000	application/octet-stream	1	2026-04-19 18:22:44.749419
1477	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1dnmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1dnmsg.dll	86144	application/octet-stream	1	2026-04-19 18:22:44.77198
1481	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1r.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1r.inf	177837	application/octet-stream	1	2026-04-19 18:22:44.816337
1450	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1r68x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªe1r68x64.sys	608352	application/octet-stream	1	2026-04-19 18:22:44.439543
1453	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	692	text/plain	1	2026-04-19 18:22:44.483493
1471	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1dn.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1dn.cat	15309	application/octet-stream	1	2026-04-19 18:22:44.704974
1462	\N	PRO1000´ÇªWinx64´ÇªNDIS68´Çªv1qmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªNDIS68´Çªv1qmsg.dll	82096	application/octet-stream	1	2026-04-19 18:22:44.594227
1515	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dn.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dn.cat	15309	application/octet-stream	1	2026-04-19 18:22:45.256915
1500	\N	PRO1000´ÇªWinx64´ÇªWS2022´Çªe1r.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2022´Çªe1r.sys	608352	application/octet-stream	1	2026-04-19 18:22:45.045064
1496	\N	PRO1000´ÇªWinx64´ÇªWS2022´Çªe1r.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2022´Çªe1r.cat	20099	application/octet-stream	1	2026-04-19 18:22:44.993786
1526	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1r.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1r.sys	610384	application/octet-stream	1	2026-04-19 18:22:45.312923
1528	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1rmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1rmsg.dll	121936	application/octet-stream	1	2026-04-19 18:22:45.321659
1547	\N	PRO2500´ÇªWinx64´ÇªW11´Çªe2fn.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªW11´Çªe2fn.inf	102405	application/octet-stream	1	2026-04-19 18:22:45.410563
1464	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1d.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1d.cat	20450	application/octet-stream	1	2026-04-19 18:22:44.616804
1472	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1dn.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1dn.cat	15309	application/octet-stream	1	2026-04-19 18:22:44.705105
1497	\N	PRO1000´ÇªWinx64´ÇªWS2022´Çªe1r.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2022´Çªe1r.cat	20099	application/octet-stream	1	2026-04-19 18:22:44.993939
1485	\N	PRO1000´ÇªWinx64´ÇªW11´Çªe1rmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªW11´Çªe1rmsg.dll	121944	application/octet-stream	1	2026-04-19 18:22:44.861185
1503	\N	PRO1000´ÇªWinx64´ÇªWS2022´Çªe1rmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2022´Çªe1rmsg.dll	121952	application/octet-stream	1	2026-04-19 18:22:45.194598
1504	\N	PRO1000´ÇªWinx64´ÇªWS2022´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2022´Çªreadme.txt	458	text/plain	1	2026-04-19 18:22:45.21183
1509	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1d.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1d.inf	383290	application/octet-stream	1	2026-04-19 18:22:45.229253
1510	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1d.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1d.sys	615512	application/octet-stream	1	2026-04-19 18:22:45.237004
1599	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40ea68.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40ea68.inf	264878	application/octet-stream	1	2026-04-19 18:22:45.749379
1521	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dnmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dnmsg.dll	86144	application/octet-stream	1	2026-04-19 18:22:45.283051
1601	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40ea68.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40ea68.sys	886400	application/octet-stream	1	2026-04-19 18:22:45.765707
1541	\N	PRO2500´ÇªWinx64´ÇªNDIS68´Çªe2fmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªNDIS68´Çªe2fmsg.dll	255080	application/octet-stream	1	2026-04-19 18:22:45.382613
1556	\N	PRO2500´ÇªWinx64´ÇªWS2022´Çªe2f.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªWS2022´Çªe2f.inf	167854	application/octet-stream	1	2026-04-19 18:22:45.46585
1574	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ea65.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ea65.din	3064	application/octet-stream	1	2026-04-19 18:22:45.581211
1604	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40eb68.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40eb68.cat	15454	application/octet-stream	1	2026-04-19 18:22:45.799024
1595	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40ea68.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40ea68.cat	27016	application/octet-stream	1	2026-04-19 18:22:45.715526
1491	\N	PRO1000´ÇªWinx64´ÇªWS2022´Çªe1d.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2022´Çªe1d.inf	475278	application/octet-stream	1	2026-04-19 18:22:44.92677
1522	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1r.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1r.cat	20057	application/octet-stream	1	2026-04-19 18:22:45.292836
1532	\N	PRO2500´ÇªWinx64´Çª	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´Çª	0	application/octet-stream	1	2026-04-19 18:22:45.339624
1554	\N	PRO2500´ÇªWinx64´ÇªWS2022´Çªe2f.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªWS2022´Çªe2f.cat	13833	application/octet-stream	1	2026-04-19 18:22:45.454717
1619	\N	PRO40GB´ÇªWinx64´ÇªW11´Çªi40ea.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªW11´Çªi40ea.sys	886400	application/octet-stream	1	2026-04-19 18:22:45.982593
1634	\N	PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40ea.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40ea.inf	246525	application/octet-stream	1	2026-04-19 18:22:46.151376
1651	\N	PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40ea.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40ea.inf	246525	application/octet-stream	1	2026-04-19 18:22:46.353635
1569	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	357856	application/octet-stream	1	2026-04-19 18:22:45.558143
1585	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eb65.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eb65.inf	134499	application/octet-stream	1	2026-04-19 18:22:45.652234
1669	\N	PROAVF´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	357856	application/octet-stream	1	2026-04-19 18:22:46.602284
1537	\N	PRO2500´ÇªWinx64´ÇªNDIS68´Çªe2f.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªNDIS68´Çªe2f.inf	167854	application/octet-stream	1	2026-04-19 18:22:45.364609
1518	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dn.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1dn.sys	1744000	application/octet-stream	1	2026-04-19 18:22:45.275996
1543	\N	PRO2500´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	696	text/plain	1	2026-04-19 18:22:45.391719
1549	\N	PRO2500´ÇªWinx64´ÇªW11´Çªe2fn.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªW11´Çªe2fn.sys	1471576	application/octet-stream	1	2026-04-19 18:22:45.42271
1551	\N	PRO2500´ÇªWinx64´ÇªW11´Çªe2fnmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªW11´Çªe2fnmsg.dll	86104	application/octet-stream	1	2026-04-19 18:22:45.432928
1553	\N	PRO2500´ÇªWinx64´ÇªW11´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªW11´Çªreadme.txt	669	text/plain	1	2026-04-19 18:22:45.444467
1539	\N	PRO2500´ÇªWinx64´ÇªNDIS68´Çªe2f.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªNDIS68´Çªe2f.sys	537680	application/octet-stream	1	2026-04-19 18:22:45.373849
1570	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	357856	application/octet-stream	1	2026-04-19 18:22:45.558632
1681	\N	PROAVF´ÇªWinx64´ÇªNDIS65´Çªnicinavf.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS65´Çªnicinavf.dll	161376	application/octet-stream	1	2026-04-19 18:22:46.661536
1711	\N	PROAVF´ÇªWinx64´ÇªWS2025´Çªiavf.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2025´Çªiavf.inf	64677	application/octet-stream	1	2026-04-19 18:22:46.820161
1733	\N	PROCGB´ÇªWinx64´ÇªNDIS65´Çªiceamsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS65´Çªiceamsg.dll	355496	application/octet-stream	1	2026-04-19 18:22:46.958727
1737	\N	PROCGB´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	138664	application/octet-stream	1	2026-04-19 18:22:46.981834
1618	\N	PRO40GB´ÇªWinx64´ÇªW11´Çªi40ea.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªW11´Çªi40ea.sys	886400	application/octet-stream	1	2026-04-19 18:22:45.974451
1575	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ea65.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ea65.inf	238086	application/octet-stream	1	2026-04-19 18:22:45.591365
1578	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ea65.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ea65.sys	792784	application/octet-stream	1	2026-04-19 18:22:45.602897
1583	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eb65.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eb65.din	3064	application/octet-stream	1	2026-04-19 18:22:45.641062
1608	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40eb68.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40eb68.inf	143308	application/octet-stream	1	2026-04-19 18:22:45.848291
1624	\N	PRO40GB´ÇªWinx64´ÇªW11´Çªi40eb.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªW11´Çªi40eb.inf	121770	application/octet-stream	1	2026-04-19 18:22:46.040345
1629	\N	PRO40GB´ÇªWinx64´ÇªW11´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªW11´Çªreadme.txt	810	text/plain	1	2026-04-19 18:22:46.10649
1642	\N	PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40eb.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40eb.inf	141016	application/octet-stream	1	2026-04-19 18:22:46.24135
1649	\N	PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40ea.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40ea.cat	26377	application/octet-stream	1	2026-04-19 18:22:46.329852
1563	\N	PRO2500´ÇªWinx64´ÇªWS2022´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªWS2022´Çªreadme.txt	462	text/plain	1	2026-04-19 18:22:45.513228
1577	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ea65.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ea65.sys	792784	application/octet-stream	1	2026-04-19 18:22:45.602138
1586	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eb65.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eb65.inf	134499	application/octet-stream	1	2026-04-19 18:22:45.652975
1605	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40eb68.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40eb68.cat	15454	application/octet-stream	1	2026-04-19 18:22:45.81506
1607	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40eb68.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40eb68.inf	143308	application/octet-stream	1	2026-04-19 18:22:45.83936
1535	\N	PRO2500´ÇªWinx64´ÇªNDIS68´Çªe2f.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªNDIS68´Çªe2f.cat	13833	application/octet-stream	1	2026-04-19 18:22:45.352719
1545	\N	PRO2500´ÇªWinx64´ÇªW11´Çªe2fn.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªW11´Çªe2fn.cat	13824	application/octet-stream	1	2026-04-19 18:22:45.399501
1582	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eb65.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eb65.cat	16220	application/octet-stream	1	2026-04-19 18:22:45.631081
1609	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40eb68.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40eb68.sys	1488000	application/octet-stream	1	2026-04-19 18:22:45.861632
1613	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	976	text/plain	1	2026-04-19 18:22:45.906111
1615	\N	PRO40GB´ÇªWinx64´ÇªW11´Çªi40ea.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªW11´Çªi40ea.cat	26608	application/octet-stream	1	2026-04-19 18:22:45.928069
1620	\N	PRO40GB´ÇªWinx64´ÇªW11´Çªi40eamsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªW11´Çªi40eamsg.dll	367752	application/octet-stream	1	2026-04-19 18:22:45.994495
1631	\N	PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40ea.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40ea.cat	26374	application/octet-stream	1	2026-04-19 18:22:46.128274
1638	\N	PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40eamsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40eamsg.dll	367744	application/octet-stream	1	2026-04-19 18:22:46.204024
1524	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1r.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1r.inf	192021	application/octet-stream	1	2026-04-19 18:22:45.30387
1533	\N	PRO2500´ÇªWinx64´Çª	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´Çª	0	application/octet-stream	1	2026-04-19 18:22:45.340048
1544	\N	PRO2500´ÇªWinx64´ÇªW11´Çªe2fn.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªW11´Çªe2fn.cat	13824	application/octet-stream	1	2026-04-19 18:22:45.399315
1555	\N	PRO2500´ÇªWinx64´ÇªWS2022´Çªe2f.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªWS2022´Çªe2f.cat	13833	application/octet-stream	1	2026-04-19 18:22:45.454866
1576	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ea65.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ea65.inf	238086	application/octet-stream	1	2026-04-19 18:22:45.592509
1589	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ebmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ebmsg.dll	360656	application/octet-stream	1	2026-04-19 18:22:45.674513
1531	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªreadme.txt	540	text/plain	1	2026-04-19 18:22:45.331702
1564	\N	PRO40GB´ÇªWinx64´Çª	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´Çª	0	application/octet-stream	1	2026-04-19 18:22:45.521334
1567	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´ÇªNicInI40.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´ÇªNicInI40.dll	101584	application/octet-stream	1	2026-04-19 18:22:45.542527
1580	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eamsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eamsg.dll	360144	application/octet-stream	1	2026-04-19 18:22:45.619483
1767	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªscea68.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªscea68.cat	13083	application/octet-stream	1	2026-04-19 18:22:47.205074
1593	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	548	text/plain	1	2026-04-19 18:22:45.699278
1523	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªe1r.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªe1r.cat	20057	application/octet-stream	1	2026-04-19 18:22:45.293028
1530	\N	PRO1000´ÇªWinx64´ÇªWS2025´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO1000´ÇªWinx64´ÇªWS2025´Çªreadme.txt	540	text/plain	1	2026-04-19 18:22:45.331192
1534	\N	PRO2500´ÇªWinx64´ÇªNDIS68´Çªe2f.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªNDIS68´Çªe2f.cat	13833	application/octet-stream	1	2026-04-19 18:22:45.352483
1536	\N	PRO2500´ÇªWinx64´ÇªNDIS68´Çªe2f.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªNDIS68´Çªe2f.inf	167854	application/octet-stream	1	2026-04-19 18:22:45.36176
1538	\N	PRO2500´ÇªWinx64´ÇªNDIS68´Çªe2f.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªNDIS68´Çªe2f.sys	537680	application/octet-stream	1	2026-04-19 18:22:45.369889
1546	\N	PRO2500´ÇªWinx64´ÇªW11´Çªe2fn.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO2500´ÇªWinx64´ÇªW11´Çªe2fn.inf	102405	application/octet-stream	1	2026-04-19 18:22:45.408555
1639	\N	PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40eb.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40eb.cat	14969	application/octet-stream	1	2026-04-19 18:22:46.218217
1633	\N	PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40ea.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40ea.inf	246525	application/octet-stream	1	2026-04-19 18:22:46.150354
1734	\N	PROCGB´ÇªWinx64´ÇªNDIS65´Çªmanifest_icea65.man	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS65´Çªmanifest_icea65.man	29661	application/octet-stream	1	2026-04-19 18:22:46.970487
1568	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´ÇªNicInI40.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´ÇªNicInI40.dll	101584	application/octet-stream	1	2026-04-19 18:22:45.543141
1579	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eamsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eamsg.dll	360144	application/octet-stream	1	2026-04-19 18:22:45.61938
1705	\N	PROAVF´ÇªWinx64´ÇªWS2022´Çªmanifest_iavf.man	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2022´Çªmanifest_iavf.man	29659	application/octet-stream	1	2026-04-19 18:22:46.788419
1674	\N	PROAVF´ÇªWinx64´ÇªNDIS65´Çªiavf65.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS65´Çªiavf65.inf	68370	application/octet-stream	1	2026-04-19 18:22:46.62847
1652	\N	PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40ea.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40ea.inf	246525	application/octet-stream	1	2026-04-19 18:22:46.36062
1768	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªscea68.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªscea68.din	2908	application/octet-stream	1	2026-04-19 18:22:47.224519
1621	\N	PRO40GB´ÇªWinx64´ÇªW11´Çªi40eamsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªW11´Çªi40eamsg.dll	367752	application/octet-stream	1	2026-04-19 18:22:46.004617
1707	\N	PROAVF´ÇªWinx64´ÇªWS2022´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2022´Çªreadme.txt	1146	text/plain	1	2026-04-19 18:22:46.797565
1588	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eb65.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eb65.sys	1395408	application/octet-stream	1	2026-04-19 18:22:45.662795
1700	\N	PROAVF´ÇªWinx64´ÇªWS2022´Çªiavf.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2022´Çªiavf.inf	64677	application/octet-stream	1	2026-04-19 18:22:46.756062
1740	\N	PROCGB´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	393	text/plain	1	2026-04-19 18:22:47.0032
1744	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªicea68.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªicea68.din	2912	application/octet-stream	1	2026-04-19 18:22:47.026251
1617	\N	PRO40GB´ÇªWinx64´ÇªW11´Çªi40ea.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªW11´Çªi40ea.inf	264860	application/octet-stream	1	2026-04-19 18:22:45.959331
1571	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ea65.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ea65.cat	27661	application/octet-stream	1	2026-04-19 18:22:45.568729
1724	\N	PROCGB´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	357856	application/octet-stream	1	2026-04-19 18:22:46.90366
1658	\N	PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40eb.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40eb.inf	141016	application/octet-stream	1	2026-04-19 18:22:46.440821
1704	\N	PROAVF´ÇªWinx64´ÇªWS2022´Çªiavfmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2022´Çªiavfmsg.dll	366728	application/octet-stream	1	2026-04-19 18:22:46.781324
1754	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªiceb68.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªiceb68.din	2993	application/octet-stream	1	2026-04-19 18:22:47.084231
1661	\N	PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40eb.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40eb.sys	1488000	application/octet-stream	1	2026-04-19 18:22:46.463077
1566	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´ÇªNicIn40B.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´ÇªNicIn40B.dll	101584	application/octet-stream	1	2026-04-19 18:22:45.532262
1572	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ea65.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40ea65.cat	27661	application/octet-stream	1	2026-04-19 18:22:45.569356
1581	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eb65.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eb65.cat	16220	application/octet-stream	1	2026-04-19 18:22:45.630691
1587	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eb65.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eb65.sys	1395408	application/octet-stream	1	2026-04-19 18:22:45.662694
1600	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40ea68.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40ea68.inf	264878	application/octet-stream	1	2026-04-19 18:22:45.764644
1602	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40eamsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40eamsg.dll	367752	application/octet-stream	1	2026-04-19 18:22:45.782447
1623	\N	PRO40GB´ÇªWinx64´ÇªW11´Çªi40eb.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªW11´Çªi40eb.inf	121770	application/octet-stream	1	2026-04-19 18:22:46.039779
1672	\N	PROAVF´ÇªWinx64´ÇªNDIS65´Çªiavf65.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS65´Çªiavf65.din	3057	application/octet-stream	1	2026-04-19 18:22:46.618932
1685	\N	PROAVF´ÇªWinx64´ÇªNDIS68´Çªiavf68.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS68´Çªiavf68.din	2960	application/octet-stream	1	2026-04-19 18:22:46.683881
1688	\N	PROAVF´ÇªWinx64´ÇªNDIS68´Çªiavf68.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS68´Çªiavf68.inf	68643	application/octet-stream	1	2026-04-19 18:22:46.697942
1690	\N	PROAVF´ÇªWinx64´ÇªNDIS68´Çªiavf68.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS68´Çªiavf68.sys	1248896	application/octet-stream	1	2026-04-19 18:22:46.707445
1710	\N	PROAVF´ÇªWinx64´ÇªWS2025´Çªiavf.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2025´Çªiavf.cat	12797	application/octet-stream	1	2026-04-19 18:22:46.813187
1715	\N	PROAVF´ÇªWinx64´ÇªWS2025´Çªiavfmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2025´Çªiavfmsg.dll	366720	application/octet-stream	1	2026-04-19 18:22:46.847625
1741	\N	PROCGB´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	393	text/plain	1	2026-04-19 18:22:47.004344
1628	\N	PRO40GB´ÇªWinx64´ÇªW11´Çªi40ebmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªW11´Çªi40ebmsg.dll	367752	application/octet-stream	1	2026-04-19 18:22:46.084776
1655	\N	PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40eamsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40eamsg.dll	367744	application/octet-stream	1	2026-04-19 18:22:46.396986
1656	\N	PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40eb.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40eb.cat	14966	application/octet-stream	1	2026-04-19 18:22:46.418545
1708	\N	PROAVF´ÇªWinx64´ÇªWS2022´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2022´Çªreadme.txt	1146	text/plain	1	2026-04-19 18:22:46.797743
1716	\N	PROAVF´ÇªWinx64´ÇªWS2025´Çªiavfmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2025´Çªiavfmsg.dll	366720	application/octet-stream	1	2026-04-19 18:22:46.847712
1591	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	139472	application/octet-stream	1	2026-04-19 18:22:45.684984
1606	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40eb68.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40eb68.din	2967	application/octet-stream	1	2026-04-19 18:22:45.817763
1627	\N	PRO40GB´ÇªWinx64´ÇªW11´Çªi40ebmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªW11´Çªi40ebmsg.dll	367752	application/octet-stream	1	2026-04-19 18:22:46.083916
1645	\N	PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40ebmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40ebmsg.dll	367744	application/octet-stream	1	2026-04-19 18:22:46.285642
1637	\N	PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40eamsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40eamsg.dll	367744	application/octet-stream	1	2026-04-19 18:22:46.203801
1647	\N	PRO40GB´ÇªWinx64´ÇªWS2022´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2022´Çªreadme.txt	603	text/plain	1	2026-04-19 18:22:46.308518
1698	\N	PROAVF´ÇªWinx64´ÇªWS2022´Çªiavf.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2022´Çªiavf.cat	12794	application/octet-stream	1	2026-04-19 18:22:46.746683
1735	\N	PROCGB´ÇªWinx64´ÇªNDIS65´Çªmanifest_icea65.man	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS65´Çªmanifest_icea65.man	29661	application/octet-stream	1	2026-04-19 18:22:46.970778
1719	\N	PROAVF´ÇªWinx64´ÇªWS2025´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2025´Çªreadme.txt	1091	text/plain	1	2026-04-19 18:22:46.874552
1725	\N	PROCGB´ÇªWinx64´ÇªNDIS65´Çªicea65.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS65´Çªicea65.cat	17039	application/octet-stream	1	2026-04-19 18:22:46.914055
1864	\N	PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInSXB.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInSXB.dll	101064	application/octet-stream	1	2026-04-19 18:22:48.413551
1610	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40eb68.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40eb68.sys	1488000	application/octet-stream	1	2026-04-19 18:22:45.871463
1614	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	976	text/plain	1	2026-04-19 18:22:45.927251
1616	\N	PRO40GB´ÇªWinx64´ÇªW11´Çªi40ea.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªW11´Çªi40ea.inf	264860	application/octet-stream	1	2026-04-19 18:22:45.95044
1683	\N	PROAVF´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	798	text/plain	1	2026-04-19 18:22:46.67292
1785	\N	PROCGB´ÇªWinx64´ÇªW11´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªW11´Çªreadme.txt	700	text/plain	1	2026-04-19 18:22:47.382513
1889	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixt65x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixt65x64.cat	13701	application/octet-stream	1	2026-04-19 18:22:48.703645
1644	\N	PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40eb.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40eb.sys	1488008	application/octet-stream	1	2026-04-19 18:22:46.263752
1654	\N	PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40eamsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40eamsg.dll	367744	application/octet-stream	1	2026-04-19 18:22:46.396522
1821	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªicea.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªicea.cat	16356	application/octet-stream	1	2026-04-19 18:22:47.817712
1659	\N	PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40eb.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40eb.inf	141016	application/octet-stream	1	2026-04-19 18:22:46.44093
1850	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªsceb.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªsceb.inf	130229	application/octet-stream	1	2026-04-19 18:22:48.274558
1720	\N	PROAVF´ÇªWinx64´ÇªWS2025´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2025´Çªreadme.txt	1091	text/plain	1	2026-04-19 18:22:46.875362
1752	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªiceb68.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªiceb68.cat	14223	application/octet-stream	1	2026-04-19 18:22:47.070255
1787	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªicea.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªicea.cat	16358	application/octet-stream	1	2026-04-19 18:22:47.399872
1868	\N	PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInVXS.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInVXS.dll	89544	application/octet-stream	1	2026-04-19 18:22:48.455225
1692	\N	PROAVF´ÇªWinx64´ÇªNDIS68´Çªiavfmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS68´Çªiavfmsg.dll	366720	application/octet-stream	1	2026-04-19 18:22:46.719045
1663	\N	PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40ebmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40ebmsg.dll	367744	application/octet-stream	1	2026-04-19 18:22:46.48583
1667	\N	PROAVF´ÇªWinx64´Çª	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´Çª	0	application/octet-stream	1	2026-04-19 18:22:46.591486
1721	\N	PROCGB´ÇªWinx64´Çª	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´Çª	0	application/octet-stream	1	2026-04-19 18:22:46.88653
1855	\N	PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInIXN.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInIXN.dll	100448	application/octet-stream	1	2026-04-19 18:22:48.3216
1876	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixn65x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixn65x64.sys	518752	application/octet-stream	1	2026-04-19 18:22:48.571544
1759	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªicebmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªicebmsg.dll	367696	application/octet-stream	1	2026-04-19 18:22:47.13276
1761	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªmanifest_icea68.man	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªmanifest_icea68.man	29661	application/octet-stream	1	2026-04-19 18:22:47.149603
1898	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixtmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixtmsg.dll	118648	application/octet-stream	1	2026-04-19 18:22:48.773591
1742	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªicea68.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªicea68.cat	16851	application/octet-stream	1	2026-04-19 18:22:47.015071
1714	\N	PROAVF´ÇªWinx64´ÇªWS2025´Çªiavf.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2025´Çªiavf.sys	1248896	application/octet-stream	1	2026-04-19 18:22:46.837468
1765	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	734	text/plain	1	2026-04-19 18:22:47.182105
1815	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªsceb.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªsceb.inf	130229	application/octet-stream	1	2026-04-19 18:22:47.684281
1888	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixsmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixsmsg.dll	120432	application/octet-stream	1	2026-04-19 18:22:48.684014
1717	\N	PROAVF´ÇªWinx64´ÇªWS2025´Çªmanifest_iavf.man	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2025´Çªmanifest_iavf.man	29659	application/octet-stream	1	2026-04-19 18:22:46.858424
1731	\N	PROCGB´ÇªWinx64´ÇªNDIS65´Çªicea65.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS65´Çªicea65.sys	2284136	application/octet-stream	1	2026-04-19 18:22:46.947654
1612	\N	PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40ebmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS68´Çªi40ebmsg.dll	367744	application/octet-stream	1	2026-04-19 18:22:45.893464
1630	\N	PRO40GB´ÇªWinx64´ÇªW11´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªW11´Çªreadme.txt	810	text/plain	1	2026-04-19 18:22:46.106791
1689	\N	PROAVF´ÇªWinx64´ÇªNDIS68´Çªiavf68.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS68´Çªiavf68.sys	1248896	application/octet-stream	1	2026-04-19 18:22:46.706377
1641	\N	PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40eb.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40eb.inf	141016	application/octet-stream	1	2026-04-19 18:22:46.24116
1646	\N	PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40ebmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40ebmsg.dll	367744	application/octet-stream	1	2026-04-19 18:22:46.286485
1650	\N	PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40ea.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40ea.cat	26377	application/octet-stream	1	2026-04-19 18:22:46.330259
1657	\N	PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40eb.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40eb.cat	14966	application/octet-stream	1	2026-04-19 18:22:46.418953
1691	\N	PROAVF´ÇªWinx64´ÇªNDIS68´Çªiavfmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS68´Çªiavfmsg.dll	366720	application/octet-stream	1	2026-04-19 18:22:46.715427
1712	\N	PROAVF´ÇªWinx64´ÇªWS2025´Çªiavf.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2025´Çªiavf.inf	64677	application/octet-stream	1	2026-04-19 18:22:46.825337
1745	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªicea68.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªicea68.din	2912	application/octet-stream	1	2026-04-19 18:22:47.031386
1726	\N	PROCGB´ÇªWinx64´ÇªNDIS65´Çªicea65.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS65´Çªicea65.cat	17039	application/octet-stream	1	2026-04-19 18:22:46.914163
1626	\N	PRO40GB´ÇªWinx64´ÇªW11´Çªi40eb.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªW11´Çªi40eb.sys	1488000	application/octet-stream	1	2026-04-19 18:22:46.063246
1679	\N	PROAVF´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	139360	application/octet-stream	1	2026-04-19 18:22:46.65418
1774	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªsceamsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªsceamsg.dll	367232	application/octet-stream	1	2026-04-19 18:22:47.282391
1625	\N	PRO40GB´ÇªWinx64´ÇªW11´Çªi40eb.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªW11´Çªi40eb.sys	1488000	application/octet-stream	1	2026-04-19 18:22:46.062243
1632	\N	PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40ea.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40ea.cat	26374	application/octet-stream	1	2026-04-19 18:22:46.130031
1802	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªmanifest_iceb.man	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªmanifest_iceb.man	29659	application/octet-stream	1	2026-04-19 18:22:47.549592
1648	\N	PRO40GB´ÇªWinx64´ÇªWS2022´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2022´Çªreadme.txt	603	text/plain	1	2026-04-19 18:22:46.308735
1660	\N	PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40eb.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40eb.sys	1488000	application/octet-stream	1	2026-04-19 18:22:46.462951
1662	\N	PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40ebmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40ebmsg.dll	367744	application/octet-stream	1	2026-04-19 18:22:46.485705
1776	\N	PROCGB´ÇªWinx64´ÇªW11´Çªicea.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªW11´Çªicea.cat	14361	application/octet-stream	1	2026-04-19 18:22:47.299468
1810	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªscea.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªscea.sys	3005064	application/octet-stream	1	2026-04-19 18:22:47.618278
1680	\N	PROAVF´ÇªWinx64´ÇªNDIS65´Çªnicinavf.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS65´Çªnicinavf.dll	161376	application/octet-stream	1	2026-04-19 18:22:46.657936
1682	\N	PROAVF´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	798	text/plain	1	2026-04-19 18:22:46.666052
1699	\N	PROAVF´ÇªWinx64´ÇªWS2022´Çªiavf.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2022´Çªiavf.inf	64677	application/octet-stream	1	2026-04-19 18:22:46.750387
1703	\N	PROAVF´ÇªWinx64´ÇªWS2022´Çªiavfmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2022´Çªiavfmsg.dll	366728	application/octet-stream	1	2026-04-19 18:22:46.779149
1732	\N	PROCGB´ÇªWinx64´ÇªNDIS65´Çªicea65.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS65´Çªicea65.sys	2284136	application/octet-stream	1	2026-04-19 18:22:46.953728
1665	\N	PRO40GB´ÇªWinx64´ÇªWS2025´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2025´Çªreadme.txt	574	text/plain	1	2026-04-19 18:22:46.580498
1684	\N	PROAVF´ÇªWinx64´ÇªNDIS68´Çªiavf68.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS68´Çªiavf68.cat	13233	application/octet-stream	1	2026-04-19 18:22:46.674889
1695	\N	PROAVF´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	1061	text/plain	1	2026-04-19 18:22:46.73221
1781	\N	PROCGB´ÇªWinx64´ÇªW11´Çªiceamsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªW11´Çªiceamsg.dll	368256	application/octet-stream	1	2026-04-19 18:22:47.349024
1730	\N	PROCGB´ÇªWinx64´ÇªNDIS65´Çªicea65.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS65´Çªicea65.inf	166469	application/octet-stream	1	2026-04-19 18:22:46.941345
1783	\N	PROCGB´ÇªWinx64´ÇªW11´Çªmanifest_icea.man	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªW11´Çªmanifest_icea.man	29659	application/octet-stream	1	2026-04-19 18:22:47.365827
1789	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªicea.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªicea.inf	196879	application/octet-stream	1	2026-04-19 18:22:47.416805
1791	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªicea.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªicea.sys	3001984	application/octet-stream	1	2026-04-19 18:22:47.43328
1749	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªicea68.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªicea68.sys	3001984	application/octet-stream	1	2026-04-19 18:22:47.054347
1636	\N	PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40ea.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40ea.sys	886408	application/octet-stream	1	2026-04-19 18:22:46.173241
1773	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªscea68.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªscea68.sys	3005056	application/octet-stream	1	2026-04-19 18:22:47.266281
1795	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªiceb.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªiceb.cat	13783	application/octet-stream	1	2026-04-19 18:22:47.471711
1666	\N	PROAVF´ÇªWinx64´Çª	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´Çª	0	application/octet-stream	1	2026-04-19 18:22:46.591133
1635	\N	PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40ea.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40ea.sys	886408	application/octet-stream	1	2026-04-19 18:22:46.172859
1640	\N	PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40eb.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2022´Çªi40eb.cat	14969	application/octet-stream	1	2026-04-19 18:22:46.21878
1678	\N	PROAVF´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	139360	application/octet-stream	1	2026-04-19 18:22:46.649047
1687	\N	PROAVF´ÇªWinx64´ÇªNDIS68´Çªiavf68.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS68´Çªiavf68.inf	68643	application/octet-stream	1	2026-04-19 18:22:46.695198
1622	\N	PRO40GB´ÇªWinx64´ÇªW11´Çªi40eb.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªW11´Çªi40eb.cat	15050	application/octet-stream	1	2026-04-19 18:22:46.018589
1676	\N	PROAVF´ÇªWinx64´ÇªNDIS65´Çªiavfmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS65´Çªiavfmsg.dll	361056	application/octet-stream	1	2026-04-19 18:22:46.640668
1664	\N	PRO40GB´ÇªWinx64´ÇªWS2025´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2025´Çªreadme.txt	574	text/plain	1	2026-04-19 18:22:46.580071
1671	\N	PROAVF´ÇªWinx64´ÇªNDIS65´Çªiavf65.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS65´Çªiavf65.din	3057	application/octet-stream	1	2026-04-19 18:22:46.616337
1673	\N	PROAVF´ÇªWinx64´ÇªNDIS65´Çªiavf65.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS65´Çªiavf65.inf	68370	application/octet-stream	1	2026-04-19 18:22:46.624757
1677	\N	PROAVF´ÇªWinx64´ÇªNDIS65´Çªiavfmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS65´Çªiavfmsg.dll	361056	application/octet-stream	1	2026-04-19 18:22:46.641509
1653	\N	PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40ea.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªWS2025´Çªi40ea.sys	886408	application/octet-stream	1	2026-04-19 18:22:46.374829
1670	\N	PROAVF´ÇªWinx64´ÇªNDIS65´Çªiavf65.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS65´Çªiavf65.cat	13603	application/octet-stream	1	2026-04-19 18:22:46.607671
110	\N	AITaskModal.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/AITaskModal.jsx	7404	application/octet-stream	1	2026-04-19 16:39:56.280168
1696	\N	PROAVF´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	1061	text/plain	1	2026-04-19 18:22:46.736804
1668	\N	PROAVF´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	357856	application/octet-stream	1	2026-04-19 18:22:46.598875
1686	\N	PROAVF´ÇªWinx64´ÇªNDIS68´Çªiavf68.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS68´Çªiavf68.din	2960	application/octet-stream	1	2026-04-19 18:22:46.686114
1675	\N	PROAVF´ÇªWinx64´ÇªNDIS65´Çªiavf65.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS65´Çªiavf65.sys	1184864	application/octet-stream	1	2026-04-19 18:22:46.632743
1701	\N	PROAVF´ÇªWinx64´ÇªWS2022´Çªiavf.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2022´Çªiavf.sys	1248896	application/octet-stream	1	2026-04-19 18:22:46.760005
1722	\N	PROCGB´ÇªWinx64´Çª	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´Çª	0	application/octet-stream	1	2026-04-19 18:22:46.89097
1693	\N	PROAVF´ÇªWinx64´ÇªNDIS68´Çªmanifest_iavf68.man	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªNDIS68´Çªmanifest_iavf68.man	29661	application/octet-stream	1	2026-04-19 18:22:46.724536
1729	\N	PROCGB´ÇªWinx64´ÇªNDIS65´Çªicea65.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS65´Çªicea65.inf	166469	application/octet-stream	1	2026-04-19 18:22:46.936809
1727	\N	PROCGB´ÇªWinx64´ÇªNDIS65´Çªicea65.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS65´Çªicea65.din	3044	application/octet-stream	1	2026-04-19 18:22:46.925576
1713	\N	PROAVF´ÇªWinx64´ÇªWS2025´Çªiavf.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2025´Çªiavf.sys	1248896	application/octet-stream	1	2026-04-19 18:22:46.835545
1777	\N	PROCGB´ÇªWinx64´ÇªW11´Çªicea.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªW11´Çªicea.cat	14361	application/octet-stream	1	2026-04-19 18:22:47.299897
1786	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªicea.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªicea.cat	16358	application/octet-stream	1	2026-04-19 18:22:47.399774
1803	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªmanifest_iceb.man	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªmanifest_iceb.man	29659	application/octet-stream	1	2026-04-19 18:22:47.557878
1822	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªicea.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªicea.cat	16356	application/octet-stream	1	2026-04-19 18:22:47.825931
1738	\N	PROCGB´ÇªWinx64´ÇªNDIS65´Çªnicinicea.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS65´Çªnicinicea.dll	101480	application/octet-stream	1	2026-04-19 18:22:46.993432
1780	\N	PROCGB´ÇªWinx64´ÇªW11´Çªicea.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªW11´Çªicea.sys	3001984	application/octet-stream	1	2026-04-19 18:22:47.333445
1800	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªicebmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªicebmsg.dll	367696	application/octet-stream	1	2026-04-19 18:22:47.524592
1825	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªicea.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªicea.sys	3001984	application/octet-stream	1	2026-04-19 18:22:47.870348
1828	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªiceb.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªiceb.cat	13787	application/octet-stream	1	2026-04-19 18:22:47.91482
1697	\N	PROAVF´ÇªWinx64´ÇªWS2022´Çªiavf.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2022´Çªiavf.cat	12794	application/octet-stream	1	2026-04-19 18:22:46.741936
1702	\N	PROAVF´ÇªWinx64´ÇªWS2022´Çªiavf.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2022´Çªiavf.sys	1248896	application/octet-stream	1	2026-04-19 18:22:46.764473
1706	\N	PROAVF´ÇªWinx64´ÇªWS2022´Çªmanifest_iavf.man	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2022´Çªmanifest_iavf.man	29659	application/octet-stream	1	2026-04-19 18:22:46.789195
1709	\N	PROAVF´ÇªWinx64´ÇªWS2025´Çªiavf.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2025´Çªiavf.cat	12797	application/octet-stream	1	2026-04-19 18:22:46.807155
1747	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªicea68.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªicea68.inf	170407	application/octet-stream	1	2026-04-19 18:22:47.041897
1798	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªiceb.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªiceb.sys	3051600	application/octet-stream	1	2026-04-19 18:22:47.500581
1804	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªreadme.txt	819	text/plain	1	2026-04-19 18:22:47.566932
1806	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªscea.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªscea.cat	12652	application/octet-stream	1	2026-04-19 18:22:47.583021
1814	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªsceb.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªsceb.cat	11961	application/octet-stream	1	2026-04-19 18:22:47.662401
1849	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªsceb.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªsceb.inf	130229	application/octet-stream	1	2026-04-19 18:22:48.269284
1831	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªiceb.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªiceb.sys	3051600	application/octet-stream	1	2026-04-19 18:22:47.959241
1718	\N	PROAVF´ÇªWinx64´ÇªWS2025´Çªmanifest_iavf.man	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROAVF´ÇªWinx64´ÇªWS2025´Çªmanifest_iavf.man	29659	application/octet-stream	1	2026-04-19 18:22:46.864341
1723	\N	PROCGB´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	357856	application/octet-stream	1	2026-04-19 18:22:46.902945
1820	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªscebmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªscebmsg.dll	367752	application/octet-stream	1	2026-04-19 18:22:47.796347
1728	\N	PROCGB´ÇªWinx64´ÇªNDIS65´Çªicea65.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS65´Çªicea65.din	3044	application/octet-stream	1	2026-04-19 18:22:46.925684
1743	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªicea68.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªicea68.cat	16851	application/octet-stream	1	2026-04-19 18:22:47.019038
1753	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªiceb68.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªiceb68.din	2993	application/octet-stream	1	2026-04-19 18:22:47.084009
1899	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	139376	application/octet-stream	1	2026-04-19 18:22:48.792716
1782	\N	PROCGB´ÇªWinx64´ÇªW11´Çªiceamsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªW11´Çªiceamsg.dll	368256	application/octet-stream	1	2026-04-19 18:22:47.357872
1816	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªsceb.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªsceb.inf	130229	application/octet-stream	1	2026-04-19 18:22:47.6847
1823	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªicea.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªicea.inf	196879	application/octet-stream	1	2026-04-19 18:22:47.839839
1907	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxa65x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxa65x64.inf	104988	application/octet-stream	1	2026-04-19 18:22:48.858977
1833	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªmanifest_icea.man	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªmanifest_icea.man	29659	application/octet-stream	1	2026-04-19 18:22:47.994909
1755	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªiceb68.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªiceb68.inf	160176	application/octet-stream	1	2026-04-19 18:22:47.09913
1757	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªiceb68.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªiceb68.sys	3051600	application/octet-stream	1	2026-04-19 18:22:47.116461
1858	\N	PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInIXS.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInIXS.dll	101088	application/octet-stream	1	2026-04-19 18:22:48.347558
1862	\N	PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInSXA.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInSXA.dll	100960	application/octet-stream	1	2026-04-19 18:22:48.385986
1865	\N	PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInVXN.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInVXN.dll	90208	application/octet-stream	1	2026-04-19 18:22:48.444565
1881	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixs65x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixs65x64.din	3062	application/octet-stream	1	2026-04-19 18:22:48.621328
1763	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªmanifest_iceb68.man	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªmanifest_iceb68.man	29661	application/octet-stream	1	2026-04-19 18:22:47.165328
1886	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixs65x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixs65x64.sys	518880	application/octet-stream	1	2026-04-19 18:22:48.66046
1811	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªsceamsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªsceamsg.dll	367232	application/octet-stream	1	2026-04-19 18:22:47.639599
1818	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªsceb.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªsceb.sys	2381960	application/octet-stream	1	2026-04-19 18:22:47.733379
1896	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixt65x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixt65x64.sys	512872	application/octet-stream	1	2026-04-19 18:22:48.75969
1736	\N	PROCGB´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	138664	application/octet-stream	1	2026-04-19 18:22:46.981692
1739	\N	PROCGB´ÇªWinx64´ÇªNDIS65´Çªnicinicea.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS65´Çªnicinicea.dll	101480	application/octet-stream	1	2026-04-19 18:22:46.994393
2030	\N	PROXGB´ÇªWinx64´ÇªW11´Çªixw.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªW11´Çªixw.inf	78821	application/octet-stream	1	2026-04-19 18:22:50.082916
1748	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªicea68.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªicea68.sys	3001984	application/octet-stream	1	2026-04-19 18:22:47.047428
1914	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxb65x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxb65x64.din	3062	application/octet-stream	1	2026-04-19 18:22:48.932926
1760	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªicebmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªicebmsg.dll	367696	application/octet-stream	1	2026-04-19 18:22:47.139319
2067	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªsxb.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªsxb.sys	519392	application/octet-stream	1	2026-04-19 18:22:50.314958
1764	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªmanifest_iceb68.man	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªmanifest_iceb68.man	29661	application/octet-stream	1	2026-04-19 18:22:47.181295
1809	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªscea.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªscea.sys	3005064	application/octet-stream	1	2026-04-19 18:22:47.617833
1807	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªscea.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªscea.inf	170835	application/octet-stream	1	2026-04-19 18:22:47.599605
1923	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxn65x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxn65x64.din	3107	application/octet-stream	1	2026-04-19 18:22:49.015969
1932	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxs65x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxs65x64.din	3055	application/octet-stream	1	2026-04-19 18:22:49.118313
1832	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªicebmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªicebmsg.dll	367696	application/octet-stream	1	2026-04-19 18:22:47.973661
1840	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªscea.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªscea.cat	12652	application/octet-stream	1	2026-04-19 18:22:48.062495
1947	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixnmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixnmsg.dll	120536	application/octet-stream	1	2026-04-19 18:22:49.295446
1962	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixt68x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixt68x64.inf	141478	application/octet-stream	1	2026-04-19 18:22:49.473081
1979	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxa68x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxa68x64.cat	12717	application/octet-stream	1	2026-04-19 18:22:49.673397
1994	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxb68x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxb68x64.inf	106309	application/octet-stream	1	2026-04-19 18:22:49.831147
2001	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxn68x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxn68x64.din	3091	application/octet-stream	1	2026-04-19 18:22:49.957146
1853	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªscebmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªscebmsg.dll	367752	application/octet-stream	1	2026-04-19 18:22:48.303556
1880	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixs65x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixs65x64.cat	15249	application/octet-stream	1	2026-04-19 18:22:48.605582
1884	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixs65x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixs65x64.inf	133144	application/octet-stream	1	2026-04-19 18:22:48.638908
2017	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxsmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxsmsg.dll	85616	application/octet-stream	1	2026-04-19 18:22:50.028801
1775	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªsceamsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªsceamsg.dll	367232	application/octet-stream	1	2026-04-19 18:22:47.282838
1746	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªicea68.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªicea68.inf	170407	application/octet-stream	1	2026-04-19 18:22:47.037158
1766	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªscea68.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªscea68.cat	13083	application/octet-stream	1	2026-04-19 18:22:47.199742
1788	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªicea.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªicea.inf	196879	application/octet-stream	1	2026-04-19 18:22:47.416257
1756	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªiceb68.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªiceb68.inf	160176	application/octet-stream	1	2026-04-19 18:22:47.099317
1797	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªiceb.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªiceb.sys	3051600	application/octet-stream	1	2026-04-19 18:22:47.500364
1839	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªscea.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªscea.cat	12652	application/octet-stream	1	2026-04-19 18:22:48.06173
1801	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªmanifest_icea.man	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªmanifest_icea.man	29659	application/octet-stream	1	2026-04-19 18:22:47.53304
1826	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªiceamsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªiceamsg.dll	368256	application/octet-stream	1	2026-04-19 18:22:47.884743
1838	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªreadme.txt	721	text/plain	1	2026-04-19 18:22:48.039557
1854	\N	PROXGB´ÇªWinx64´Çª	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´Çª	0	application/octet-stream	1	2026-04-19 18:22:48.305923
1794	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªiceb.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªiceb.cat	13783	application/octet-stream	1	2026-04-19 18:22:47.466798
1772	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªscea68.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªscea68.sys	3005056	application/octet-stream	1	2026-04-19 18:22:47.265448
1758	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªiceb68.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªiceb68.sys	3051600	application/octet-stream	1	2026-04-19 18:22:47.124527
1762	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªmanifest_icea68.man	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªmanifest_icea68.man	29661	application/octet-stream	1	2026-04-19 18:22:47.159609
1769	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªscea68.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªscea68.din	2908	application/octet-stream	1	2026-04-19 18:22:47.225438
1799	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªicebmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªicebmsg.dll	367696	application/octet-stream	1	2026-04-19 18:22:47.516926
1790	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªicea.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªicea.sys	3001984	application/octet-stream	1	2026-04-19 18:22:47.433103
1808	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªscea.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªscea.inf	170835	application/octet-stream	1	2026-04-19 18:22:47.600016
1751	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªiceamsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªiceamsg.dll	368256	application/octet-stream	1	2026-04-19 18:22:47.069243
1778	\N	PROCGB´ÇªWinx64´ÇªW11´Çªicea.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªW11´Çªicea.inf	131572	application/octet-stream	1	2026-04-19 18:22:47.315967
1792	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªiceamsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªiceamsg.dll	368256	application/octet-stream	1	2026-04-19 18:22:47.449891
1796	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªiceb.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªiceb.inf	176771	application/octet-stream	1	2026-04-19 18:22:47.482911
1750	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªiceamsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªiceamsg.dll	368256	application/octet-stream	1	2026-04-19 18:22:47.058958
1813	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªsceb.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªsceb.cat	11961	application/octet-stream	1	2026-04-19 18:22:47.662192
1805	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªscea.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªscea.cat	12652	application/octet-stream	1	2026-04-19 18:22:47.582921
1770	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªscea68.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªscea68.inf	156032	application/octet-stream	1	2026-04-19 18:22:47.239713
1793	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªiceamsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªiceamsg.dll	368256	application/octet-stream	1	2026-04-19 18:22:47.450045
1819	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªscebmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªscebmsg.dll	367752	application/octet-stream	1	2026-04-19 18:22:47.795724
1827	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªiceb.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªiceb.cat	13787	application/octet-stream	1	2026-04-19 18:22:47.906109
1779	\N	PROCGB´ÇªWinx64´ÇªW11´Çªicea.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªW11´Çªicea.inf	131572	application/octet-stream	1	2026-04-19 18:22:47.324567
1837	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªreadme.txt	721	text/plain	1	2026-04-19 18:22:48.039132
1784	\N	PROCGB´ÇªWinx64´ÇªW11´Çªmanifest_icea.man	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªW11´Çªmanifest_icea.man	29659	application/octet-stream	1	2026-04-19 18:22:47.372783
1812	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªsceamsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªsceamsg.dll	367232	application/octet-stream	1	2026-04-19 18:22:47.639815
1879	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixs65x64.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixs65x64.cat	15249	application/octet-stream	1	2026-04-19 18:22:48.605424
1817	\N	PROCGB´ÇªWinx64´ÇªWS2022´Çªsceb.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2022´Çªsceb.sys	2381960	application/octet-stream	1	2026-04-19 18:22:47.733111
1857	\N	PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInIXS.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInIXS.dll	101088	application/octet-stream	1	2026-04-19 18:22:48.338167
1883	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixs65x64.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixs65x64.inf	133144	application/octet-stream	1	2026-04-19 18:22:48.638659
1867	\N	PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInVXS.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInVXS.dll	89544	application/octet-stream	1	2026-04-19 18:22:48.454925
1824	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªicea.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªicea.sys	3001984	application/octet-stream	1	2026-04-19 18:22:47.861654
1835	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªmanifest_iceb.man	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªmanifest_iceb.man	29659	application/octet-stream	1	2026-04-19 18:22:48.017076
1842	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªscea.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªscea.inf	170835	application/octet-stream	1	2026-04-19 18:22:48.084504
1871	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixn65x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixn65x64.cat	18142	application/octet-stream	1	2026-04-19 18:22:48.494474
1915	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxb65x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxb65x64.inf	102253	application/octet-stream	1	2026-04-19 18:22:48.949815
1918	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxbmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxbmsg.dll	120520	application/octet-stream	1	2026-04-19 18:22:48.982801
1920	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxn65x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxn65x64.cat	13231	application/octet-stream	1	2026-04-19 18:22:48.999279
1830	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªiceb.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªiceb.sys	3051600	application/octet-stream	1	2026-04-19 18:22:47.950428
1834	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªmanifest_icea.man	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªmanifest_icea.man	29659	application/octet-stream	1	2026-04-19 18:22:47.995344
1836	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªmanifest_iceb.man	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªmanifest_iceb.man	29659	application/octet-stream	1	2026-04-19 18:22:48.01837
1771	\N	PROCGB´ÇªWinx64´ÇªNDIS68´Çªscea68.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªNDIS68´Çªscea68.inf	156032	application/octet-stream	1	2026-04-19 18:22:47.247969
1863	\N	PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInSXB.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInSXB.dll	101064	application/octet-stream	1	2026-04-19 18:22:48.406537
1829	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªiceb.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªiceb.inf	176771	application/octet-stream	1	2026-04-19 18:22:47.929651
1844	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªscea.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªscea.sys	3005064	application/octet-stream	1	2026-04-19 18:22:48.109107
1845	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªsceamsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªsceamsg.dll	367240	application/octet-stream	1	2026-04-19 18:22:48.12866
1951	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixs68x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixs68x64.din	3046	application/octet-stream	1	2026-04-19 18:22:49.339654
1897	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixtmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixtmsg.dll	118648	application/octet-stream	1	2026-04-19 18:22:48.773455
1841	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªscea.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªscea.inf	170835	application/octet-stream	1	2026-04-19 18:22:48.084313
1846	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªsceamsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªsceamsg.dll	367240	application/octet-stream	1	2026-04-19 18:22:48.129182
1958	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixt68x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixt68x64.cat	12867	application/octet-stream	1	2026-04-19 18:22:49.42827
1966	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixtmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixtmsg.dll	118648	application/octet-stream	1	2026-04-19 18:22:49.517644
1971	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixw68.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixw68.inf	101099	application/octet-stream	1	2026-04-19 18:22:49.584157
1973	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixw68.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixw68.sys	844880	application/octet-stream	1	2026-04-19 18:22:49.612426
1931	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxs65x64.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxs65x64.din	3055	application/octet-stream	1	2026-04-19 18:22:49.118132
1851	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªsceb.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªsceb.sys	2381960	application/octet-stream	1	2026-04-19 18:22:48.285009
1872	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixn65x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixn65x64.din	3082	application/octet-stream	1	2026-04-19 18:22:48.516198
1878	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixnmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixnmsg.dll	120416	application/octet-stream	1	2026-04-19 18:22:48.587895
1976	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixwmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixwmsg.dll	367696	application/octet-stream	1	2026-04-19 18:22:49.630458
1901	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	902	text/plain	1	2026-04-19 18:22:48.80642
1909	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxa65x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxa65x64.sys	518864	application/octet-stream	1	2026-04-19 18:22:48.873992
1912	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxb65x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxb65x64.cat	13395	application/octet-stream	1	2026-04-19 18:22:48.916379
1917	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxb65x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxb65x64.sys	518856	application/octet-stream	1	2026-04-19 18:22:48.965559
1928	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxnmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxnmsg.dll	85600	application/octet-stream	1	2026-04-19 18:22:49.073528
1930	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxs65x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxs65x64.cat	12207	application/octet-stream	1	2026-04-19 18:22:49.094964
1949	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixs68x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixs68x64.cat	14374	application/octet-stream	1	2026-04-19 18:22:49.317866
1856	\N	PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInIXN.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInIXN.dll	100448	application/octet-stream	1	2026-04-19 18:22:48.328593
1887	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixsmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixsmsg.dll	120432	application/octet-stream	1	2026-04-19 18:22:48.683369
1895	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixt65x64.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixt65x64.sys	512872	application/octet-stream	1	2026-04-19 18:22:48.759024
1948	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixs68x64.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixs68x64.cat	14374	application/octet-stream	1	2026-04-19 18:22:49.317199
1913	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxb65x64.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxb65x64.cat	13395	application/octet-stream	1	2026-04-19 18:22:48.924507
1916	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxb65x64.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxb65x64.inf	102253	application/octet-stream	1	2026-04-19 18:22:48.95792
1921	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxn65x64.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxn65x64.cat	13231	application/octet-stream	1	2026-04-19 18:22:48.999661
1922	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxn65x64.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxn65x64.din	3107	application/octet-stream	1	2026-04-19 18:22:49.015794
1927	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxn65x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxn65x64.sys	192608	application/octet-stream	1	2026-04-19 18:22:49.050849
1933	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxs65x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxs65x64.inf	66990	application/octet-stream	1	2026-04-19 18:22:49.144467
1938	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixn68x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixn68x64.cat	17407	application/octet-stream	1	2026-04-19 18:22:49.206386
1954	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixs68x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixs68x64.sys	519376	application/octet-stream	1	2026-04-19 18:22:49.383594
1999	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxn68x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxn68x64.cat	12371	application/octet-stream	1	2026-04-19 18:22:49.949472
1843	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªscea.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªscea.sys	3005064	application/octet-stream	1	2026-04-19 18:22:48.10876
1852	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªscebmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªscebmsg.dll	367752	application/octet-stream	1	2026-04-19 18:22:48.295984
1885	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixs65x64.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixs65x64.sys	518880	application/octet-stream	1	2026-04-19 18:22:48.660333
1908	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxa65x64.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxa65x64.inf	104988	application/octet-stream	1	2026-04-19 18:22:48.864601
1926	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxn65x64.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxn65x64.sys	192608	application/octet-stream	1	2026-04-19 18:22:49.050632
2005	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxn68x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxn68x64.sys	192712	application/octet-stream	1	2026-04-19 18:22:49.980763
1965	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixtmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixtmsg.dll	118648	application/octet-stream	1	2026-04-19 18:22:49.517177
1980	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxa68x64.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxa68x64.cat	12717	application/octet-stream	1	2026-04-19 18:22:49.673785
2007	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxnmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxnmsg.dll	85704	application/octet-stream	1	2026-04-19 18:22:49.986576
2010	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxs68x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxs68x64.cat	12550	application/octet-stream	1	2026-04-19 18:22:49.995708
1848	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªsceb.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªsceb.cat	11958	application/octet-stream	1	2026-04-19 18:22:48.256237
2012	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxs68x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxs68x64.din	3039	application/octet-stream	1	2026-04-19 18:22:50.005343
1903	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxa65x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxa65x64.cat	13452	application/octet-stream	1	2026-04-19 18:22:48.826406
1911	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxamsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxamsg.dll	120416	application/octet-stream	1	2026-04-19 18:22:48.899582
1924	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxn65x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxn65x64.inf	50053	application/octet-stream	1	2026-04-19 18:22:49.032918
1937	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxsmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxsmsg.dll	83832	application/octet-stream	1	2026-04-19 18:22:49.184739
1945	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixn68x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixn68x64.sys	518880	application/octet-stream	1	2026-04-19 18:22:49.273267
1963	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixt68x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixt68x64.sys	512872	application/octet-stream	1	2026-04-19 18:22:49.495571
1983	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxa68x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxa68x64.inf	108381	application/octet-stream	1	2026-04-19 18:22:49.719988
1961	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixt68x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixt68x64.din	3066	application/octet-stream	1	2026-04-19 18:22:49.460289
1967	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixw68.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixw68.cat	13113	application/octet-stream	1	2026-04-19 18:22:49.539841
1970	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixw68.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixw68.din	3037	application/octet-stream	1	2026-04-19 18:22:49.561946
1997	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxbmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxbmsg.dll	120520	application/octet-stream	1	2026-04-19 18:22:49.941199
2004	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxn68x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxn68x64.inf	49456	application/octet-stream	1	2026-04-19 18:22:49.96663
2014	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxs68x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxs68x64.inf	65482	application/octet-stream	1	2026-04-19 18:22:50.013044
2021	\N	PROXGB´ÇªWinx64´ÇªW11´Çªixs.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªW11´Çªixs.inf	151715	application/octet-stream	1	2026-04-19 18:22:50.045143
2002	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxn68x64.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxn68x64.din	3091	application/octet-stream	1	2026-04-19 18:22:49.957659
1904	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxa65x64.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxa65x64.cat	13452	application/octet-stream	1	2026-04-19 18:22:48.826506
1957	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixsmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixsmsg.dll	120528	application/octet-stream	1	2026-04-19 18:22:49.414947
1869	\N	PROXGB´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	357856	application/octet-stream	1	2026-04-19 18:22:48.471737
1892	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixt65x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixt65x64.din	3082	application/octet-stream	1	2026-04-19 18:22:48.727424
1894	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixt65x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixt65x64.inf	122280	application/octet-stream	1	2026-04-19 18:22:48.741718
1906	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxa65x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxa65x64.din	3062	application/octet-stream	1	2026-04-19 18:22:48.840494
1941	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixn68x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixn68x64.din	3066	application/octet-stream	1	2026-04-19 18:22:49.229076
1859	\N	PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInIXT.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInIXT.dll	100296	application/octet-stream	1	2026-04-19 18:22:48.358746
1861	\N	PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInSXA.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInSXA.dll	100960	application/octet-stream	1	2026-04-19 18:22:48.376836
1866	\N	PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInVXN.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´ÇªNicInVXN.dll	90208	application/octet-stream	1	2026-04-19 18:22:48.445113
1877	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixn65x64.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixn65x64.sys	518752	application/octet-stream	1	2026-04-19 18:22:48.582351
1893	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixt65x64.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixt65x64.inf	122280	application/octet-stream	1	2026-04-19 18:22:48.740883
1936	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxs65x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxs65x64.sys	188776	application/octet-stream	1	2026-04-19 18:22:49.170377
1943	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixn68x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixn68x64.inf	214157	application/octet-stream	1	2026-04-19 18:22:49.251267
1925	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxn65x64.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxn65x64.inf	50053	application/octet-stream	1	2026-04-19 18:22:49.033166
1952	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixs68x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixs68x64.inf	163312	application/octet-stream	1	2026-04-19 18:22:49.36284
1972	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixw68.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixw68.inf	101099	application/octet-stream	1	2026-04-19 18:22:49.584326
1946	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixnmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixnmsg.dll	120536	application/octet-stream	1	2026-04-19 18:22:49.295263
1993	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxb68x64.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxb68x64.inf	106309	application/octet-stream	1	2026-04-19 18:22:49.830805
1986	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxa68x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxa68x64.sys	518880	application/octet-stream	1	2026-04-19 18:22:49.741271
1992	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxb68x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxb68x64.din	3046	application/octet-stream	1	2026-04-19 18:22:49.807963
1969	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixw68.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixw68.din	3037	application/octet-stream	1	2026-04-19 18:22:49.561646
2015	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxs68x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxs68x64.sys	192736	application/octet-stream	1	2026-04-19 18:22:50.019944
1870	\N	PROXGB´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´ÇªPROUnstl.exe	357856	application/octet-stream	1	2026-04-19 18:22:48.48156
2087	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªixw.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªixw.cat	12632	application/octet-stream	1	2026-04-19 18:22:50.455451
1910	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxamsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxamsg.dll	120416	application/octet-stream	1	2026-04-19 18:22:48.899033
1873	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixn65x64.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixn65x64.din	3082	application/octet-stream	1	2026-04-19 18:22:48.531292
1882	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixs65x64.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixs65x64.din	3062	application/octet-stream	1	2026-04-19 18:22:48.621514
1890	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixt65x64.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixt65x64.cat	13701	application/octet-stream	1	2026-04-19 18:22:48.703917
1944	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixn68x64.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixn68x64.sys	518880	application/octet-stream	1	2026-04-19 18:22:49.272881
1891	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixt65x64.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixt65x64.din	3082	application/octet-stream	1	2026-04-19 18:22:48.727236
2003	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxn68x64.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxn68x64.inf	49456	application/octet-stream	1	2026-04-19 18:22:49.966432
1902	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªreadme.txt	902	text/plain	1	2026-04-19 18:22:48.807182
2057	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªsxa.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªsxa.inf	99705	application/octet-stream	1	2026-04-19 18:22:50.25353
1919	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxbmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxbmsg.dll	120520	application/octet-stream	1	2026-04-19 18:22:48.983382
1977	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	939	text/plain	1	2026-04-19 18:22:49.650461
1929	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxnmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxnmsg.dll	85600	application/octet-stream	1	2026-04-19 18:22:49.081494
1960	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixt68x64.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixt68x64.din	3066	application/octet-stream	1	2026-04-19 18:22:49.450806
2041	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªixs.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªixs.sys	519368	application/octet-stream	1	2026-04-19 18:22:50.16126
1998	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxbmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxbmsg.dll	120520	application/octet-stream	1	2026-04-19 18:22:49.941448
2058	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªsxa.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªsxa.sys	519392	application/octet-stream	1	2026-04-19 18:22:50.268859
2091	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªixw.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªixw.sys	844880	application/octet-stream	1	2026-04-19 18:22:50.489563
2065	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªsxb.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªsxb.inf	97336	application/octet-stream	1	2026-04-19 18:22:50.304815
2080	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªixs.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªixs.inf	151713	application/octet-stream	1	2026-04-19 18:22:50.407512
2093	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªixwmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªixwmsg.dll	367696	application/octet-stream	1	2026-04-19 18:22:50.505789
1982	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxa68x64.din	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxa68x64.din	3046	application/octet-stream	1	2026-04-19 18:22:49.696969
1995	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxb68x64.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxb68x64.sys	518856	application/octet-stream	1	2026-04-19 18:22:49.932493
1875	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixn65x64.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixn65x64.inf	160481	application/octet-stream	1	2026-04-19 18:22:48.56481
2043	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªixsmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªixsmsg.dll	120528	application/octet-stream	1	2026-04-19 18:22:50.169527
2055	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªsxa.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªsxa.cat	12256	application/octet-stream	1	2026-04-19 18:22:50.243606
1900	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªnicco5.dll	139376	application/octet-stream	1	2026-04-19 18:22:48.793376
1935	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxs65x64.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxs65x64.sys	188776	application/octet-stream	1	2026-04-19 18:22:49.161963
1939	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixn68x64.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixn68x64.cat	17407	application/octet-stream	1	2026-04-19 18:22:49.207612
1950	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixs68x64.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixs68x64.din	3046	application/octet-stream	1	2026-04-19 18:22:49.339464
1988	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxamsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxamsg.dll	120536	application/octet-stream	1	2026-04-19 18:22:49.764108
1968	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixw68.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixw68.cat	13113	application/octet-stream	1	2026-04-19 18:22:49.539946
2009	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxs68x64.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxs68x64.cat	12550	application/octet-stream	1	2026-04-19 18:22:49.995587
1989	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxb68x64.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxb68x64.cat	12535	application/octet-stream	1	2026-04-19 18:22:49.785202
2035	\N	PROXGB´ÇªWinx64´ÇªW11´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªW11´Çªreadme.txt	661	text/plain	1	2026-04-19 18:22:50.12018
2037	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªixs.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªixs.cat	14016	application/octet-stream	1	2026-04-19 18:22:50.134647
2045	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªixw.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªixw.cat	12632	application/octet-stream	1	2026-04-19 18:22:50.185824
2053	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªreadme.txt	528	text/plain	1	2026-04-19 18:22:50.230922
2060	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªsxamsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªsxamsg.dll	120544	application/octet-stream	1	2026-04-19 18:22:50.281072
2077	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªvxsmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªvxsmsg.dll	87168	application/octet-stream	1	2026-04-19 18:22:50.381225
2083	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªixs.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªixs.sys	521808	application/octet-stream	1	2026-04-19 18:22:50.420386
2088	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªixw.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªixw.inf	99536	application/octet-stream	1	2026-04-19 18:22:50.472172
1953	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixs68x64.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixs68x64.inf	163312	application/octet-stream	1	2026-04-19 18:22:49.364725
1934	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxs65x64.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªvxs65x64.inf	66990	application/octet-stream	1	2026-04-19 18:22:49.14477
1940	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixn68x64.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixn68x64.din	3066	application/octet-stream	1	2026-04-19 18:22:49.228939
1942	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixn68x64.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixn68x64.inf	214157	application/octet-stream	1	2026-04-19 18:22:49.250719
1955	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixs68x64.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixs68x64.sys	519376	application/octet-stream	1	2026-04-19 18:22:49.3837
1959	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixt68x64.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixt68x64.cat	12867	application/octet-stream	1	2026-04-19 18:22:49.438417
1964	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixt68x64.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixt68x64.sys	512872	application/octet-stream	1	2026-04-19 18:22:49.496275
1974	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixw68.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixw68.sys	844880	application/octet-stream	1	2026-04-19 18:22:49.612622
1987	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxamsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxamsg.dll	120536	application/octet-stream	1	2026-04-19 18:22:49.762972
1990	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxb68x64.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxb68x64.cat	12535	application/octet-stream	1	2026-04-19 18:22:49.7854
1975	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªixwmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªixwmsg.dll	367696	application/octet-stream	1	2026-04-19 18:22:49.628358
1978	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªreadme.txt	939	text/plain	1	2026-04-19 18:22:49.650805
1981	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxa68x64.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxa68x64.din	3046	application/octet-stream	1	2026-04-19 18:22:49.696879
1984	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxa68x64.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxa68x64.inf	108381	application/octet-stream	1	2026-04-19 18:22:49.720137
1985	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxa68x64.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxa68x64.sys	518880	application/octet-stream	1	2026-04-19 18:22:49.741164
2000	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxn68x64.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxn68x64.cat	12371	application/octet-stream	1	2026-04-19 18:22:49.950119
2011	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxs68x64.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxs68x64.din	3039	application/octet-stream	1	2026-04-19 18:22:50.005004
2022	\N	PROXGB´ÇªWinx64´ÇªW11´Çªixs.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªW11´Çªixs.inf	151715	application/octet-stream	1	2026-04-19 18:22:50.048983
2020	\N	PROXGB´ÇªWinx64´ÇªW11´Çªixs.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªW11´Çªixs.cat	14044	application/octet-stream	1	2026-04-19 18:22:50.039775
2023	\N	PROXGB´ÇªWinx64´ÇªW11´Çªixs.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªW11´Çªixs.sys	521864	application/octet-stream	1	2026-04-19 18:22:50.056249
2013	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxs68x64.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxs68x64.inf	65482	application/octet-stream	1	2026-04-19 18:22:50.011998
2018	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxsmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxsmsg.dll	85616	application/octet-stream	1	2026-04-19 18:22:50.028932
2026	\N	PROXGB´ÇªWinx64´ÇªW11´Çªixsmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªW11´Çªixsmsg.dll	121992	application/octet-stream	1	2026-04-19 18:22:50.065872
2028	\N	PROXGB´ÇªWinx64´ÇªW11´Çªixw.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªW11´Çªixw.cat	12566	application/octet-stream	1	2026-04-19 18:22:50.073983
2031	\N	PROXGB´ÇªWinx64´ÇªW11´Çªixw.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªW11´Çªixw.sys	844880	application/octet-stream	1	2026-04-19 18:22:50.091698
2095	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªreadme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªreadme.txt	499	text/plain	1	2026-04-19 18:22:50.522067
2006	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxn68x64.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxn68x64.sys	192712	application/octet-stream	1	2026-04-19 18:22:49.980858
2008	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxnmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxnmsg.dll	85704	application/octet-stream	1	2026-04-19 18:22:49.986778
2016	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxs68x64.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªvxs68x64.sys	192736	application/octet-stream	1	2026-04-19 18:22:50.020244
2019	\N	PROXGB´ÇªWinx64´ÇªW11´Çªixs.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªW11´Çªixs.cat	14044	application/octet-stream	1	2026-04-19 18:22:50.036928
164	\N	pl.json	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/locales/pl.json	44467	application/json	1	2026-04-19 16:39:56.738286
2024	\N	PROXGB´ÇªWinx64´ÇªW11´Çªixs.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªW11´Çªixs.sys	521864	application/octet-stream	1	2026-04-19 18:22:50.056927
2027	\N	PROXGB´ÇªWinx64´ÇªW11´Çªixw.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªW11´Çªixw.cat	12566	application/octet-stream	1	2026-04-19 18:22:50.073656
2029	\N	PROXGB´ÇªWinx64´ÇªW11´Çªixw.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªW11´Çªixw.inf	78821	application/octet-stream	1	2026-04-19 18:22:50.082506
2054	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªsxa.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªsxa.cat	12256	application/octet-stream	1	2026-04-19 18:22:50.242365
2059	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªsxa.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªsxa.sys	519392	application/octet-stream	1	2026-04-19 18:22:50.269342
2061	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªsxamsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªsxamsg.dll	120544	application/octet-stream	1	2026-04-19 18:22:50.28154
2066	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªsxb.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªsxb.sys	519392	application/octet-stream	1	2026-04-19 18:22:50.31466
1584	\N	PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eb65.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PRO40GB´ÇªWinx64´ÇªNDIS65´Çªi40eb65.din	3064	application/octet-stream	1	2026-04-19 18:22:45.641335
2034	\N	PROXGB´ÇªWinx64´ÇªW11´Çªixwmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªW11´Çªixwmsg.dll	367696	application/octet-stream	1	2026-04-19 18:22:50.110554
2062	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªsxb.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªsxb.cat	12092	application/octet-stream	1	2026-04-19 18:22:50.292477
2070	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªvxs.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªvxs.cat	12306	application/octet-stream	1	2026-04-19 18:22:50.345351
2072	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªvxs.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªvxs.inf	63299	application/octet-stream	1	2026-04-19 18:22:50.352796
2084	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªixsmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªixsmsg.dll	121936	application/octet-stream	1	2026-04-19 18:22:50.438386
2101	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªsxa.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªsxa.sys	520904	application/octet-stream	1	2026-04-19 18:22:50.572429
2102	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªsxamsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªsxamsg.dll	120520	application/octet-stream	1	2026-04-19 18:22:50.587748
2049	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªixw.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªixw.sys	844880	application/octet-stream	1	2026-04-19 18:22:50.209038
2025	\N	PROXGB´ÇªWinx64´ÇªW11´Çªixsmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªW11´Çªixsmsg.dll	121992	application/octet-stream	1	2026-04-19 18:22:50.065518
2032	\N	PROXGB´ÇªWinx64´ÇªW11´Çªixw.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªW11´Çªixw.sys	844880	application/octet-stream	1	2026-04-19 18:22:50.096838
2036	\N	PROXGB´ÇªWinx64´ÇªW11´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªW11´Çªreadme.txt	661	text/plain	1	2026-04-19 18:22:50.121603
2108	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªvxs.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªvxs.sys	194688	application/octet-stream	1	2026-04-19 18:22:50.6388
2044	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªixsmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªixsmsg.dll	120528	application/octet-stream	1	2026-04-19 18:22:50.174503
2046	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªixw.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªixw.cat	12632	application/octet-stream	1	2026-04-19 18:22:50.18652
2115	\N	Resource´ÇªSetupBD.din	/app/uploads/administrador/Escritorio/Wired_driver_31/Resource´ÇªSetupBD.din	936	application/octet-stream	1	2026-04-19 18:22:50.705933
2119	\N	license.pdf	/app/uploads/administrador/Escritorio/Wired_driver_31/license.pdf	86805	application/pdf	1	2026-04-19 18:22:50.755291
2124	\N	readme.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/readme.txt	10335	text/plain	1	2026-04-19 18:22:50.788156
2047	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªixw.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªixw.inf	99536	application/octet-stream	1	2026-04-19 18:22:50.198095
2038	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªixs.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªixs.cat	14016	application/octet-stream	1	2026-04-19 18:22:50.135498
2050	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªixw.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªixw.sys	844880	application/octet-stream	1	2026-04-19 18:22:50.213258
2039	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªixs.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªixs.inf	151715	application/octet-stream	1	2026-04-19 18:22:50.150331
147	\N	HoverPreview.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/UserPanel/HoverPreview.jsx	3388	application/octet-stream	1	2026-04-19 16:39:56.627377
2033	\N	PROXGB´ÇªWinx64´ÇªW11´Çªixwmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªW11´Çªixwmsg.dll	367696	application/octet-stream	1	2026-04-19 18:22:50.10797
2063	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªsxb.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªsxb.cat	12092	application/octet-stream	1	2026-04-19 18:22:50.292666
2064	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªsxb.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªsxb.inf	97336	application/octet-stream	1	2026-04-19 18:22:50.304368
2079	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªixs.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªixs.cat	14016	application/octet-stream	1	2026-04-19 18:22:50.395585
2073	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªvxs.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªvxs.inf	63299	application/octet-stream	1	2026-04-19 18:22:50.353106
2082	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªixs.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªixs.sys	521808	application/octet-stream	1	2026-04-19 18:22:50.419652
2096	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªsxa.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªsxa.cat	12234	application/octet-stream	1	2026-04-19 18:22:50.538487
2099	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªsxa.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªsxa.inf	96137	application/octet-stream	1	2026-04-19 18:22:50.554613
2086	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªixw.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªixw.cat	12632	application/octet-stream	1	2026-04-19 18:22:50.454664
2090	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªixw.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªixw.sys	844880	application/octet-stream	1	2026-04-19 18:22:50.489435
2123	\N	readme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/readme.txt	10335	text/plain	1	2026-04-19 18:22:50.787943
2104	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªvxs.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªvxs.cat	12306	application/octet-stream	1	2026-04-19 18:22:50.604532
2111	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªvxsmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªvxsmsg.dll	87168	application/octet-stream	1	2026-04-19 18:22:50.660636
2121	\N	license.txt	/app/uploads/administrador/Escritorio/Wired_driver_31/license.txt	10681	text/plain	1	2026-04-19 18:22:50.771608
2120	\N	license.pdf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/license.pdf	86805	application/pdf	1	2026-04-19 18:22:50.755699
2040	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªixs.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªixs.inf	151715	application/octet-stream	1	2026-04-19 18:22:50.151038
2042	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªixs.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªixs.sys	519368	application/octet-stream	1	2026-04-19 18:22:50.16146
2071	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªvxs.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªvxs.cat	12306	application/octet-stream	1	2026-04-19 18:22:50.346416
2094	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªreadme.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªreadme.txt	499	text/plain	1	2026-04-19 18:22:50.52179
2098	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªsxa.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªsxa.inf	96137	application/octet-stream	1	2026-04-19 18:22:50.554525
2100	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªsxa.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªsxa.sys	520904	application/octet-stream	1	2026-04-19 18:22:50.57207
2109	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªvxs.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªvxs.sys	194688	application/octet-stream	1	2026-04-19 18:22:50.638897
2052	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªixwmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªixwmsg.dll	367696	application/octet-stream	1	2026-04-19 18:22:50.230072
2068	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªsxbmsg.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªsxbmsg.dll	120536	application/octet-stream	1	2026-04-19 18:22:50.326266
2075	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªvxs.sys	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªvxs.sys	194696	application/octet-stream	1	2026-04-19 18:22:50.369679
2051	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªixwmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªixwmsg.dll	367696	application/octet-stream	1	2026-04-19 18:22:50.220503
2048	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªixw.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªixw.inf	99536	application/octet-stream	1	2026-04-19 18:22:50.198282
2056	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªsxa.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªsxa.inf	99705	application/octet-stream	1	2026-04-19 18:22:50.253397
2076	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªvxsmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªvxsmsg.dll	87168	application/octet-stream	1	2026-04-19 18:22:50.38081
2078	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªixs.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªixs.cat	14016	application/octet-stream	1	2026-04-19 18:22:50.39412
2089	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªixw.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªixw.inf	99536	application/octet-stream	1	2026-04-19 18:22:50.472406
2092	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªixwmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªixwmsg.dll	367696	application/octet-stream	1	2026-04-19 18:22:50.505414
2105	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªvxs.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªvxs.cat	12306	application/octet-stream	1	2026-04-19 18:22:50.605358
2107	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªvxs.inf	/app/uploads/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªvxs.inf	63299	application/octet-stream	1	2026-04-19 18:22:50.621634
2114	\N	Resource´ÇªSetBDRes.dll	/app/uploads/administrador/Escritorio/Wired_driver_31/Resource´ÇªSetBDRes.dll	133080	application/octet-stream	1	2026-04-19 18:22:50.693969
2118	\N	SetupBD.exe	/app/uploads/administrador/Escritorio/Wired_driver_31/SetupBD.exe	544728	application/octet-stream	1	2026-04-19 18:22:50.73997
2069	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªsxbmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªsxbmsg.dll	120536	application/octet-stream	1	2026-04-19 18:22:50.326888
2074	\N	PROXGB´ÇªWinx64´ÇªWS2022´Çªvxs.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2022´Çªvxs.sys	194696	application/octet-stream	1	2026-04-19 18:22:50.369481
2097	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªsxa.cat	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªsxa.cat	12234	application/octet-stream	1	2026-04-19 18:22:50.539219
2081	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªixs.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªixs.inf	151713	application/octet-stream	1	2026-04-19 18:22:50.40999
2085	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªixsmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªixsmsg.dll	121936	application/octet-stream	1	2026-04-19 18:22:50.438679
2106	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªvxs.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªvxs.inf	63299	application/octet-stream	1	2026-04-19 18:22:50.621423
2113	\N	Resource´ÇªSetBDRes.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/Resource´ÇªSetBDRes.dll	133080	application/octet-stream	1	2026-04-19 18:22:50.688518
1847	\N	PROCGB´ÇªWinx64´ÇªWS2025´Çªsceb.cat	/app/uploads/administrador/Escritorio/Wired_driver_31/PROCGB´ÇªWinx64´ÇªWS2025´Çªsceb.cat	11958	application/octet-stream	1	2026-04-19 18:22:48.255489
2112	\N	Resource´ÇªPROUnstl.exe	/app/uploads/administrador/Escritorio/Wired_driver_31/Resource´ÇªPROUnstl.exe	357856	application/octet-stream	1	2026-04-19 18:22:50.672745
1874	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªixn65x64.inf	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªixn65x64.inf	160481	application/octet-stream	1	2026-04-19 18:22:48.551929
2110	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªvxsmsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªvxsmsg.dll	87168	application/octet-stream	1	2026-04-19 18:22:50.654929
1905	\N	PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxa65x64.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS65´Çªsxa65x64.din	3062	application/octet-stream	1	2026-04-19 18:22:48.840148
2125	\N	verfile.tic	/app/uploads/administrador/Escritorio/Wired_driver_31/verfile.tic	19	application/octet-stream	1	2026-04-19 18:22:50.804871
2103	\N	PROXGB´ÇªWinx64´ÇªWS2025´Çªsxamsg.dll	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªWS2025´Çªsxamsg.dll	120520	application/octet-stream	1	2026-04-19 18:22:50.58855
2126	\N	verfile.tic	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/verfile.tic	19	application/octet-stream	1	2026-04-19 18:22:50.804969
21	\N	push-to-checkout.sample	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/hooks/push-to-checkout.sample	2783	application/octet-stream	1	2026-04-19 16:39:20.450999
2122	\N	license.txt	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/license.txt	10681	text/plain	1	2026-04-19 18:22:50.771884
8	\N	config	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/config	348	application/octet-stream	1	2026-04-19 16:39:20.391074
16	\N	pre-merge-commit.sample	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/hooks/pre-merge-commit.sample	416	application/octet-stream	1	2026-04-19 16:39:20.42718
197	\N	debug_rdp.py	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/tests/debug_rdp.py	5024	text/x-python	1	2026-04-19 16:39:58.097996
1991	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxb68x64.din	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxb68x64.din	3046	application/octet-stream	1	2026-04-19 18:22:49.807314
1996	\N	PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxb68x64.sys	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Wired_driver_31/PROXGB´ÇªWinx64´ÇªNDIS68´Çªsxb68x64.sys	518856	application/octet-stream	1	2026-04-19 18:22:49.933026
194	\N	microsoft-auth.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/outlook-service/src/utils/microsoft-auth.js	674	text/javascript	1	2026-04-19 16:39:57.724458
69	\N	FormContainer.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Common/FormContainer.css	1134	application/octet-stream	1	2026-04-19 16:39:55.71329
39	\N	main.fb5b6919.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/build/static/css/main.fb5b6919.css	331651	application/octet-stream	1	2026-04-19 16:39:55.399601
22	\N	sendemail-validate.sample	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/.git/hooks/sendemail-validate.sample	2308	application/octet-stream	1	2026-04-19 16:39:20.457752
57	\N	RDPManager.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Admin/RDPManager.jsx	11737	application/octet-stream	1	2026-04-19 16:39:55.600783
157	\N	NotificationContext.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/context/NotificationContext.js	6234	text/javascript	1	2026-04-19 16:39:56.690256
122	\N	FileViewerModal.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/FileViewerModal.css	253	application/octet-stream	1	2026-04-19 16:39:56.488285
108	\N	AIResultsModal.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/AIResultsModal.jsx	11045	application/octet-stream	1	2026-04-19 16:39:56.146823
162	\N	en.json	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/locales/en.json	40535	application/json	1	2026-04-19 16:39:56.725774
132	\N	SettingsModal.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/SettingsModal.css	10178	application/octet-stream	1	2026-04-19 16:39:56.535512
111	\N	CreateFileModal.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/CreateFileModal.jsx	3358	application/octet-stream	1	2026-04-19 16:39:56.43712
116	\N	DuplicateFilesModal.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/DuplicateFilesModal.jsx	3743	application/octet-stream	1	2026-04-19 16:39:56.461913
84	\N	AudioPlayer.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/AudioPlayer.jsx	6075	application/octet-stream	1	2026-04-19 16:39:55.878796
114	\N	DeleteConfirmationModal.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/DeleteConfirmationModal.jsx	2842	application/octet-stream	1	2026-04-19 16:39:56.453552
113	\N	DeleteConfirmationModal.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/DeleteConfirmationModal.css	1973	application/octet-stream	1	2026-04-19 16:39:56.446807
137	\N	RDPViewer.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/RDP/RDPViewer.jsx	23018	application/octet-stream	1	2026-04-19 16:39:56.56626
180	\N	searchController.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/ai-service/src/controllers/searchController.js	19496	text/javascript	1	2026-04-19 16:39:57.099597
159	\N	useFetch.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/hooks/useFetch.js	1341	text/javascript	1	2026-04-19 16:39:56.705162
186	\N	dualNodeIndexing.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/ai-service/src/utils/dualNodeIndexing.js	10085	text/javascript	1	2026-04-19 16:39:57.167432
193	\N	server.db	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/outlook-service/src/database/server.db	81920	application/octet-stream	1	2026-04-19 16:39:57.70225
163	\N	es.json	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/locales/es.json	46217	application/json	1	2026-04-19 16:39:56.731542
191	\N	autoSync.js	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/services/file-service/src/autoSync.js	8039	text/javascript	1	2026-04-19 16:39:57.40233
90	\N	ImageEditor.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/ImageEditor.jsx	14761	application/octet-stream	1	2026-04-19 16:39:55.945664
145	\N	FolderSelector.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/UserPanel/FolderSelector.css	5091	application/octet-stream	1	2026-04-19 16:39:56.616257
149	\N	SidebarPanel.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/UserPanel/SidebarPanel.jsx	16164	application/octet-stream	1	2026-04-19 16:39:56.63851
89	\N	ImageEditor.css	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/FileEditor/editors/ImageEditor.css	7855	application/octet-stream	1	2026-04-19 16:39:55.935537
118	\N	EventModal.jsx	/app/uploads/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Datos/administrador/Escritorio/Base_de_datos_archivos/front/src/components/Modals/EventModal.jsx	45723	application/octet-stream	1	2026-04-19 16:39:56.470236
\.


--
-- Data for Name: folder_metadata; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.folder_metadata (id, username, folder_path, color, icon, updated_at) FROM stdin;
1	administrador	Documentos	#ff0000	default	2026-04-22 11:03:53.055131
2	administrador	Escritorio	#5dba6e	default	2026-04-22 14:31:41.500538
3	eric	Escritorio	#5dba6e	default	2026-04-23 09:00:12.762303
\.


--
-- Data for Name: folders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.folders (id, parent_id, name, owner_id, created_at) FROM stdin;
\.


--
-- Data for Name: group_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.group_members (group_id, user_id, role, joined_at) FROM stdin;
2	3	member	2026-04-22 17:01:56.633
\.


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.groups (id, name, description, created_by, created_at) FROM stdin;
2	Grupo 1	Grupo Test	1	2026-04-22 17:01:51.093999
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, title, message, type, is_read, link, created_at, metadata) FROM stdin;
1	1	file_shared	eric|Presentaci├│n.pptx	info	t	/shared	2026-04-19 16:11:07.04259	{"from": "eric", "path": "Presentaci├│n.pptx", "fileName": "Presentaci├│n.pptx", "notifType": "file_share"}
2	1	file_shared	eric|Documento.docx	info	t	/shared	2026-04-20 09:53:05.072417	{"from": "eric", "path": "Documento.docx", "fileName": "Documento.docx", "notifType": "file_share"}
5	1	file_shared	eric|Documento.docx	info	t	/shared	2026-04-22 14:57:17.92558	{"from": "eric", "path": "Documento.docx", "fileName": "Documento.docx", "notifType": "file_share"}
6	1	file_shared	eric|Presentaci├│n.pptx	info	t	/shared	2026-04-22 15:41:37.941186	{"from": "eric", "path": "Presentaci├│n.pptx", "fileName": "Presentaci├│n.pptx", "notifType": "file_share", "permission": "read"}
13	1	file_shared_deleted	eric|Presentaci├│n.pptx	warning	t	\N	2026-04-22 19:47:53.924213	{"from": "eric", "path": "Presentaci├│n.pptx", "fileName": "Presentaci├│n.pptx", "notifType": "file_shared_deleted"}
14	1	file_shared_deleted	eric|Documento.docx	warning	t	\N	2026-04-22 19:47:56.882076	{"from": "eric", "path": "Documento.docx", "fileName": "Documento.docx", "notifType": "file_shared_deleted"}
3	3	calendar_event_assigned	administrador|estudiar	task	t	/calendar	2026-04-20 10:06:15.698527	{"end": "2026-04-21T13:00:00Z", "from": "administrador", "start": "2026-04-21T12:00:00Z", "allDay": false, "notifType": "calendar_assign", "eventTitle": "estudiar"}
4	3	file_shared	administrador|Documento.docx	info	t	/shared	2026-04-22 11:02:10.896477	{"from": "administrador", "path": "Documento.docx", "fileName": "Documento.docx", "notifType": "file_share"}
7	3	file_shared	administrador|Presentaci├│n.pptx	info	t	/shared	2026-04-22 17:03:07.097218	{"from": "administrador", "path": "Presentaci├│n.pptx", "fileName": "Presentaci├│n.pptx", "notifType": "file_share", "permission": "edit"}
8	3	file_unshared	administrador|Presentaci├│n.pptx	warning	t	\N	2026-04-22 17:38:17.35448	{"from": "administrador", "path": "Presentaci├│n.pptx", "fileName": "Presentaci├│n.pptx", "notifType": "file_unshared"}
9	3	file_shared	administrador|Presentaci├│n.pptx	info	t	/shared	2026-04-22 17:38:41.008776	{"from": "administrador", "path": "Presentaci├│n.pptx", "fileName": "Presentaci├│n.pptx", "notifType": "file_share", "permission": "edit"}
10	3	file_unshared	administrador|Presentaci├│n.pptx	warning	t	\N	2026-04-22 17:52:05.153121	{"from": "administrador", "path": "Presentaci├│n.pptx", "fileName": "Presentaci├│n.pptx", "notifType": "file_unshared"}
11	3	file_shared	administrador|Presentaci├│n.pptx	info	t	/shared	2026-04-22 17:52:35.170105	{"from": "administrador", "path": "Presentaci├│n.pptx", "fileName": "Presentaci├│n.pptx", "notifType": "file_share", "permission": "edit"}
12	3	file_shared_deleted	administrador|Presentaci├│n.pptx	warning	t	\N	2026-04-22 19:45:17.342714	{"from": "administrador", "path": "Presentaci├│n.pptx", "fileName": "Presentaci├│n.pptx", "notifType": "file_shared_deleted"}
\.


--
-- Data for Name: rdp_connections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rdp_connections (id, user_id, server_id, name, hostname, port, username, password, protocol, virtual_ip, public_key, created_at, security, domain, ignore_cert, enable_drive, drive_path, enable_audio, password_encrypted, last_used, is_active) FROM stdin;
1	2	715759	Este Servidor	host.docker.internal	3389			rdp	10.10.10.2	\N	2026-04-19 01:02:29.790956	nla	\N	t	f	\N	f	\N	\N	t
\.


--
-- Data for Name: rdp_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rdp_settings (setting_key, setting_value) FROM stdin;
lan_only	false
server_id	886326
maintenance_mode	false
\.


--
-- Data for Name: roadmap_activity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_activity (id, project_id, issue_id, user_id, action, details, created_at) FROM stdin;
1	1	\N	3	project_created	{"name": "Planning", "project_type": "general"}	2026-04-23 15:15:56.353162
2	1	2	3	issue_created	{"title": "Entrega Memoria", "priority": "medium", "issue_key": "PLAN-2", "issue_type": "task"}	2026-04-23 15:20:20.726518
3	1	2	3	issue_moved	{"to": "Por Hacer", "from": "Backlog"}	2026-04-23 15:20:24.716723
4	1	2	3	issue_deleted	{"title": "Entrega Memoria"}	2026-04-23 15:20:33.983357
5	1	1	3	issue_updated	{"title": "Terminar Memoria Provisional"}	2026-04-23 15:20:52.104168
6	1	1	3	issue_moved	{"to": "Por Hacer", "from": "Backlog"}	2026-04-23 15:20:55.37796
\.


--
-- Data for Name: roadmap_calendar_links; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_calendar_links (id, calendar_event_id, issue_id, linked_by, link_direction, created_at) FROM stdin;
\.


--
-- Data for Name: roadmap_columns; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_columns (id, project_id, name, "position", color, wip_limit, created_at) FROM stdin;
1	1	Backlog	0	#6b7280	0	2026-04-23 15:15:56.32965
2	1	Por Hacer	1	#3b82f6	0	2026-04-23 15:15:56.335277
3	1	En Progreso	2	#f59e0b	0	2026-04-23 15:15:56.340374
4	1	Validar	3	#8b5cf6	0	2026-04-23 15:15:56.344713
5	1	Terminado	4	#10b981	0	2026-04-23 15:15:56.348694
\.


--
-- Data for Name: roadmap_comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_comments (id, issue_id, user_id, content, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: roadmap_custom_field_values; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_custom_field_values (id, issue_id, field_id, value, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: roadmap_custom_fields; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_custom_fields (id, project_id, name, field_type, options, is_required, "position", created_at) FROM stdin;
\.


--
-- Data for Name: roadmap_filters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_filters (id, project_id, user_id, name, filter_config, is_shared, created_at) FROM stdin;
\.


--
-- Data for Name: roadmap_issue_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_issue_documents (id, issue_id, file_id, file_path, file_name, linked_by, created_at) FROM stdin;
\.


--
-- Data for Name: roadmap_issue_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_issue_events (id, issue_id, event_id, provider, sync_direction, created_at) FROM stdin;
\.


--
-- Data for Name: roadmap_issue_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_issue_history (id, issue_id, user_id, field_name, old_value, new_value, created_at) FROM stdin;
3	1	3	assigned_to	\N	3	2026-04-23 15:20:52.095872
4	1	3	story_points	0.0	0	2026-04-23 15:20:52.100226
5	1	3	column	Backlog	Por Hacer	2026-04-23 15:20:55.373603
\.


--
-- Data for Name: roadmap_issue_links; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_issue_links (id, source_issue_id, target_issue_id, link_type, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: roadmap_issues; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_issues (id, project_id, column_id, title, description, issue_type, issue_key, priority, assigned_to, reporter_id, created_by, due_date, start_date, "position", labels, story_points, estimated_hours, logged_hours, remaining_hours, status, resolution, sprint_id, epic_id, parent_id, calendar_event_id, environment, acceptance_criteria, created_at, updated_at, completed_at, calendar_sync_status, calendar_synced_at, calendar_sync_error, calendar_synced_hash) FROM stdin;
1	1	2	Terminar Memoria Provisional		task	PLAN-1	medium	3	3	3	\N	\N	0	[]	0.0	4.50	0.00	0.00	open	\N	\N	\N	\N	\N			2026-04-23 15:16:25.420164	2026-04-23 15:20:55.354923	\N	not_synced	\N	\N	\N
\.


--
-- Data for Name: roadmap_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_members (project_id, user_id, role, joined_at) FROM stdin;
1	3	owner	2026-04-23 15:15:56.308444
\.


--
-- Data for Name: roadmap_milestones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_milestones (id, project_id, title, description, due_date, status, calendar_event_id, created_at) FROM stdin;
\.


--
-- Data for Name: roadmap_projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_projects (id, name, description, owner_id, status, project_type, project_key, issue_counter, created_at, updated_at) FROM stdin;
1	Planning		3	active	general	PLAN	2	2026-04-23 15:15:56.260396	2026-04-23 15:15:56.260396
\.


--
-- Data for Name: roadmap_sprint_burndown; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_sprint_burndown (id, sprint_id, snapshot_date, total_points, completed_points, remaining_points, total_issues, completed_issues, created_at) FROM stdin;
\.


--
-- Data for Name: roadmap_sprints; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_sprints (id, project_id, name, goal, status, start_date, end_date, velocity, created_by, created_at, completed_at) FROM stdin;
\.


--
-- Data for Name: roadmap_subtasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_subtasks (id, issue_id, title, is_completed, assigned_to, "position", created_by, created_at, completed_at) FROM stdin;
\.


--
-- Data for Name: roadmap_time_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_time_logs (id, issue_id, user_id, hours, description, work_date, created_at) FROM stdin;
\.


--
-- Data for Name: roadmap_user_access; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_user_access (user_id, access_level, can_create_projects, granted_by, granted_at) FROM stdin;
\.


--
-- Data for Name: roadmap_watchers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roadmap_watchers (issue_id, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: security_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.security_settings (id, user_id, recovery_email_enc, recovery_email_iv) FROM stdin;
1	1	\N	\N
\.


--
-- Data for Name: shared_files; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shared_files (id, path, owner_username, shared_with_username, created_at, pinned_to_panel, permission) FROM stdin;
\.


--
-- Data for Name: user_credentials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_credentials (user_id, password_hash, last_login, failed_attempts, is_locked, lockout_until, reset_token, reset_token_expires, updated_at) FROM stdin;
1	$2b$10$5IE8x47lLaCcZ4HCbboBgukqwWe9crpoc9p4nbnmyuVDhnWe2smV6	2026-04-23 09:49:09.399261	0	f	\N	\N	\N	2025-12-31 19:36:20
3	$2b$10$ziAlnsTRfIyX04NY62Z7TesSFj01fkhG7W/vFRAnpSA7KqtCHmOM6	2026-04-23 14:14:33.513607	0	f	\N	\N	\N	2026-04-22 14:56:38.094
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, role, created_at, avatar_url, theme_preference, language, notifications, microsoft_id, microsoft_email, microsoft_access_token, microsoft_refresh_token, deletion_scheduled_at) FROM stdin;
1	administrador	admin	2025-12-29 15:06:03	\N	light	es	f	\N	\N	\N	\N	\N
3	eric	user	2026-04-20 09:51:19.587	/api/auth/uploads/avatar-1776877354057-686842928.png	dark	es	f	8b18157151b13f5a	eric2004_24@hotmail.com	EwBIBMl6BAAU9BatlgMxts2T1B5e3Mucgfs4jcAAAR6OoHy/MsRY8Iobj5A28OlrwRYvAhvKeFif1KzEr96IYI9cOQQAh2M7x0Bprtz3hDKUJQWDH3vHv9oDYXPb29TCh5d+Z8kyBiYRqKWSyvIOPMX6oqwJV8mLVjPP0JWR3ZyzwMaTAGZfiVCvO7MGJY3lzRE5FiJq9RhDpJpsz8F9F3yF2QPerw/7voVB7UUbwoxf6kcvqJ3JIQVI6qI8Q4uRmo3Fw0Rf2hN08xYWTli1jhA8b0fm+1Q84UeirRifjvj728HNIELWvh0ddndt7p5JbpcFYSOa7Z9eup8DViY4VHz50Ap0MEOCIbazflzcNswb/E6luCuctgbnUb8ZREQQZgAAENRyYrQ4zfj+fVXsDEAn+8oQA1eBsPB424MbEkdRnwnJhTGMpcQqeq06mI3TJ2ocLnyCF/PTgJvhz0X6TstwnF1kSHIWBKE5FFN77DBs+f8RyATo3nKRv0bSBCURExVYwCTOe3JHeby08TtWwE3y4JmIH33Njmxo+CFD8JBel4TwDcCvFdNqn77Q7WApMDDPh64nKrbuFpJXGC7RflmgtkaeODJVPIHNnPF3jTxVI+rphbfxZwdlQAoUIal4p0epDE0X+odwRA227VTEhWXDx3HIkuQti8Z/cXSrQOAE8XMuiOnp3lac8rJMOkxdBeTHVK3z6mb0bLzKxM3vWjjWysfYAbXZ2STZZsuuv1r2HvC19kHA2RJGcsO+yeYMmC40vWynZFmI9blOCENk5d60dJNp7Dn5Vp0OHphTMct2T1rnpyOb96JDfkkVAYcc5nBgSkVZ4QIpjfhGKoceF/ZQY3fbb38xUbQRqbXyfycThvchx31L1pDCcQXP4DqQ1TQL9jBYJuAHgO6e4qc0/z7S4r1xyvUb16dr7A/07tlXRnVOFdZsL8J9aTcKrqWi4PdUG3QEEpX00joirQTYrvAXv82HNAYDwgJFFPlIhz11DBKAFPRiZBgP1vsFISMUrqsV6B/IpXbtv1R9NAcVpinAPC/EhpB5eOfFEaPJ5mfW6RuyuXmi8RGyiTPenplAWfkEVZJiXT1HwQH/l8MF2v3Nqj2xA34fZNH/FgDZ3A+xrR2FCclRvvGMVUG/ENOoeRyM6CvqJ0WThc2sGbcFrUY5ROokBc2cCKfUiZnR0LE4qmt1puMiXsIQvxFIw22bR0pd5J2qYz/VNA7yqU0hSS++c8WLKDI36YtVtLHCAtNLjBEADBgZS83Ar/aD2nCzgVcyepY2HL9bBWZQTKjadyNOBfpr0roTaQcjo15mCI5X1kVUAdPuV7lLWBEwv0ecHeXnW+Va5D3181uuuHd6PPwF0S3kihoSu3LlDtHrlHd6no8WOf2KzD/cJN3Z59BjEq2Su+WUEonsWDf8Y0zxrxl908i3igskY9GDsoobAVkUnfu7UIE/Aw==	M.C505_BL2.0.U.-CnZqf!HxFk6dXLoOlO9lOpVP7RS59kWVaMDss9RIVAE7uO!f0aoxg92zoQ5B4TCwCNMbvK6yX7quYXIvtkvyfpyXV8!q5gBkBZMA5NWb01Nbdq!Awx0TZMviyFWjJ1WjRP28!Zc5t57nFrDPv!7Q48rqD2!Kn1WMmVIOFhkLAYY4yzriPCvCPdbIEvEevmZE7hdwY!*CR0PJ7u2HXojsWEIHWVJVV8d3!*wCKfQjWJky0JxwUp*C*Hy6aPn4mqNY2ketIqWF49qHcHmX4NTNiPHh99kq1GthYsvOqhn44o9ZXK3Al9kI42iLPpbHsrWsnh9nCT1hlB6cKfv1XZbFMyU4ANCo9CuUipkPIWlRClQie8sMHQd5H0X*F0a4qGlEFQ$$	\N
\.


--
-- Data for Name: windows_user_links; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.windows_user_links (id, cloud_username, windows_username, sync_enabled, sync_desktop, sync_documents, sync_downloads, linked_at, last_sync) FROM stdin;
1	administrador	Administrador	t	t	f	f	2026-04-19 16:39:15.602271	2026-04-23 10:34:49.741
2	eric	eric	t	t	t	t	2026-04-20 09:51:22.911992	2026-04-23 10:12:31.258
\.


--
-- Name: admin_inbox_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_inbox_id_seq', 1, false);


--
-- Name: ai_exclusions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ai_exclusions_id_seq', 4, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 625, true);


--
-- Name: calendar_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.calendar_events_id_seq', 235633, true);


--
-- Name: event_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.event_attachments_id_seq', 1, false);


--
-- Name: files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.files_id_seq', 2194, true);


--
-- Name: folder_metadata_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.folder_metadata_id_seq', 3, true);


--
-- Name: folders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.folders_id_seq', 1, false);


--
-- Name: groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.groups_id_seq', 2, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 14, true);


--
-- Name: rdp_connections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rdp_connections_id_seq', 2, true);


--
-- Name: roadmap_activity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_activity_id_seq', 6, true);


--
-- Name: roadmap_calendar_links_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_calendar_links_id_seq', 1, false);


--
-- Name: roadmap_columns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_columns_id_seq', 5, true);


--
-- Name: roadmap_comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_comments_id_seq', 1, false);


--
-- Name: roadmap_custom_field_values_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_custom_field_values_id_seq', 1, false);


--
-- Name: roadmap_custom_fields_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_custom_fields_id_seq', 1, false);


--
-- Name: roadmap_filters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_filters_id_seq', 1, false);


--
-- Name: roadmap_issue_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_issue_documents_id_seq', 1, false);


--
-- Name: roadmap_issue_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_issue_events_id_seq', 1, false);


--
-- Name: roadmap_issue_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_issue_history_id_seq', 5, true);


--
-- Name: roadmap_issue_links_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_issue_links_id_seq', 1, false);


--
-- Name: roadmap_issues_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_issues_id_seq', 2, true);


--
-- Name: roadmap_milestones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_milestones_id_seq', 1, false);


--
-- Name: roadmap_projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_projects_id_seq', 1, true);


--
-- Name: roadmap_sprint_burndown_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_sprint_burndown_id_seq', 1, false);


--
-- Name: roadmap_sprints_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_sprints_id_seq', 1, false);


--
-- Name: roadmap_subtasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_subtasks_id_seq', 1, false);


--
-- Name: roadmap_time_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roadmap_time_logs_id_seq', 1, false);


--
-- Name: security_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.security_settings_id_seq', 1, true);


--
-- Name: shared_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.shared_files_id_seq', 9, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 5, true);


--
-- Name: windows_user_links_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.windows_user_links_id_seq', 2, true);


--
-- Name: admin_inbox admin_inbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_inbox
    ADD CONSTRAINT admin_inbox_pkey PRIMARY KEY (id);


--
-- Name: ai_exclusions ai_exclusions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_exclusions
    ADD CONSTRAINT ai_exclusions_pkey PRIMARY KEY (id);


--
-- Name: ai_exclusions ai_exclusions_username_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_exclusions
    ADD CONSTRAINT ai_exclusions_username_path_key UNIQUE (username, path);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: calendar_events calendar_events_microsoft_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_microsoft_id_key UNIQUE (microsoft_id);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: event_attachments event_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_attachments
    ADD CONSTRAINT event_attachments_pkey PRIMARY KEY (id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: folder_metadata folder_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folder_metadata
    ADD CONSTRAINT folder_metadata_pkey PRIMARY KEY (id);


--
-- Name: folder_metadata folder_metadata_username_folder_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folder_metadata
    ADD CONSTRAINT folder_metadata_username_folder_path_key UNIQUE (username, folder_path);


--
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- Name: group_members group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_pkey PRIMARY KEY (group_id, user_id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: rdp_connections rdp_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rdp_connections
    ADD CONSTRAINT rdp_connections_pkey PRIMARY KEY (id);


--
-- Name: rdp_settings rdp_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rdp_settings
    ADD CONSTRAINT rdp_settings_pkey PRIMARY KEY (setting_key);


--
-- Name: roadmap_activity roadmap_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_activity
    ADD CONSTRAINT roadmap_activity_pkey PRIMARY KEY (id);


--
-- Name: roadmap_calendar_links roadmap_calendar_links_calendar_event_id_issue_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_calendar_links
    ADD CONSTRAINT roadmap_calendar_links_calendar_event_id_issue_id_key UNIQUE (calendar_event_id, issue_id);


--
-- Name: roadmap_calendar_links roadmap_calendar_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_calendar_links
    ADD CONSTRAINT roadmap_calendar_links_pkey PRIMARY KEY (id);


--
-- Name: roadmap_columns roadmap_columns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_columns
    ADD CONSTRAINT roadmap_columns_pkey PRIMARY KEY (id);


--
-- Name: roadmap_comments roadmap_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_comments
    ADD CONSTRAINT roadmap_comments_pkey PRIMARY KEY (id);


--
-- Name: roadmap_custom_field_values roadmap_custom_field_values_issue_id_field_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_custom_field_values
    ADD CONSTRAINT roadmap_custom_field_values_issue_id_field_id_key UNIQUE (issue_id, field_id);


--
-- Name: roadmap_custom_field_values roadmap_custom_field_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_custom_field_values
    ADD CONSTRAINT roadmap_custom_field_values_pkey PRIMARY KEY (id);


--
-- Name: roadmap_custom_fields roadmap_custom_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_custom_fields
    ADD CONSTRAINT roadmap_custom_fields_pkey PRIMARY KEY (id);


--
-- Name: roadmap_filters roadmap_filters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_filters
    ADD CONSTRAINT roadmap_filters_pkey PRIMARY KEY (id);


--
-- Name: roadmap_issue_documents roadmap_issue_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issue_documents
    ADD CONSTRAINT roadmap_issue_documents_pkey PRIMARY KEY (id);


--
-- Name: roadmap_issue_events roadmap_issue_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issue_events
    ADD CONSTRAINT roadmap_issue_events_pkey PRIMARY KEY (id);


--
-- Name: roadmap_issue_history roadmap_issue_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issue_history
    ADD CONSTRAINT roadmap_issue_history_pkey PRIMARY KEY (id);


--
-- Name: roadmap_issue_links roadmap_issue_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issue_links
    ADD CONSTRAINT roadmap_issue_links_pkey PRIMARY KEY (id);


--
-- Name: roadmap_issue_links roadmap_issue_links_source_issue_id_target_issue_id_link_ty_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issue_links
    ADD CONSTRAINT roadmap_issue_links_source_issue_id_target_issue_id_link_ty_key UNIQUE (source_issue_id, target_issue_id, link_type);


--
-- Name: roadmap_issues roadmap_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issues
    ADD CONSTRAINT roadmap_issues_pkey PRIMARY KEY (id);


--
-- Name: roadmap_members roadmap_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_members
    ADD CONSTRAINT roadmap_members_pkey PRIMARY KEY (project_id, user_id);


--
-- Name: roadmap_milestones roadmap_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_milestones
    ADD CONSTRAINT roadmap_milestones_pkey PRIMARY KEY (id);


--
-- Name: roadmap_projects roadmap_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_projects
    ADD CONSTRAINT roadmap_projects_pkey PRIMARY KEY (id);


--
-- Name: roadmap_sprint_burndown roadmap_sprint_burndown_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_sprint_burndown
    ADD CONSTRAINT roadmap_sprint_burndown_pkey PRIMARY KEY (id);


--
-- Name: roadmap_sprints roadmap_sprints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_sprints
    ADD CONSTRAINT roadmap_sprints_pkey PRIMARY KEY (id);


--
-- Name: roadmap_subtasks roadmap_subtasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_subtasks
    ADD CONSTRAINT roadmap_subtasks_pkey PRIMARY KEY (id);


--
-- Name: roadmap_time_logs roadmap_time_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_time_logs
    ADD CONSTRAINT roadmap_time_logs_pkey PRIMARY KEY (id);


--
-- Name: roadmap_user_access roadmap_user_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_user_access
    ADD CONSTRAINT roadmap_user_access_pkey PRIMARY KEY (user_id);


--
-- Name: roadmap_watchers roadmap_watchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_watchers
    ADD CONSTRAINT roadmap_watchers_pkey PRIMARY KEY (issue_id, user_id);


--
-- Name: security_settings security_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_settings
    ADD CONSTRAINT security_settings_pkey PRIMARY KEY (id);


--
-- Name: security_settings security_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_settings
    ADD CONSTRAINT security_settings_user_id_key UNIQUE (user_id);


--
-- Name: shared_files shared_files_path_owner_username_shared_with_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_files
    ADD CONSTRAINT shared_files_path_owner_username_shared_with_username_key UNIQUE (path, owner_username, shared_with_username);


--
-- Name: shared_files shared_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_files
    ADD CONSTRAINT shared_files_pkey PRIMARY KEY (id);


--
-- Name: user_credentials user_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_credentials
    ADD CONSTRAINT user_credentials_pkey PRIMARY KEY (user_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: windows_user_links windows_user_links_cloud_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.windows_user_links
    ADD CONSTRAINT windows_user_links_cloud_username_key UNIQUE (cloud_username);


--
-- Name: windows_user_links windows_user_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.windows_user_links
    ADD CONSTRAINT windows_user_links_pkey PRIMARY KEY (id);


--
-- Name: windows_user_links windows_user_links_windows_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.windows_user_links
    ADD CONSTRAINT windows_user_links_windows_username_key UNIQUE (windows_username);


--
-- Name: admin_inbox admin_inbox_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_inbox
    ADD CONSTRAINT admin_inbox_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: calendar_events calendar_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: files files_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folders(id);


--
-- Name: files files_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: folders folders_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: folders folders_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.folders(id);


--
-- Name: group_members group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: group_members group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: roadmap_activity roadmap_activity_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_activity
    ADD CONSTRAINT roadmap_activity_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.roadmap_projects(id) ON DELETE CASCADE;


--
-- Name: roadmap_calendar_links roadmap_calendar_links_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_calendar_links
    ADD CONSTRAINT roadmap_calendar_links_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.roadmap_issues(id) ON DELETE CASCADE;


--
-- Name: roadmap_calendar_links roadmap_calendar_links_linked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_calendar_links
    ADD CONSTRAINT roadmap_calendar_links_linked_by_fkey FOREIGN KEY (linked_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: roadmap_columns roadmap_columns_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_columns
    ADD CONSTRAINT roadmap_columns_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.roadmap_projects(id) ON DELETE CASCADE;


--
-- Name: roadmap_comments roadmap_comments_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_comments
    ADD CONSTRAINT roadmap_comments_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.roadmap_issues(id) ON DELETE CASCADE;


--
-- Name: roadmap_comments roadmap_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_comments
    ADD CONSTRAINT roadmap_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: roadmap_custom_field_values roadmap_custom_field_values_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_custom_field_values
    ADD CONSTRAINT roadmap_custom_field_values_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.roadmap_custom_fields(id) ON DELETE CASCADE;


--
-- Name: roadmap_custom_field_values roadmap_custom_field_values_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_custom_field_values
    ADD CONSTRAINT roadmap_custom_field_values_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.roadmap_issues(id) ON DELETE CASCADE;


--
-- Name: roadmap_custom_fields roadmap_custom_fields_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_custom_fields
    ADD CONSTRAINT roadmap_custom_fields_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.roadmap_projects(id) ON DELETE CASCADE;


--
-- Name: roadmap_filters roadmap_filters_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_filters
    ADD CONSTRAINT roadmap_filters_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.roadmap_projects(id) ON DELETE CASCADE;


--
-- Name: roadmap_filters roadmap_filters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_filters
    ADD CONSTRAINT roadmap_filters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: roadmap_issue_documents roadmap_issue_documents_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issue_documents
    ADD CONSTRAINT roadmap_issue_documents_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.roadmap_issues(id) ON DELETE CASCADE;


--
-- Name: roadmap_issue_documents roadmap_issue_documents_linked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issue_documents
    ADD CONSTRAINT roadmap_issue_documents_linked_by_fkey FOREIGN KEY (linked_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: roadmap_issue_events roadmap_issue_events_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issue_events
    ADD CONSTRAINT roadmap_issue_events_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.roadmap_issues(id) ON DELETE CASCADE;


--
-- Name: roadmap_issue_history roadmap_issue_history_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issue_history
    ADD CONSTRAINT roadmap_issue_history_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.roadmap_issues(id) ON DELETE CASCADE;


--
-- Name: roadmap_issue_history roadmap_issue_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issue_history
    ADD CONSTRAINT roadmap_issue_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: roadmap_issue_links roadmap_issue_links_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issue_links
    ADD CONSTRAINT roadmap_issue_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: roadmap_issue_links roadmap_issue_links_source_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issue_links
    ADD CONSTRAINT roadmap_issue_links_source_issue_id_fkey FOREIGN KEY (source_issue_id) REFERENCES public.roadmap_issues(id) ON DELETE CASCADE;


--
-- Name: roadmap_issue_links roadmap_issue_links_target_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issue_links
    ADD CONSTRAINT roadmap_issue_links_target_issue_id_fkey FOREIGN KEY (target_issue_id) REFERENCES public.roadmap_issues(id) ON DELETE CASCADE;


--
-- Name: roadmap_issues roadmap_issues_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issues
    ADD CONSTRAINT roadmap_issues_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: roadmap_issues roadmap_issues_column_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issues
    ADD CONSTRAINT roadmap_issues_column_id_fkey FOREIGN KEY (column_id) REFERENCES public.roadmap_columns(id) ON DELETE CASCADE;


--
-- Name: roadmap_issues roadmap_issues_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issues
    ADD CONSTRAINT roadmap_issues_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: roadmap_issues roadmap_issues_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issues
    ADD CONSTRAINT roadmap_issues_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.roadmap_issues(id) ON DELETE CASCADE;


--
-- Name: roadmap_issues roadmap_issues_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issues
    ADD CONSTRAINT roadmap_issues_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.roadmap_projects(id) ON DELETE CASCADE;


--
-- Name: roadmap_issues roadmap_issues_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_issues
    ADD CONSTRAINT roadmap_issues_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: roadmap_members roadmap_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_members
    ADD CONSTRAINT roadmap_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.roadmap_projects(id) ON DELETE CASCADE;


--
-- Name: roadmap_members roadmap_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_members
    ADD CONSTRAINT roadmap_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: roadmap_milestones roadmap_milestones_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_milestones
    ADD CONSTRAINT roadmap_milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.roadmap_projects(id) ON DELETE CASCADE;


--
-- Name: roadmap_projects roadmap_projects_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_projects
    ADD CONSTRAINT roadmap_projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: roadmap_sprint_burndown roadmap_sprint_burndown_sprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_sprint_burndown
    ADD CONSTRAINT roadmap_sprint_burndown_sprint_id_fkey FOREIGN KEY (sprint_id) REFERENCES public.roadmap_sprints(id) ON DELETE CASCADE;


--
-- Name: roadmap_sprints roadmap_sprints_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_sprints
    ADD CONSTRAINT roadmap_sprints_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: roadmap_sprints roadmap_sprints_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_sprints
    ADD CONSTRAINT roadmap_sprints_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.roadmap_projects(id) ON DELETE CASCADE;


--
-- Name: roadmap_subtasks roadmap_subtasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_subtasks
    ADD CONSTRAINT roadmap_subtasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: roadmap_subtasks roadmap_subtasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_subtasks
    ADD CONSTRAINT roadmap_subtasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: roadmap_subtasks roadmap_subtasks_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_subtasks
    ADD CONSTRAINT roadmap_subtasks_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.roadmap_issues(id) ON DELETE CASCADE;


--
-- Name: roadmap_time_logs roadmap_time_logs_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_time_logs
    ADD CONSTRAINT roadmap_time_logs_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.roadmap_issues(id) ON DELETE CASCADE;


--
-- Name: roadmap_time_logs roadmap_time_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_time_logs
    ADD CONSTRAINT roadmap_time_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: roadmap_user_access roadmap_user_access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_user_access
    ADD CONSTRAINT roadmap_user_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: roadmap_watchers roadmap_watchers_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_watchers
    ADD CONSTRAINT roadmap_watchers_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.roadmap_issues(id) ON DELETE CASCADE;


--
-- Name: roadmap_watchers roadmap_watchers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_watchers
    ADD CONSTRAINT roadmap_watchers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: security_settings security_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_settings
    ADD CONSTRAINT security_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_credentials user_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_credentials
    ADD CONSTRAINT user_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict zFSUjsrxJHGCwqlA4NXAG4ijqATZeTscsfzDPs5c8t2qe2NnwZb6uMhV1NnuAXj

