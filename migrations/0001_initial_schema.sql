PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location_type TEXT NOT NULL,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  expected_crowd INTEGER,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS availability_requests (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  title TEXT NOT NULL,
  message TEXT,
  response_deadline TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS availability_responses (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  response TEXT NOT NULL CHECK (response IN ('yes', 'no', 'maybe')),
  note TEXT,
  responded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES availability_requests(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (request_id, user_id)
);

CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  needed_count INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE IF NOT EXISTS shift_assignments (
  id TEXT PRIMARY KEY,
  shift_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role_label TEXT,
  status TEXT NOT NULL DEFAULT 'assigned',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shift_id) REFERENCES shifts(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (shift_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'announcement',
  created_by_user_id TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'all',
  target_id TEXT,
  requires_ack INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS message_recipients (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'queued',
  acknowledged_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (user_id, endpoint)
);

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_locations_active ON locations(is_active);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(location_id);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_availability_requests_event ON availability_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_availability_responses_request ON availability_responses(request_id);
CREATE INDEX IF NOT EXISTS idx_availability_responses_user ON availability_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_event ON shifts(event_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift ON shift_assignments(shift_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_log(created_at);

INSERT OR IGNORE INTO users (id, display_name, phone, email, role, is_active) VALUES
  ('user_glenn', 'Glenn', '555-0100', 'glenn@sidelinesupplies.example', 'admin', 1),
  ('user_manager', 'Morgan Reed', '555-0101', 'morgan@sidelinesupplies.example', 'manager', 1),
  ('user_ava', 'Ava Johnson', '555-0102', 'ava@sidelinesupplies.example', 'staff', 1),
  ('user_ben', 'Ben Carter', '555-0103', 'ben@sidelinesupplies.example', 'staff', 1),
  ('user_carmen', 'Carmen Diaz', '555-0104', 'carmen@sidelinesupplies.example', 'staff', 1),
  ('user_devin', 'Devin Lee', '555-0105', 'devin@sidelinesupplies.example', 'staff', 1),
  ('user_ella', 'Ella Brooks', '555-0106', 'ella@sidelinesupplies.example', 'staff', 1),
  ('user_finn', 'Finn Walker', '555-0107', 'finn@sidelinesupplies.example', 'staff', 1);

INSERT OR IGNORE INTO locations (id, name, location_type, notes, is_active) VALUES
  ('loc_rock_creek_gym', 'Rock Creek Gym', 'gym', 'Indoor concessions and staff check-in.', 1),
  ('loc_rock_creek_baseball', 'Rock Creek Baseball', 'baseball', 'Main baseball concession stand.', 1),
  ('loc_rock_creek_tball', 'Rock Creek T-ball', 't-ball', 'Small field setup with portable inventory.', 1),
  ('loc_veterans_gym', 'Veterans Gym', 'gym', 'Shared gym location.', 1),
  ('loc_dchs_baseball', 'DCHS Baseball', 'baseball', 'High school baseball field.', 1),
  ('loc_dchs_soccer', 'DCHS Soccer', 'soccer', 'High school soccer field.', 1),
  ('loc_lanierland_football', 'Lanierland Football', 'football', 'Large crowd football concessions.', 1);

INSERT OR IGNORE INTO events (id, location_id, title, event_type, starts_at, ends_at, expected_crowd, notes, status) VALUES
  ('event_rock_creek_friday', 'loc_rock_creek_gym', 'Friday Night Basketball', 'basketball', '2026-06-19T22:00:00Z', '2026-06-20T02:00:00Z', 350, 'Two registers expected.', 'scheduled'),
  ('event_dchs_baseball_sat', 'loc_dchs_baseball', 'DCHS Baseball Tournament', 'baseball', '2026-06-20T14:00:00Z', '2026-06-20T21:00:00Z', 500, 'Restock drinks before first pitch.', 'scheduled'),
  ('event_lanierland_scrimmage', 'loc_lanierland_football', 'Lanierland Summer Scrimmage', 'football', '2026-06-23T21:30:00Z', '2026-06-24T01:30:00Z', 700, 'Large grill setup likely.', 'planning');

INSERT OR IGNORE INTO availability_requests (id, event_id, title, message, response_deadline, status, created_by_user_id) VALUES
  ('avail_req_dchs_sat', 'event_dchs_baseball_sat', 'DCHS Baseball Saturday Coverage', 'Please reply with your availability for the Saturday tournament.', '2026-06-19T20:00:00Z', 'open', 'user_glenn');

INSERT OR IGNORE INTO availability_responses (id, request_id, user_id, response, note) VALUES
  ('avail_resp_ava', 'avail_req_dchs_sat', 'user_ava', 'yes', 'Can work the morning and lunch rush.'),
  ('avail_resp_ben', 'avail_req_dchs_sat', 'user_ben', 'maybe', 'Need to confirm family plans.'),
  ('avail_resp_carmen', 'avail_req_dchs_sat', 'user_carmen', 'no', 'Out of town.'),
  ('avail_resp_devin', 'avail_req_dchs_sat', 'user_devin', 'yes', NULL);

INSERT OR IGNORE INTO shifts (id, event_id, title, starts_at, ends_at, needed_count, notes) VALUES
  ('shift_dchs_open', 'event_dchs_baseball_sat', 'Open and Prep', '2026-06-20T13:00:00Z', '2026-06-20T16:00:00Z', 2, 'Set up menu boards and cold drinks.'),
  ('shift_dchs_peak', 'event_dchs_baseball_sat', 'Lunch Rush', '2026-06-20T16:00:00Z', '2026-06-20T20:00:00Z', 4, 'Register, grill, and runner coverage.');

INSERT OR IGNORE INTO shift_assignments (id, shift_id, user_id, role_label, status) VALUES
  ('assign_dchs_open_ava', 'shift_dchs_open', 'user_ava', 'Lead', 'assigned'),
  ('assign_dchs_peak_devin', 'shift_dchs_peak', 'user_devin', 'Runner', 'assigned');

INSERT OR IGNORE INTO messages (id, title, body, message_type, created_by_user_id, target_type, target_id, requires_ack) VALUES
  ('msg_weekend_stock', 'Weekend stock reminder', 'Please send inventory photos after closing each event this weekend.', 'announcement', 'user_glenn', 'all', NULL, 1);

INSERT OR IGNORE INTO message_recipients (id, message_id, user_id, delivery_status) VALUES
  ('msg_rec_ava', 'msg_weekend_stock', 'user_ava', 'queued'),
  ('msg_rec_ben', 'msg_weekend_stock', 'user_ben', 'queued'),
  ('msg_rec_carmen', 'msg_weekend_stock', 'user_carmen', 'queued');

INSERT OR IGNORE INTO activity_log (id, actor_user_id, entity_type, entity_id, action, summary, metadata_json) VALUES
  ('activity_seed_1', 'user_glenn', 'availability_request', 'avail_req_dchs_sat', 'created', 'Glenn requested availability for DCHS Baseball Saturday Coverage.', '{"source":"seed"}'),
  ('activity_seed_2', 'user_ava', 'availability_response', 'avail_resp_ava', 'responded_yes', 'Ava Johnson responded yes for DCHS Baseball Saturday Coverage.', '{"source":"seed"}'),
  ('activity_seed_3', 'user_carmen', 'availability_response', 'avail_resp_carmen', 'responded_no', 'Carmen Diaz responded no for DCHS Baseball Saturday Coverage.', '{"source":"seed"}');
