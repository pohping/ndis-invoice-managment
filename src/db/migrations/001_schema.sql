CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS rate_set (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  description text,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT rate_set_valid_range_chk
    CHECK (end_date IS NULL OR start_date <= end_date),
  CONSTRAINT rate_set_no_overlap_excl
    EXCLUDE USING gist (
      tstzrange(start_date, coalesce(end_date, 'infinity'::timestamptz), '[]') WITH &&
    )
    WHERE (deleted_at IS NULL)
);

CREATE TABLE IF NOT EXISTS rate_set_category (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rate_set_id int NOT NULL REFERENCES rate_set(id),
  category_number text NOT NULL,
  category_name text NOT NULL,
  sorting int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz,
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS rsc_unique1_idx
  ON rate_set_category (rate_set_id, category_number)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS rsc_category_id
  ON rate_set_category (rate_set_id);

CREATE TABLE IF NOT EXISTS rate_set_support_item (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rate_set_id int NOT NULL REFERENCES rate_set(id),
  category_id int NOT NULL REFERENCES rate_set_category(id),
  item_number text NOT NULL,
  item_name text NOT NULL,
  unit text,
  sorting int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz,
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS rssi_unique1_idx
  ON rate_set_support_item (rate_set_id, category_id, item_number)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS rssi_rate_set_id
  ON rate_set_support_item (rate_set_id);

CREATE INDEX IF NOT EXISTS rssi_category_id
  ON rate_set_support_item (category_id);

CREATE TABLE IF NOT EXISTS rate_set_support_item_attribute_type (
  code text PRIMARY KEY,
  label text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz
);

CREATE TABLE IF NOT EXISTS rate_set_support_item_attribute (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  support_item_id int NOT NULL REFERENCES rate_set_support_item(id),
  attribute_code text NOT NULL REFERENCES rate_set_support_item_attribute_type(code),
  value boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (support_item_id, attribute_code)
);

CREATE INDEX IF NOT EXISTS rssia_category_support_item_id
  ON rate_set_support_item_attribute (support_item_id);

CREATE INDEX IF NOT EXISTS rssia_attribute_code
  ON rate_set_support_item_attribute (attribute_code);

CREATE TABLE IF NOT EXISTS rate_set_support_item_type (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz
);

CREATE TABLE IF NOT EXISTS rate_set_support_item_pricing_region (
  code text PRIMARY KEY,
  label text NOT NULL UNIQUE,
  full_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz
);

CREATE TABLE IF NOT EXISTS rate_set_support_item_price (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rate_set_id int NOT NULL REFERENCES rate_set(id),
  support_item_id int NOT NULL REFERENCES rate_set_support_item(id),
  type_id int REFERENCES rate_set_support_item_type(id),
  pricing_region_code text REFERENCES rate_set_support_item_pricing_region(code),
  unit_price numeric(24, 4),
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (
    rate_set_id,
    support_item_id,
    type_id,
    pricing_region_code,
    start_date,
    end_date
  )
);

CREATE INDEX IF NOT EXISTS rssip_category_support_item_id
  ON rate_set_support_item_price (support_item_id);

CREATE TABLE IF NOT EXISTS gender (
  id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz
);

CREATE TABLE IF NOT EXISTS client (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  name_parts text[] NOT NULL,
  gender_id smallint NOT NULL REFERENCES gender(id),
  dob date NOT NULL,
  ndis_number text NOT NULL,
  email text NOT NULL,
  phone_number text,
  address text NOT NULL,
  unit_building text,
  pricing_region text NOT NULL REFERENCES rate_set_support_item_pricing_region(code),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz,
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS client_unique_ndis_number
  ON client (ndis_number)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION client_set_name_parts()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.name_parts :=
    array_remove(
      regexp_split_to_array(
        trim(lower(concat_ws(' ', NEW.first_name, NEW.last_name))),
        '[^[:alnum:]]+'
      ),
      ''
    );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS client_set_name_parts ON client;

CREATE TRIGGER client_set_name_parts
BEFORE INSERT OR UPDATE OF first_name, last_name ON client
FOR EACH ROW
EXECUTE FUNCTION client_set_name_parts();

CREATE INDEX IF NOT EXISTS client_name_parts
  ON client USING gin (name_parts)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS provider (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  abn text NOT NULL,
  name text NOT NULL,
  name_parts text[] NOT NULL,
  email text,
  phone_number text,
  address text,
  unit_building text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz,
  deleted_at timestamptz
);

CREATE OR REPLACE FUNCTION provider_set_name_parts()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.name_parts :=
    array_remove(
      regexp_split_to_array(
        trim(lower(NEW.name)),
        '[^[:alnum:]]+'
      ),
      ''
    );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS provider_set_name_parts ON provider;

CREATE TRIGGER provider_set_name_parts
BEFORE INSERT OR UPDATE OF name ON provider
FOR EACH ROW
EXECUTE FUNCTION provider_set_name_parts();

CREATE INDEX IF NOT EXISTS provider_name_parts
  ON provider USING gin (name_parts)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS invoice (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id int REFERENCES client(id),
  provider_id int REFERENCES provider(id),
  invoice_number text
    CONSTRAINT invoice_number_trimmed
    CHECK (invoice_number IS NULL OR invoice_number = btrim(invoice_number)),
  invoice_date date,
  amount numeric(24, 4),
  expected_amount numeric(24, 4),
  status text NOT NULL DEFAULT 'drafted'
    CHECK (status IN ('drafted', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS invoice_unique_provider_invoice_number
  ON invoice (provider_id, lower(invoice_number))
  WHERE deleted_at IS NULL
    AND provider_id IS NOT NULL
    AND invoice_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invoice_unique_unmapped_invoice_number
  ON invoice (lower(invoice_number))
  WHERE deleted_at IS NULL
    AND provider_id IS NULL
    AND invoice_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS invoice_client_id
  ON invoice (client_id);

CREATE INDEX IF NOT EXISTS invoice_provider_id
  ON invoice (provider_id);

CREATE TABLE IF NOT EXISTS invoice_item (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invoice_id int NOT NULL REFERENCES invoice(id),
  rate_set_id int REFERENCES rate_set(id),
  category_id int REFERENCES rate_set_category(id),
  support_item_id int REFERENCES rate_set_support_item(id),
  start_date timestamptz,
  end_date timestamptz,
  max_rate numeric(24, 4),
  unit numeric(24, 4),
  input_rate numeric(24, 4),
  amount numeric(24, 4),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS invoice_item_invoice_id
  ON invoice_item (invoice_id);

CREATE INDEX IF NOT EXISTS invoice_item_invoice_sort_order
  ON invoice_item (invoice_id, sort_order, id);

CREATE INDEX IF NOT EXISTS invoice_item_rate_set_id
  ON invoice_item (rate_set_id);

CREATE INDEX IF NOT EXISTS invoice_item_category_id
  ON invoice_item (category_id);

CREATE INDEX IF NOT EXISTS invoice_item_support_item_id
  ON invoice_item (support_item_id);

create extension if not exists citext;
create extension if not exists pgcrypto;

create table app_user (
    id int generated always as identity primary key,
    email citext not null,
    full_name text not null,
    is_default boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deactivated_at timestamptz,
    deleted_at timestamptz
);

create unique index app_user_unique_email_idx
    on app_user (email)
    where deleted_at is null;

create table auth_password (
    user_id int primary key references app_user(id) on delete cascade,
    password_hash text not null,
    password_updated_at timestamptz not null default now()
);

create table rbac_role (
    id int generated always as identity primary key,
    code text not null unique,
    label text not null unique,
    is_default boolean not null default false,
    created_at timestamptz not null default now(),
    deactivated_at timestamptz
);

create table rbac_permission (
    id int generated always as identity primary key,
    code text not null unique,
    label text not null unique,
    created_at timestamptz not null default now()
);

create table rbac_user_role (
    user_id int not null references app_user(id) on delete cascade,
    role_id int not null references rbac_role(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, role_id)
);

create table rbac_user_role_permission (
    role_id int not null references rbac_role(id) on delete cascade,
    permission_id int not null references rbac_permission(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (role_id, permission_id)
);

create index rbac_user_role_role_idx on rbac_user_role (role_id);
create index rbac_user_role_permission_permission_idx on rbac_user_role_permission (permission_id);

create table auth_session (
    id uuid primary key default gen_random_uuid(),
    user_id int not null references app_user(id) on delete cascade,
    role_id int not null references rbac_role(id) on delete cascade,
    token_hash text not null unique,
    user_agent text,
    ip inet,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    created_at timestamptz not null default now()
);

create index auth_session_user_id_idx on auth_session (user_id);
create index auth_session_role_id_idx on auth_session (role_id);
create index auth_session_expires_at_idx on auth_session (expires_at);
create index auth_session_active_idx
    on auth_session (user_id, expires_at)
    where revoked_at is null;

create table audit_log (
    id bigserial primary key,
    actor_user_id int references app_user(id),
    actor_role_id int references rbac_role(id),
    action text not null,
    permission_code text references rbac_permission(code),
    entity text not null,
    entity_id text,
    payload jsonb,
    changes_diff jsonb,
    created_at timestamptz not null default now()
);

create index audit_log_actor_user_id_idx on audit_log (actor_user_id);
create index audit_log_actor_role_id_idx on audit_log (actor_role_id);
create index audit_log_action_idx on audit_log (action);
create index audit_log_permission_code_idx on audit_log (permission_code);
create index audit_log_created_at_idx on audit_log (created_at);

CREATE TABLE IF NOT EXISTS invoice_upload_batch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by int NOT NULL REFERENCES app_user(id),
  status text NOT NULL DEFAULT 'uploading'
    CONSTRAINT invoice_upload_batch_status_check
    CHECK (status IN (
      'uploading',
      'uploaded',
      'processing',
      'completed',
      'completed_with_errors',
      'failed'
    )),
  file_count int NOT NULL CHECK (file_count BETWEEN 1 AND 20),
  total_size bigint NOT NULL CHECK (total_size BETWEEN 1 AND 20971520),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_upload_file (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES invoice_upload_batch(id) ON DELETE CASCADE,
  original_name text NOT NULL,
  object_key text NOT NULL UNIQUE,
  content_type text NOT NULL,
  size bigint NOT NULL CHECK (size BETWEEN 1 AND 10485760),
  etag text NOT NULL,
  processing_status text NOT NULL DEFAULT 'queued'
    CONSTRAINT invoice_upload_file_processing_status_check
    CHECK (processing_status IN (
      'queued',
      'processing',
      'draft_created',
      'needs_review',
      'failed'
    )),
  attempt_count int NOT NULL DEFAULT 0,
  error_message text,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  extraction_result jsonb,
  invoice_id int REFERENCES invoice(id) ON DELETE SET NULL,
  ai_provider text
    CONSTRAINT invoice_upload_file_ai_provider_check
    CHECK (ai_provider IS NULL OR ai_provider IN ('openai', 'openrouter')),
  model text,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_upload_batch_uploaded_by
  ON invoice_upload_batch (uploaded_by);

CREATE INDEX IF NOT EXISTS invoice_upload_file_batch_id
  ON invoice_upload_file (batch_id);

CREATE INDEX IF NOT EXISTS invoice_upload_file_processing_status
  ON invoice_upload_file (processing_status);

CREATE INDEX IF NOT EXISTS invoice_upload_file_invoice_id
  ON invoice_upload_file (invoice_id);
