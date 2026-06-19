ALTER TABLE users ADD COLUMN staff_status TEXT NOT NULL DEFAULT 'active' CHECK (staff_status IN ('active', 'deactivated', 'archived'));

UPDATE users
SET staff_status = CASE WHEN is_active = 1 THEN 'active' ELSE 'deactivated' END;

CREATE INDEX IF NOT EXISTS idx_users_staff_status ON users(staff_status);
