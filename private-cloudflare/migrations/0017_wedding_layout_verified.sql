-- Layout-only migration. No names, seat assignments, guest statuses or balances change.
-- Previous UI versions could store incorrect coordinates following failed drags.
-- Treat existing coordinates as legacy/unverified until a new explicit drag or
-- center action saves a known-good center. Preserve raw historical values.
ALTER TABLE wedding_tables ADD COLUMN position_verified INTEGER NOT NULL DEFAULT 0
 CHECK(position_verified IN (0,1));
