-- Create LDAP configuration table
CREATE TABLE IF NOT EXISTS ldap_config (
    id SERIAL PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT false,
    server_url VARCHAR(500) NOT NULL,
    bind_dn VARCHAR(500) NOT NULL,
    bind_password VARCHAR(500) NOT NULL,
    user_search_base VARCHAR(500) NOT NULL,
    user_search_filter VARCHAR(500) NOT NULL DEFAULT '(uid={0})',
    group_search_base VARCHAR(500),
    group_search_filter VARCHAR(500),
    use_ssl BOOLEAN NOT NULL DEFAULT false,
    use_tls BOOLEAN NOT NULL DEFAULT true,
    skip_verify BOOLEAN NOT NULL DEFAULT false,
    timeout_seconds INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ldap_config_enabled ON ldap_config(enabled);

-- Insert default disabled config
INSERT INTO ldap_config (enabled, server_url, bind_dn, bind_password, user_search_base, use_ssl, use_tls)
VALUES (false, 'ldap://localhost:389', 'cn=admin,dc=example,dc=com', '', 'ou=users,dc=example,dc=com', false, true)
ON CONFLICT DO NOTHING;

