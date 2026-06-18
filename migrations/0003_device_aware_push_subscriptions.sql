ALTER TABLE notification_subscriptions ADD COLUMN device_id TEXT;
ALTER TABLE notification_subscriptions ADD COLUMN device_label TEXT;
ALTER TABLE notification_subscriptions ADD COLUMN last_seen_at TEXT;

CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user_active
  ON notification_subscriptions(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_device
  ON notification_subscriptions(device_id);
