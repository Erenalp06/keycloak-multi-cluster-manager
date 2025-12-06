-- Add certificate fields to ldap_config table
ALTER TABLE ldap_config 
ADD COLUMN IF NOT EXISTS certificate_pem TEXT,
ADD COLUMN IF NOT EXISTS certificate_info JSONB,
ADD COLUMN IF NOT EXISTS certificate_fingerprint VARCHAR(64);

-- Create index for certificate fingerprint
CREATE INDEX IF NOT EXISTS idx_ldap_config_cert_fingerprint ON ldap_config(certificate_fingerprint);


