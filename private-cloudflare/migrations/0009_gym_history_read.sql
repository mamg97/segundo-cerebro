-- Idempotent provisioning for historical Gym sessions and bounded D1 reads.
-- Existing private history remains untouched; no destructive data transformations.
CREATE TABLE IF NOT EXISTS gym_sessions (
  id TEXT PRIMARY KEY,
  session_date TEXT NOT NULL,
  day_id TEXT NOT NULL,
  day_title TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gym_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  sets_done INTEGER,
  reps_done TEXT,
  load_value REAL,
  load_unit TEXT,
  notes TEXT,
  FOREIGN KEY(session_id) REFERENCES gym_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gym_entries_exercise
  ON gym_entries(exercise_id);
CREATE INDEX IF NOT EXISTS idx_gym_sessions_date
  ON gym_sessions(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_gym_entries_session_id
  ON gym_entries(session_id, id);
