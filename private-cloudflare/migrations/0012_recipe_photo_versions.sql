-- Photos belong to immutable recipe versions, not to the user's historical meals.
-- Keep binary media private in D1; no public object URLs or embedded base64 in git.
CREATE TABLE IF NOT EXISTS recipe_photo_versions (
  recipe_id TEXT PRIMARY KEY,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 12 AND 900000),
  image_data BLOB NOT NULL,
  created_at TEXT NOT NULL,
  origin_recipe_id TEXT NOT NULL
);
