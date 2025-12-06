-- Create environment_tags table
CREATE TABLE IF NOT EXISTS environment_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#3b82f6', -- Default blue color
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create cluster_environment_tags junction table (many-to-many)
CREATE TABLE IF NOT EXISTS cluster_environment_tags (
    cluster_id INTEGER NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES environment_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cluster_id, tag_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cluster_environment_tags_cluster_id ON cluster_environment_tags(cluster_id);
CREATE INDEX IF NOT EXISTS idx_cluster_environment_tags_tag_id ON cluster_environment_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_environment_tags_name ON environment_tags(name);

-- Insert default environment tags
INSERT INTO environment_tags (name, color, description) VALUES
    ('Prod', '#ef4444', 'Production environment'),
    ('Dev', '#3b82f6', 'Development environment'),
    ('Test', '#f59e0b', 'Testing environment'),
    ('Staging', '#8b5cf6', 'Staging environment'),
    ('QA', '#10b981', 'Quality Assurance environment')
ON CONFLICT (name) DO NOTHING;

