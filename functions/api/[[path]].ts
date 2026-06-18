export type Env = {
  SIDELINE_DB: D1Database;
  SIDELINE_ACCESS_CODE?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
};

type ApiContext = EventContext<Env, string, unknown>;
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type DbPushSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};
type TestPushResult = {
  id: string;
  endpoint: string;
  ok: boolean;
  status: number | null;
  error?: string;
};

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
  if (method === "POST" && path === "access/verify") return verifyAccess(context);
  if (method === "GET" && path === "notifications/config") return getNotificationConfig(context);

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
  if (method === "POST" && path === "notifications/subscribe") return subscribeToNotifications(context);
  if (method === "POST" && path === "notifications/unsubscribe") return unsubscribeFromNotifications(context);
  if (method === "POST" && path === "notifications/test-send") return sendTestNotification(context);
  if (method === "GET" && path === "activity") return listActivity(context.env.SIDELINE_DB);

  return json({ error: `No route for ${method} /api/${path}` }, 404);
}

function getNotificationConfig(context: ApiContext): Response {
  const vapidPublicKey = context.env.VAPID_PUBLIC_KEY || "";
  return json({
    pushEnabled: vapidPublicKey.length > 0,
    vapidPublicKey,
    testPushEnabled: Boolean(vapidPublicKey && context.env.VAPID_PRIVATE_KEY && context.env.VAPID_SUBJECT),
  });
}

async function verifyAccess(context: ApiContext): Promise<Response> {
  const body = await readBody(context.request);
  const submittedCode = stringValue(body.code);
  const expectedCode = context.env.SIDELINE_ACCESS_CODE || "sideline-dev";

  if (submittedCode && submittedCode === expectedCode) {
    return json({ ok: true });
  }

  return json({ ok: false, error: "Invalid access code" }, 401);
}

async function subscribeToNotifications(context: ApiContext): Promise<Response> {
  const body = await readBody(context.request);
  const userId = requireString(body.userId, "userId");
  const endpoint = requireString(body.endpoint, "endpoint");
  const keys = objectValue(body.keys);
  const p256dh = requireString(keys?.p256dh, "keys.p256dh");
  const auth = requireString(keys?.auth, "keys.auth");
  const userAgent = stringValue(body.userAgent);

  const existing = await context.env.SIDELINE_DB.prepare("SELECT id FROM notification_subscriptions WHERE endpoint = ? LIMIT 1")
    .bind(endpoint)
    .first<{ id: string }>();

  if (existing) {
    await context.env.SIDELINE_DB.prepare(
      `UPDATE notification_subscriptions
       SET user_id = ?, p256dh = ?, auth = ?, user_agent = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(userId, p256dh, auth, userAgent, existing.id)
      .run();
    return json({ ok: true });
  }

  await context.env.SIDELINE_DB.prepare(
    `INSERT INTO notification_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  )
    .bind(crypto.randomUUID(), userId, endpoint, p256dh, auth, userAgent)
    .run();

  return json({ ok: true }, 201);
}

async function unsubscribeFromNotifications(context: ApiContext): Promise<Response> {
  const body = await readBody(context.request);
  const endpoint = requireString(body.endpoint, "endpoint");

  await context.env.SIDELINE_DB.prepare(
    "UPDATE notification_subscriptions SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE endpoint = ?"
  )
    .bind(endpoint)
    .run();

  return json({ ok: true });
}

async function sendTestNotification(context: ApiContext): Promise<Response> {
  const body = await readBody(context.request);
  const userId = requireString(body.userId, "userId");
  const vapidPublicKey = context.env.VAPID_PUBLIC_KEY || "";
  const vapidPrivateKey = context.env.VAPID_PRIVATE_KEY || "";
  const vapidSubject = context.env.VAPID_SUBJECT || "";

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return json(
      {
        ok: false,
        error: "Missing VAPID server configuration. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT, then redeploy.",
      },
      400
    );
  }

  const subscriptions = await context.env.SIDELINE_DB.prepare(
    `SELECT id, user_id, endpoint, p256dh, auth
     FROM notification_subscriptions
     WHERE user_id = ? AND is_active = 1
     ORDER BY updated_at DESC`
  )
    .bind(userId)
    .all<DbPushSubscription>();

  const payload = {
    title: "Sideline Ops",
    body: "Test notification from Sideline Ops.",
    url: "/",
  };
  const results: TestPushResult[] = [];

  for (const subscription of subscriptions.results) {
    try {
      const response = await sendWebPush(subscription, payload, {
        publicKey: vapidPublicKey,
        privateKey: vapidPrivateKey,
        subject: vapidSubject,
      });
      const ok = response.ok || response.status === 201;
      const result: TestPushResult = {
        id: subscription.id,
        endpoint: subscription.endpoint,
        ok,
        status: response.status,
      };

      if (!ok) {
        result.error = await response.text().catch(() => response.statusText);
      }

      if (response.status === 404 || response.status === 410) {
        await markNotificationSubscriptionInactive(context.env.SIDELINE_DB, subscription.id);
      }

      results.push(result);
    } catch (err) {
      results.push({
        id: subscription.id,
        endpoint: subscription.endpoint,
        ok: false,
        status: null,
        error: err instanceof Error ? err.message : "Push send failed.",
      });
    }
  }

  const sent = results.filter((result) => result.ok).length;
  const failed = results.length - sent;
  return json({
    ok: true,
    attempted: subscriptions.results.length,
    sent,
    failed,
    results,
  });
}

async function markNotificationSubscriptionInactive(db: D1Database, id: string) {
  await db.prepare("UPDATE notification_subscriptions SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run();
}

async function sendWebPush(
  subscription: DbPushSubscription,
  payload: JsonValue,
  vapid: { publicKey: string; privateKey: string; subject: string }
): Promise<Response> {
  const endpoint = new URL(subscription.endpoint);
  const encrypted = await encryptWebPushPayload(JSON.stringify(payload), subscription.p256dh, subscription.auth);
  const authorization = await createVapidAuthorizationHeader(endpoint.origin, vapid);

  return fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      authorization,
      "content-encoding": "aes128gcm",
      "content-type": "application/octet-stream",
      ttl: "60",
    },
    body: encrypted,
  });
}

async function createVapidAuthorizationHeader(
  audience: string,
  vapid: { publicKey: string; privateKey: string; subject: string }
): Promise<string> {
  const publicKey = base64UrlToBytes(vapid.publicKey);
  if (publicKey.length !== 65 || publicKey[0] !== 4) {
    throw new Error("Invalid VAPID_PUBLIC_KEY.");
  }

  const privateKey = base64UrlToBytes(vapid.privateKey);
  if (privateKey.length !== 32) {
    throw new Error("Invalid VAPID_PRIVATE_KEY.");
  }

  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: bytesToBase64Url(publicKey.slice(1, 33)),
      y: bytesToBase64Url(publicKey.slice(33, 65)),
      d: bytesToBase64Url(privateKey),
      ext: false,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const header = bytesToBase64Url(utf8(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = bytesToBase64Url(
    utf8(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: vapid.subject,
      })
    )
  );
  const signingInput = `${header}.${claims}`;
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, utf8(signingInput)));
  return `vapid t=${signingInput}.${bytesToBase64Url(signature)}, k=${vapid.publicKey}`;
}

async function encryptWebPushPayload(payload: string, userPublicKeyBase64: string, authSecretBase64: string): Promise<Uint8Array> {
  const userPublicKey = base64UrlToBytes(userPublicKeyBase64);
  const authSecret = base64UrlToBytes(authSecretBase64);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const serverKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const serverPublicKey = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeyPair.publicKey) as ArrayBuffer);
  const importedUserPublicKey = await crypto.subtle.importKey("raw", userPublicKey, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: importedUserPublicKey } as never, serverKeyPair.privateKey, 256));
  const prk = await hmac(authSecret, sharedSecret);
  const keyInfo = concatBytes(utf8("WebPush: info"), new Uint8Array([0]), userPublicKey, serverPublicKey);
  const ikm = await hmac(prk, keyInfo);
  const contentEncryptionKey = await hkdf(salt, ikm, utf8("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, utf8("Content-Encoding: nonce\0"), 12);
  const plaintext = concatBytes(utf8(payload), new Uint8Array([2]));
  const key = await crypto.subtle.importKey("raw", contentEncryptionKey, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, key, plaintext));
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);

  return concatBytes(salt, recordSize, new Uint8Array([serverPublicKey.length]), serverPublicKey, ciphertext);
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const prk = await hmac(salt, ikm);
  const expanded = await hmac(prk, concatBytes(info, new Uint8Array([1])));
  return expanded.slice(0, length);
}

async function hmac(keyBytes: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
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

function objectValue(value: JsonValue | undefined): Record<string, JsonValue | undefined> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, JsonValue | undefined> : null;
}

function boolToInt(value: JsonValue | undefined, defaultValue: boolean): number {
  if (typeof value === "boolean") return value ? 1 : 0;
  return defaultValue ? 1 : 0;
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, array) => sum + array.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const array of arrays) {
    output.set(array, offset);
    offset += array.length;
  }

  return output;
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
  const raw = atob(padded);
  const output = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }

  return output;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let raw = "";

  for (const byte of bytes) {
    raw += String.fromCharCode(byte);
  }

  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
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
