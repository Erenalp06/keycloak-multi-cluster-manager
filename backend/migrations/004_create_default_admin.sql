-- Create default admin user if it doesn't exist
-- Password: admin123 (bcrypt hash)
-- You should change this password after first login!
-- Hash generated with: bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
INSERT INTO users (username, email, password_hash, role, created_at, updated_at)
SELECT 'admin', 'admin@keycloak-multi-manage.local', '$2a$10$O.aOvwzedwwvEEqRtfz44ev/oeLtsnDAfFA7VpNOetf9dt3H6J95y', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

