-- Preserve all wedding guests and their table assignments; only add seat positions.
-- Reproduce a deterministic name order for pre-existing people on each table.
ALTER TABLE wedding_guests ADD COLUMN seat_index INTEGER
 CHECK(seat_index IS NULL OR (seat_index BETWEEN 0 AND 29));

UPDATE wedding_guests AS guest SET seat_index=(
 SELECT COUNT(*) FROM wedding_guests AS previous
 WHERE previous.table_id=guest.table_id AND (
  previous.name COLLATE NOCASE < guest.name COLLATE NOCASE
  OR (previous.name COLLATE NOCASE = guest.name COLLATE NOCASE AND previous.id < guest.id)
 )
) WHERE guest.table_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wedding_guest_seat
 ON wedding_guests(table_id,seat_index)
 WHERE table_id IS NOT NULL AND seat_index IS NOT NULL;
