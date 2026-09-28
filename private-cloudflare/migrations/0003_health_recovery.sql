-- Native HealthKit bridge recovery signals.
-- Real health values never live in Git; this only defines the private D1 schema.

CREATE TABLE IF NOT EXISTS health_recovery_daily (
  recovery_date TEXT PRIMARY KEY,
  resting_hr_bpm REAL,
  walking_hr_bpm REAL,
  hrv_sdnn_ms REAL,
  respiratory_rate REAL,
  oxygen_saturation_pct REAL,
  vo2_max REAL,
  wrist_temperature_c REAL,
  sleep_asleep_minutes REAL,
  sleep_in_bed_minutes REAL,
  sleep_awake_minutes REAL,
  sleep_core_minutes REAL,
  sleep_deep_minutes REAL,
  sleep_rem_minutes REAL,
  source TEXT NOT NULL DEFAULT 'apple_health',
  sampled_at TEXT,
  source_details TEXT,
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_health_recovery_date
  ON health_recovery_daily(recovery_date);
