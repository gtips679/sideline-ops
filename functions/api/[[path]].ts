export type Env = {
  SIDELINE_DB: D1Database;
};

type ApiContext = EventContext<Env, string, unknown>;
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

const mutableMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const path = url.pathname.replace(/^\/api\/?/, "");
  const method = context.request.method.toUpperCase();

  return handleApiPath(context, method, path);
};

export async function handleApiPath(context: ApiContext, method: string, path: string): Promise<Response> {

  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const response = await route(context, method, path);
    return withCors(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected API error";
    const status = message.startsWith("Missing") || message.startsWith("Invalid") ? 400 : 500;
    return withCors(json({ error: message }, status));
  }
}

async function route(context: ApiContext, method: string, path: string): Promise<Response> {
  if (!context.env.SIDELINE_DB) {
    return json({ error: "SIDELINE_DB binding is not configured" }, 500);
  }

  if (method === "GET" && path === "health") return getHealth();
  if (method === "GET" && path === "bootstrap") return getBootstrap(context.env.SIDELINE_DB);
  if (method === "GET" && path === "users") return listUsers(context.env.SIDELINE_DB);
  if (method === "POST" && path === "users") return createUser(context);
  if (method === "GET" && path === "locations") return listLocations(context.env.SIDELINE_DB);
  if (method === "POST" && path === "locations") return createLocation(context);
  if (method === "GET" && path === "events") return listEvents(context.env.SIDELINE_DB);
  if (method === "POST" && path === "events") return createEvent(context);
  if (method === "GET" && path === "availability-requests") return listAvailabilityRequests(context.env.SIDELINE_DB);
  if (method === "POST" && path === "availability-requests") return createAvailabilityRequest(context);
  if (method === "POST" && path === "availability-responses") return upsertAvailabilityResponse(context);
  if (method === "GET" && path === "activity") return listActivity(context.env.SIDELINE_DB);

  return json({ error: `No route for ${method} /api/${path}` }, 404);
}

function getHealth(): Response {
  return json({
    ok: true,
    service: "sideline-ops-api",
    checked_at: new Date().toISOString(),
  });
}

async function getBootstrap(db: D1Database): Promise<Response> {
  const [users, locations, events, availability, activity] = await Promise.all([
    getUsers(db),
    getLocations(db),
    getEvents(db),
    getAvailabilityRequests(db),
    getActivity(db),
  ]);

  return json({
    users,
    locations,
    events,
    availabilityRequests: availability,
    activity,
  });
}

async function listUsers(db: D1Database): Promise<Response> {
  return json({ users: await getUsers(db) });
}

async function createUser(context: ApiContext): Promise<Response> {
  const body = await readBody(context.request);
  const id = stringValue(body.id) || crypto.randomUUID();
  const displayName = requireString(body.display_name, "display_name");
  const role = requireString(body.role, "role");

  if (!["admin", "manager", "staff"].includes(role)) {
    throw new Error("Invalid role");
  }

  await context.env.SIDELINE_DB.prepare(
    `INSERT INTO users (id, display_name, phone, email, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  )
    .bind(id, displayName, stringValue(body.phone), stringValue(body.email), role, boolToInt(body.is_active, true))
    .run();

  await logActivity(context.env.SIDELINE_DB, stringValue(body.actor_user_id), "user", id, "created", `${displayName} was added.`);
  return json({ user: await getById(context.env.SIDELINE_DB, "users", id) }, 201);
}

async function listLocations(db: D1Database): Promise<Response> {
  return json({ locations: await getLocations(db) });
}

async function createLocation(context: ApiContext): Promise<Response> {
  const body = await readBody(context.request);
  const id = stringValue(body.id) || crypto.randomUUID();
  const name = requireString(body.name, "name");

  await context.env.SIDELINE_DB.prepare(
    `INSERT INTO locations (id, name, location_type, notes, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  )
    .bind(id, name, requireString(body.location_type, "location_type"), stringValue(body.notes), boolToInt(body.is_active, true))
    .run();

  await logActivity(context.env.SIDELINE_DB, stringValue(body.actor_user_id), "location", id, "created", `${name} was added.`);
  return json({ location: await getById(context.env.SIDELINE_DB, "locations", id) }, 201);
}

async function listEvents(db: D1Database): Promise<Response> {
  return json({ events: await getEvents(db) });
}

async function createEvent(context: ApiContext): Promise<Response> {
  const body = await readBody(context.request);
  const id = stringValue(body.id) || crypto.randomUUID();
  const title = requireString(body.title, "title");

  await context.env.SIDELINE_DB.prepare(
    `INSERT INTO events (id, location_id, title, event_type, starts_at, ends_at, expected_crowd, notes, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  )
    .bind(
      id,
      requireString(body.location_id, "location_id"),
      title,
      requireString(body.event_type, "event_type"),
      requireString(body.starts_at, "starts_at"),
      requireString(body.ends_at, "ends_at"),
      numberValue(body.expected_crowd),
      stringValue(body.notes),
      stringValue(body.status) || "scheduled"
    )
    .run();

  await logActivity(context.env.SIDELINE_DB, stringValue(body.actor_user_id), "event", id, "created", `${title} was added.`);
  return json({ event: await getById(context.env.SIDELINE_DB, "events", id) }, 201);
}

async function listAvailabilityRequests(db: D1Database): Promise<Response> {
  return json({ availabilityRequests: await getAvailabilityRequests(db) });
}

async function createAvailabilityRequest(context: ApiContext): Promise<Response> {
  const body = await readBody(context.request);
  const id = stringValue(body.id) || crypto.randomUUID();
  const title = requireString(body.title, "title");
  const actorId = requireString(body.created_by_user_id, "created_by_user_id");
  const recipientUserIds = await resolveRecipientUserIds(context.env.SIDELINE_DB, body);

  if (recipientUserIds.length === 0) {
    throw new Error("Missing recipient_user_ids");
  }

  await context.env.SIDELINE_DB.prepare(
    `INSERT INTO availability_requests (id, event_id, title, message, response_deadline, status, created_by_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  )
    .bind(
      id,
      stringValue(body.event_id),
      title,
      stringValue(body.message),
      stringValue(body.response_deadline),
      stringValue(body.status) || "open",
      actorId
    )
    .run();

  await context.env.SIDELINE_DB.batch(
    recipientUserIds.map((userId) =>
      context.env.SIDELINE_DB.prepare(
        `INSERT OR IGNORE INTO availability_request_recipients (id, request_id, user_id, delivery_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(crypto.randomUUID(), id, userId, "pending")
    )
  );

  await logActivity(
    context.env.SIDELINE_DB,
    actorId,
    "availability_request",
    id,
    "created",
    `${title} was created for ${recipientUserIds.length} staff member${recipientUserIds.length === 1 ? "" : "s"}.`
  );
  return json({ availabilityRequest: await getAvailabilityRequestById(context.env.SIDELINE_DB, id) }, 201);
}

async function upsertAvailabilityResponse(context: ApiContext): Promise<Response> {
  const body = await readBody(context.request);
  const requestId = requireString(body.request_id, "request_id");
  const userId = requireString(body.user_id, "user_id");
  const response = requireString(body.response, "response");

  if (!["yes", "no", "maybe"].includes(response)) {
    throw new Error("Invalid response");
  }

  const recipient = await context.env.SIDELINE_DB.prepare(
    "SELECT id FROM availability_request_recipients WHERE request_id = ? AND user_id = ?"
  )
    .bind(requestId, userId)
    .first();

  if (!recipient) {
    throw new Error("Invalid response target");
  }

  const existing = await context.env.SIDELINE_DB.prepare(
    "SELECT response FROM availability_responses WHERE request_id = ? AND user_id = ?"
  )
    .bind(requestId, userId)
    .first<{ response: string }>();

  const id = stringValue(body.id) || `avail_resp_${requestId}_${userId}`;
  await context.env.SIDELINE_DB.prepare(
    `INSERT INTO availability_responses (id, request_id, user_id, response, note, responded_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(request_id, user_id) DO UPDATE SET
       response = excluded.response,
       note = excluded.note,
       responded_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP`
  )
    .bind(id, requestId, userId, response, stringValue(body.note))
    .run();

  const action = existing ? "changed_response" : "responded";
  const summary = existing
    ? `Availability response changed from ${existing.response} to ${response}.`
    : `Availability response recorded as ${response}.`;
  await logActivity(context.env.SIDELINE_DB, userId, "availability_response", requestId, action, summary);
  return json({ availabilityRequest: await getAvailabilityRequestById(context.env.SIDELINE_DB, requestId) }, 201);
}

async function listActivity(db: D1Database): Promise<Response> {
  return json({ activity: await getActivity(db) });
}

async function getUsers(db: D1Database) {
  const result = await db.prepare("SELECT * FROM users ORDER BY role, display_name").all();
  return result.results;
}

async function getLocations(db: D1Database) {
  const result = await db.prepare("SELECT * FROM locations ORDER BY name").all();
  return result.results;
}

async function getEvents(db: D1Database) {
  const result = await db
    .prepare(
      `SELECT events.*, locations.name AS location_name
       FROM events
       LEFT JOIN locations ON locations.id = events.location_id
       ORDER BY events.starts_at ASC`
    )
    .all();
  return result.results;
}

async function getAvailabilityRequests(db: D1Database) {
  const requests = await db
    .prepare(
      `SELECT availability_requests.*, events.title AS event_title, events.starts_at, locations.name AS location_name
       FROM availability_requests
       LEFT JOIN events ON events.id = availability_requests.event_id
       LEFT JOIN locations ON locations.id = events.location_id
       ORDER BY availability_requests.created_at DESC`
    )
    .all();

  const responses = await db
    .prepare(
      `SELECT availability_responses.*, users.display_name, users.role
       FROM availability_responses
       JOIN users ON users.id = availability_responses.user_id
       ORDER BY users.display_name`
    )
    .all();

  const recipients = await db
    .prepare(
      `SELECT availability_request_recipients.*, users.display_name, users.role
       FROM availability_request_recipients
       JOIN users ON users.id = availability_request_recipients.user_id
       ORDER BY users.display_name`
    )
    .all();

  const requestRows = requests.results as Array<Record<string, unknown> & { id: string }>;
  const responseRows = responses.results as Array<Record<string, unknown> & { request_id: string }>;
  const recipientRows = recipients.results as Array<Record<string, unknown> & { request_id: string }>;

  return requestRows.map((request) => ({
    ...request,
    responses: responseRows.filter((response) => response.request_id === request.id),
    recipients: recipientRows.filter((recipient) => recipient.request_id === request.id),
  }));
}

async function getAvailabilityRequestById(db: D1Database, id: string) {
  const all = await getAvailabilityRequests(db);
  return all.find((request) => request.id === id) ?? null;
}

async function getActivity(db: D1Database) {
  const result = await db
    .prepare(
      `SELECT activity_log.*, users.display_name AS actor_display_name
       FROM activity_log
       LEFT JOIN users ON users.id = activity_log.actor_user_id
       ORDER BY activity_log.created_at DESC
       LIMIT 25`
    )
    .all();
  return result.results;
}

async function getById(db: D1Database, tableName: string, id: string) {
  const result = await db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).bind(id).first();
  return result;
}

async function logActivity(
  db: D1Database,
  actorUserId: string | null,
  entityType: string,
  entityId: string,
  action: string,
  summary: string
) {
  await db
    .prepare(
      `INSERT INTO activity_log (id, actor_user_id, entity_type, entity_id, action, summary, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    )
    .bind(crypto.randomUUID(), actorUserId, entityType, entityId, action, summary, null)
    .run();
}

async function readBody(request: Request): Promise<Record<string, JsonValue | undefined>> {
  if (!mutableMethods.has(request.method.toUpperCase())) return {};
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Missing JSON request body");
  }
  return body as Record<string, JsonValue | undefined>;
}

function requireString(value: JsonValue | undefined, field: string): string {
  const parsed = stringValue(value);
  if (!parsed) throw new Error(`Missing ${field}`);
  return parsed;
}

function stringValue(value: JsonValue | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function numberValue(value: JsonValue | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function boolToInt(value: JsonValue | undefined, defaultValue: boolean): number {
  if (typeof value === "boolean") return value ? 1 : 0;
  return defaultValue ? 1 : 0;
}

async function resolveRecipientUserIds(db: D1Database, body: Record<string, JsonValue | undefined>): Promise<string[]> {
  if (stringValue(body.recipient_mode) === "all_active_staff") {
    const result = await db.prepare("SELECT id FROM users WHERE role = 'staff' AND is_active = 1 ORDER BY display_name").all<{ id: string }>();
    return result.results.map((user) => user.id);
  }

  if (!Array.isArray(body.recipient_user_ids)) {
    return [];
  }

  const ids = body.recipient_user_ids
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());

  const selectedIds = Array.from(new Set(ids));
  if (selectedIds.length === 0) return [];

  const activeStaff = await db.prepare("SELECT id FROM users WHERE role = 'staff' AND is_active = 1").all<{ id: string }>();
  const activeStaffIds = new Set(activeStaff.results.map((user) => user.id));
  return selectedIds.filter((id) => activeStaffIds.has(id));
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders,
  });
}

function corsHeaders(): HeadersInit {
  return {
    ...jsonHeaders,
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  const cors = corsHeaders();
  Object.entries(cors).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
