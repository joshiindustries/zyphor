-- Enable UUID generation
create extension if not exists pgcrypto;

create table if not exists public."users" (
  "id" uuid primary key default gen_random_uuid(),
  "email" text not null unique,
  "password_hash" text,
  "name" text,
  "avatar" text,
  "dob" text,
  "username" text unique,
  "bio" text,
  "theme_preference" text default 'system',
  "language_preference" text default 'en',
  "profile_visibility" text default 'public',
  "online_status" text default 'online',
  "show_last_seen" boolean not null default true,
  "read_receipts" boolean not null default true,
  "created_at" timestamptz not null default now()
);


create table if not exists public."accounts" (
  "id" uuid primary key default gen_random_uuid(),
  "userId" uuid not null,
  "type" text not null,
  "provider" uuid not null,
  "providerAccountId" text not null,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text
);

alter table public."accounts" add unique ("provider", "providerAccountId");

create table if not exists public."sessions" (
  "id" uuid primary key default gen_random_uuid(),
  "token" text not null unique,
  "user_id" uuid not null,
  "expires_at" timestamptz not null
);


create table if not exists public."links" (
  "id" uuid primary key,
  "user_id" uuid not null,
  "expires_at" timestamptz not null,
  "max_downloads" integer not null default 0,
  "current_downloads" integer not null default 0,
  "allow_save" integer not null default 1,
  "auth_required" integer not null default 0,
  "created_at" timestamptz not null default now()
);


create table if not exists public."saved_links" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null,
  "link_id" uuid not null,
  "saved_at" timestamptz not null default now()
);

alter table public."saved_links" add unique ("user_id", "link_id");

create table if not exists public."files" (
  "id" uuid primary key default gen_random_uuid(),
  "link_id" uuid not null,
  "original_name" text not null,
  "size" integer not null,
  "storage_path" text not null,
  "salt" text not null,
  "iv" text not null
);


create table if not exists public."download_logs" (
  "id" uuid primary key default gen_random_uuid(),
  "link_id" uuid not null,
  "file_id" uuid not null,
  "user_id" uuid not null,
  "ip_address" text,
  "downloaded_at" timestamptz not null default now()
);

create index if not exists idx_download_logs_link_id_downloaded_at on public."download_logs"("link_id", "downloaded_at");
create index if not exists idx_download_logs_user_id_downloaded_at on public."download_logs"("user_id", "downloaded_at");

create table if not exists public."signals" (
  "id" uuid primary key default gen_random_uuid(),
  "channel_id" uuid not null,
  "sender" text not null,
  "type" text not null,
  "data" text not null,
  "timestamp" bigint not null,
  "created_at" timestamptz not null default now()
);

create index if not exists idx_signals_channel_id_timestamp on public."signals"("channel_id", "timestamp");

create table if not exists public."rate_limits" (
  "id" uuid primary key default gen_random_uuid(),
  "identifier" uuid not null,
  "action" text not null,
  "expires_at" timestamptz not null,
  "created_at" timestamptz not null default now()
);

create index if not exists idx_rate_limits_identifier_action on public."rate_limits"("identifier", "action");

create table if not exists public."user_keys" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null,
  "public_key" text not null,
  "created_at" timestamptz not null default now()
);

create index if not exists idx_user_keys_user_id on public."user_keys"("user_id");

create table if not exists public."conversations" (
  "id" uuid primary key default gen_random_uuid(),
  "user1_id" uuid not null,
  "user2_id" uuid not null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null
);

alter table public."conversations" add unique ("user1_id", "user2_id");

create table if not exists public."messages" (
  "id" uuid primary key default gen_random_uuid(),
  "conversation_id" uuid not null,
  "sender_id" uuid not null,
  "encrypted_content" text not null,
  "reply_to_id" uuid,
  "is_edited" boolean not null default false,
  "is_deleted" boolean not null default false,
  "reactions" text,
  "created_at" timestamptz not null default now()
);

create index if not exists idx_messages_conversation_id_created_at on public."messages"("conversation_id", "created_at");

create table if not exists public."groups" (
  "id" uuid primary key default gen_random_uuid(),
  "name" text not null,
  "description" text,
  "avatar" text,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null
);


create table if not exists public."group_members" (
  "id" uuid primary key default gen_random_uuid(),
  "group_id" uuid not null,
  "user_id" uuid not null,
  "role" text not null default 'MEMBER',
  "encrypted_group_key" text not null,
  "joined_at" timestamptz not null default now()
);

alter table public."group_members" add unique ("group_id", "user_id");

create table if not exists public."group_messages" (
  "id" uuid primary key default gen_random_uuid(),
  "group_id" uuid not null,
  "sender_id" uuid not null,
  "encrypted_content" text not null,
  "reply_to_id" uuid,
  "is_edited" boolean not null default false,
  "is_deleted" boolean not null default false,
  "reactions" text,
  "created_at" timestamptz not null default now()
);

create index if not exists idx_group_messages_group_id_created_at on public."group_messages"("group_id", "created_at");

create table if not exists public."chat_attachments" (
  "id" uuid primary key default gen_random_uuid(),
  "message_id" uuid,
  "group_message_id" uuid,
  "storage_path" text not null,
  "mime_type" text not null,
  "size" integer not null,
  "created_at" timestamptz not null default now()
);

create index if not exists idx_chat_attachments_message_id on public."chat_attachments"("message_id");
create index if not exists idx_chat_attachments_group_message_id on public."chat_attachments"("group_message_id");

create table if not exists public."vault_folders" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null,
  "parent_id" uuid,
  "encrypted_name" text not null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null
);


create table if not exists public."vault_files" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null,
  "folder_id" uuid,
  "encrypted_metadata" text not null,
  "storage_path" text not null,
  "is_trashed" boolean not null default false,
  "is_favorite" boolean not null default false,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null
);


create table if not exists public."file_versions" (
  "id" uuid primary key default gen_random_uuid(),
  "file_id" uuid not null,
  "storage_path" text not null,
  "encrypted_metadata" text not null,
  "created_at" timestamptz not null default now()
);


create table if not exists public."vault_tags" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null,
  "encrypted_name" text not null,
  "color" text,
  "created_at" timestamptz not null default now()
);


create table if not exists public."cloud_connections" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null,
  "provider" text not null,
  "name" text not null,
  "encrypted_credentials" text not null,
  "is_default" boolean not null default false,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  constraint "cloud_connections_user_id_fkey" foreign key ("user_id") references public."users"("id") on delete cascade
);

create index if not exists idx_cloud_connections_user_id_provider on public."cloud_connections"("user_id", "provider");
create table if not exists public."calls" (
  "id" uuid primary key default gen_random_uuid(),
  "conversation_id" uuid not null,
  "caller_id" uuid not null,
  "media_type" text not null default 'VIDEO',
  "status" text not null default 'RINGING',
  "started_at" timestamptz not null default now(),
  "ended_at" timestamptz
);


create table if not exists public."call_signals" (
  "id" uuid primary key default gen_random_uuid(),
  "call_id" uuid not null,
  "sender_id" uuid not null,
  "type" text not null,
  "payload" text not null,
  "created_at" timestamptz not null default now()
);

create index if not exists idx_call_signals_call_id_created_at on public."call_signals"("call_id", "created_at");

create table if not exists public."notes" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null,
  "encrypted_title" text not null,
  "encrypted_content" text not null,
  "is_pinned" boolean not null default false,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null
);


create table if not exists public."note_shares" (
  "id" uuid primary key default gen_random_uuid(),
  "note_id" uuid not null,
  "shared_with_user_id" uuid not null,
  "encrypted_note_key" text not null,
  "access_level" text not null default 'READ',
  "created_at" timestamptz not null default now()
);

alter table public."note_shares" add unique ("note_id", "shared_with_user_id");

create table if not exists public."task_boards" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null,
  "encrypted_title" text not null,
  "created_at" timestamptz not null default now()
);


create table if not exists public."task_columns" (
  "id" uuid primary key default gen_random_uuid(),
  "board_id" uuid not null,
  "name" text not null,
  "order" integer not null
);


create table if not exists public."tasks" (
  "id" uuid primary key default gen_random_uuid(),
  "column_id" uuid not null,
  "encrypted_title" text not null,
  "encrypted_description" text,
  "order" integer not null,
  "due_date" timestamptz,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null
);


create table if not exists public."event_calendars" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null,
  "encrypted_name" text not null,
  "color_hex" text not null default '#e74c3c',
  "created_at" timestamptz not null default now()
);


create table if not exists public."events" (
  "id" uuid primary key default gen_random_uuid(),
  "calendar_id" uuid not null,
  "encrypted_title" text not null,
  "encrypted_description" text,
  "encrypted_location" text,
  "start_time" timestamptz not null,
  "end_time" timestamptz not null,
  "is_all_day" boolean not null default false,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null
);


create table if not exists public."login_history" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null,
  "ip_address" text,
  "location" text,
  "os" text,
  "browser" text,
  "status" text not null default 'SUCCESS',
  "created_at" timestamptz not null default now()
);


create table if not exists public."trusted_devices" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null,
  "device_id" uuid not null unique,
  "name" text,
  "os" text,
  "browser" text,
  "last_active" timestamptz not null default now(),
  "created_at" timestamptz not null default now()
);


create table if not exists public."security_alerts" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null,
  "type" text not null,
  "message" text not null,
  "severity" text not null default 'INFO',
  "read" boolean not null default false,
  "created_at" timestamptz not null default now()
);


create table if not exists public."password_entries" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null,
  "encrypted_data" text not null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null
);

