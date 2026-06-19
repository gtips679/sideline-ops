CREATE TABLE IF NOT EXISTS notification_deliveries (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  device_id TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '/',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fetched', 'shown', 'failed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fetched_at TEXT,
  shown_at TEXT,
  error TEXT,
  metadata_json TEXT,
  FOREIGN KEY (subscription_id) REFERENCES notification_subscriptions(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_subscription_status
  ON notification_deliveries(subscription_id, status);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_status
  ON notification_deliveries(user_id, status);
