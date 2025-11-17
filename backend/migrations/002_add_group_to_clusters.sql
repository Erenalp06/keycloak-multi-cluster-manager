ALTER TABLE clusters ADD COLUMN IF NOT EXISTS group_name VARCHAR(255) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_clusters_group_name ON clusters(group_name);

