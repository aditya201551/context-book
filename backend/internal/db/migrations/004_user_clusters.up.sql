CREATE TABLE IF NOT EXISTS user_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    color TEXT NOT NULL DEFAULT 'amber',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_clusters_user_id ON user_clusters(user_id);
