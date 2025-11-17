#!/bin/bash
# Run migration manually
docker-compose exec -T postgres psql -U keycloak_admin -d keycloak_multi << EOF
ALTER TABLE clusters ADD COLUMN IF NOT EXISTS group_name VARCHAR(255) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_clusters_group_name ON clusters(group_name);
EOF

