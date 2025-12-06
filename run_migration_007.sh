#!/bin/bash
# Run migration 007 manually
docker-compose exec -T postgres psql -U keycloak_admin -d keycloak_multi << EOF
-- Add client_id and client_secret columns
ALTER TABLE clusters 
ADD COLUMN IF NOT EXISTS client_id VARCHAR(255) DEFAULT 'multi-manage',
ADD COLUMN IF NOT EXISTS client_secret VARCHAR(500);

-- Make username and password nullable (for backward compatibility during migration)
ALTER TABLE clusters 
ALTER COLUMN username DROP NOT NULL,
ALTER COLUMN password DROP NOT NULL;

-- Create index on client_id
CREATE INDEX IF NOT EXISTS idx_clusters_client_id ON clusters(client_id);
EOF



