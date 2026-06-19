export type UserRole = "admin" | "manager" | "staff";
export type PersonaKey = "admin" | "manager" | "staff";
export type AvailabilityResponseValue = "yes" | "no" | "maybe";

export type User = {
  id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type Location = {
  id: string;
  name: string;
  location_type: string;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type Event = {
  id: string;
  location_id: string;
  location_name?: string;
  title: string;
  event_type: string;
  starts_at: string;
  ends_at: string;
  expected_crowd: number | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type AvailabilityResponse = {
  id: string;
  request_id: string;
  user_id: string;
  display_name?: string;
  role?: UserRole;
  response: AvailabilityResponseValue;
  note: string | null;
  responded_at: string;
  created_at: string;
  updated_at: string;
};

export type AvailabilityRecipient = {
  id: string;
  request_id: string;
  user_id: string;
  display_name?: string;
  role?: UserRole;
  delivery_status: string;
  created_at: string;
  updated_at: string;
};

export type AvailabilityRequest = {
  id: string;
  event_id: string | null;
  event_title?: string;
  location_name?: string;
  starts_at?: string;
  title: string;
  message: string | null;
  response_deadline: string | null;
  status: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  responses: AvailabilityResponse[];
  recipients: AvailabilityRecipient[];
};

export type ActivityItem = {
  id: string;
  actor_user_id: string | null;
  actor_display_name?: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  summary: string;
  metadata_json: string | null;
  created_at: string;
};

export type BootstrapData = {
  users: User[];
  locations: Location[];
  events: Event[];
  availabilityRequests: AvailabilityRequest[];
  activity: ActivityItem[];
};

export type ApiHealth = {
  ok: boolean;
  service: string;
  checked_at: string;
};

export type NotificationConfig = {
  pushEnabled: boolean;
  vapidPublicKey: string;
  testPushEnabled?: boolean;
};

export type TestPushResult = {
  id: string;
  device_id?: string | null;
  device_id_short?: string | null;
  device_label?: string | null;
  endpoint_host?: string;
  audience?: string;
  mode?: "empty" | "payload" | "fetch";
  ok: boolean;
  status: number | null;
  marked_inactive?: boolean;
  delivery_id?: string;
  response_text_excerpt?: string;
  error?: string;
};

export type TestPushSummary = {
  ok: boolean;
  attempted: number;
  sent: number;
  failed: number;
  target?: "current-device" | "all-user-devices";
  mode?: "empty" | "payload" | "fetch";
  created_deliveries?: number;
  devicesAttempted?: number;
  results: TestPushResult[];
};

export type PushSubscriptionInfo = {
  id: string;
  user_id: string;
  device_id: string | null;
  device_label: string | null;
  endpoint_host: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
  is_current_device: boolean;
};

export type PushSubscriptionsResponse = {
  subscriptions: PushSubscriptionInfo[];
};

export type ApiError = {
  error: string;
};
