-- Assign roles to existing users who don't have any roles assigned
-- This ensures all users have proper permissions

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE r.name = CASE 
    WHEN u.role = 'admin' THEN 'admin'
    ELSE 'user'
END
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = u.id AND ur.role_id = r.id
)
ON CONFLICT DO NOTHING;

