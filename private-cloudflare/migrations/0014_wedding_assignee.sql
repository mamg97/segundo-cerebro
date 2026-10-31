-- Assignment is optional; existing private wedding entries stay unassigned.
-- Person labels and custom third-party names are private D1 data, never Git fixtures.
ALTER TABLE wedding_items ADD COLUMN assignee_kind TEXT NOT NULL DEFAULT ''
 CHECK (assignee_kind IN ('','miguel','andrea','otro'));
ALTER TABLE wedding_items ADD COLUMN assignee_name TEXT NOT NULL DEFAULT '';
