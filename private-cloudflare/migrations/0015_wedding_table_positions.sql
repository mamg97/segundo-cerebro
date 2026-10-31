-- Layout only: existing tables and guest assignments remain intact.
-- Coordinates are percentage centers in the wedding floor-plan canvas.
ALTER TABLE wedding_tables ADD COLUMN position_x REAL CHECK(position_x IS NULL OR (position_x BETWEEN 0 AND 100));
ALTER TABLE wedding_tables ADD COLUMN position_y REAL CHECK(position_y IS NULL OR (position_y BETWEEN 0 AND 100));
