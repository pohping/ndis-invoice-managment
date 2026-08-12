insert into gender (code, label)
values
  ('MALE', 'Male'),
  ('FEMALE', 'Female'),
  ('UNIDENTIFIED', 'Unidentified')
on conflict (code) do nothing;

insert into rate_set_support_item_pricing_region (code, label, full_label)
values
  ('ACT', 'ACT', 'Australian Capital Territory'),
  ('NSW', 'NSW', 'New South Wales'),
  ('NT', 'NT', 'Northern Territory'),
  ('QLD', 'QLD', 'Queensland'),
  ('SA', 'SA', 'South Australia'),
  ('TAS', 'TAS', 'Tasmania'),
  ('VIC', 'VIC', 'Victoria'),
  ('WA', 'WA', 'Western Australia'),
  ('REMOTE', 'Remote', 'Remote'),
  ('VERY_REMOTE', 'Very Remote', 'Very Remote')
ON conflict (code) do nothing;

insert into rbac_permission (code, label)
values
    ('clients.read', 'Read clients'),
    ('clients.write', 'Add or edit clients'),
    ('clients.delete', 'Delete clients'),
    ('providers.read', 'Read providers'),
    ('providers.write', 'Add or edit providers'),
    ('providers.delete', 'Delete providers'),
    ('rate_sets.read', 'Read rate sets'),
    ('rate_sets.write', 'Add or edit rate sets'),
    ('rate_sets.delete', 'Delete rate sets'),
    ('rate_sets.import', 'Import rate sets'),
    ('invoices.read', 'Read invoices'),
    ('invoices.write', 'Add or edit invoices'),
    ('invoices.delete', 'Delete invoices'),
    ('invoices.uploads.manage', 'Manage all invoice uploads'),
    ('users.read', 'Read users'),
    ('users.write', 'Add or edit users'),
    ('users.delete', 'Delete users'),
    ('user_roles.read', 'Read user roles'),
    ('user_roles.write', 'Add or edit user roles'),
    ('user_roles.delete', 'Delete user roles'),
    ('genders.read', 'Read genders'),
    ('genders.write', 'Add or edit genders'),
    ('genders.delete', 'Delete genders'),
    ('auth_sessions.read', 'Read auth sessions'),
    ('auth_sessions.revoke', 'Revoke auth sessions'),
    ('auth_sessions.delete', 'Delete auth sessions'),
    ('audit_logs.read', 'Read audit logs')
on conflict (code) do nothing;

insert into rbac_role (code, label, is_default)
values
    ('SUPER_ADMIN', 'Super Admin', true),
    ('BILLING_OFFICER', 'Billing Officer', false),
    ('DATA_ENTRY', 'Data Entry', false),
    ('AUDITOR', 'Auditor', false)
on conflict (code) do nothing;

insert into rbac_user_role_permission (role_id, permission_id)
select r.id, p.id
from rbac_role r
cross join rbac_permission p
where r.code = 'SUPER_ADMIN'
on conflict do nothing;

insert into rbac_user_role_permission (role_id, permission_id)
select r.id, p.id
from rbac_role r
join rbac_permission p on p.code = any (array[
    'clients.read',
    'clients.write',
    'providers.read',
    'providers.write',
    'rate_sets.read',
    'invoices.read',
    'invoices.write',
    'invoices.uploads.manage',
    'genders.read',
    'genders.write'
])
where r.code = 'BILLING_OFFICER'
on conflict do nothing;

insert into rbac_user_role_permission (role_id, permission_id)
select r.id, p.id
from rbac_role r
join rbac_permission p on p.code = any (array[
    'clients.read',
    'providers.read',
    'invoices.read',
    'invoices.write',
    'invoices.uploads.manage'
])
where r.code = 'DATA_ENTRY'
on conflict do nothing;

insert into rbac_user_role_permission (role_id, permission_id)
select r.id, p.id
from rbac_role r
join rbac_permission p on p.code = any (array[
    'clients.read',
    'providers.read',
    'rate_sets.read',
    'invoices.read'
])
where r.code = 'AUDITOR'
on conflict do nothing;

insert into app_user (email, full_name, is_default)
select
    'test@wittydata.com',
    'Default Super Admin',
    true
where not exists (
    select 1
    from app_user
    where email = 'test@wittydata.com'
      and deleted_at is null
);

insert into auth_password (user_id, password_hash, password_updated_at)
select
    u.id,
    '$argon2id$v=19$m=65536,t=3,p=4$jcDkDE4DafhA58KdfmR/eA$X60K8MUvvruzSzy1FpJ8zILKslQMS3VI8m037hg3xWo',
    now()
from app_user u
where u.email = 'test@wittydata.com'
  and u.deleted_at is null
  and not exists (
      select 1
      from auth_password ap
      where ap.user_id = u.id
  );

insert into rbac_user_role (user_id, role_id)
select
    u.id,
    r.id
from app_user u
cross join rbac_role r
where u.email = 'test@wittydata.com'
  and u.deleted_at is null
  and r.code = 'SUPER_ADMIN'
on conflict (user_id, role_id) do nothing;
