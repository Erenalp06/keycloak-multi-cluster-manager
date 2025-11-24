-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- Create user_roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- Insert default permissions
INSERT INTO permissions (name, description) VALUES
    ('view_clusters', 'View clusters list'),
    ('view_cluster_detail', 'View single cluster details'),
    ('create_cluster', 'Create new clusters'),
    ('update_cluster', 'Update existing clusters'),
    ('delete_cluster', 'Delete clusters'),
    ('view_diff', 'View diff pages (roles, clients, groups, users)'),
    ('sync_items', 'Sync items between clusters'),
    ('view_users', 'View users list'),
    ('create_user', 'Create new users'),
    ('update_user', 'Update existing users'),
    ('delete_user', 'Delete users'),
    ('manage_roles', 'Manage roles and permissions'),
    ('view_settings', 'View settings page')
ON CONFLICT (name) DO NOTHING;

-- Create default admin role with all permissions
INSERT INTO roles (name, description) VALUES
    ('admin', 'Administrator with all permissions')
ON CONFLICT (name) DO NOTHING;

-- Assign all permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Create default user role with limited permissions
INSERT INTO roles (name, description) VALUES
    ('user', 'Regular user with limited permissions')
ON CONFLICT (name) DO NOTHING;

-- Assign limited permissions to user role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'user' 
  AND p.name IN ('view_clusters', 'view_cluster_detail', 'view_diff')
ON CONFLICT DO NOTHING;

-- Migrate existing users: admin users get admin role, others get user role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE (u.role = 'admin' AND r.name = 'admin')
   OR (u.role = 'user' AND r.name = 'user')
ON CONFLICT DO NOTHING;

