CREATE TABLE IF NOT EXISTS availability_request_recipients (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES availability_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (request_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_availability_request_recipients_request ON availability_request_recipients(request_id);
CREATE INDEX IF NOT EXISTS idx_availability_request_recipients_user ON availability_request_recipients(user_id);

INSERT OR IGNORE INTO availability_request_recipients (id, request_id, user_id, delivery_status)
SELECT 'avail_recipient_dchs_' || users.id, 'avail_req_dchs_sat', users.id, 'pending'
FROM users
WHERE users.role = 'staff' AND users.is_active = 1;
