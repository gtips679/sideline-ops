export type Env = {
  SIDELINE_DB: D1Database;
  SIDELINE_ACCESS_CODE?: string;
  SIDELINE_OWNER_BOOTSTRAP_CODE?: string;
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
  device_id: string | null;
  device_label: string | null;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
  last_seen_at?: string | null;
};
type TestPushResult = {
  id: string;
  device_id: string | null;
  device_id_short: string | null;
  device_label: string | null;
  endpoint_host: string;
  audience: string;
  mode: "empty" | "payload" | "fetch";
  ok: boolean;
  status: number | null;
  marked_inactive: boolean;
  delivery_id?: string;
  response_text_excerpt?: string;
  error?: string;
};
type NotificationDelivery = {
  id: string;
  subscription_id: string;
  user_id: string;
  device_id: string | null;
  title: string;
  body: string;
  url: string;
  status: string;
  created_at: string;
  fetched_at: string | null;
  shown_at: string | null;
  error: string | null;
  metadata_json: string | null;
};
type DbUser = {
  id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  role: string;
  is_active: number;
  first_name?: string | null;
  last_name?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  availability_notes?: string | null;
  skills_json?: string | null;
  internal_notes?: string | null;
  password_hash?: string | null;
  password_salt?: string | null;
  password_iterations?: number | null;
  password_algorithm?: string | null;
  created_at: string;
  updated_at: string;
};
type DbInvite = {
  id: string;
  role: string;
  status: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  updated_at: string;
  accepted_by_user_id: string | null;
};

const ownerEmails = new Set(["gtips679@gmail.com"]);

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
    const status = message === "Authentication required" ? 401 : message === "Forbidden" ? 403 : message.startsWith("Missing") || message.startsWith("Invalid") ? 400 : 500;
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
  if (method === "GET" && path === "bootstrap") return getBootstrap(context);
  if (method === "POST" && path === "auth/login") return login(context);
  if (method === "POST" && path === "auth/logout") return logout(context);
  if (method === "GET" && path === "auth/me") return getAuthMe(context);
  if (method === "POST" && path === "invites/create") return createInvite(context);
  if (method === "GET" && path === "invites") return listInvites(context);
  if (method === "GET" && path.startsWith("invites/")) return getInvite(context, path.split("/")[1] ?? "");
  if (method === "POST" && path.startsWith("invites/") && path.endsWith("/complete")) return completeInvite(context, path.split("/")[1] ?? "");
  if (method === "GET" && path === "users") return listUsers(context);
  if (method === "POST" && path === "users") return createUser(context);
  if (method === "PATCH" && path.startsWith("users/")) return updateUserProfile(context, path.split("/")[1] ?? "");
  if (method === "POST" && path.startsWith("users/") && path.endsWith("/resend-invite")) return createInvite(context, path.split("/")[1] ?? "");
  if (method === "GET" && path === "locations") return listLocations(context);
  if (method === "POST" && path === "locations") return createLocation(context);
  if (method === "GET" && path === "events") return listEvents(context);
  if (method === "POST" && path === "events") return createEvent(context);
  if (method === "GET" && path === "availability-requests") return listAvailabilityRequests(context);
  if (method === "POST" && path === "availability-requests") return createAvailabilityRequest(context);
  if (method === "POST" && path === "availability-responses") return upsertAvailabilityResponse(context);
  if (method === "POST" && path === "notifications/subscribe") return subscribeToNotifications(context);
  if (method === "POST" && path === "notifications/unsubscribe") return unsubscribeFromNotifications(context);
  if (method === "POST" && path === "notifications/test-send") return sendTestNotification(context);
  if (method === "POST" && path === "notifications/pending") return getPendingNotifications(context);
  if (method === "POST" && path === "notifications/mark-shown") return markNotificationsShown(context);
  if (method === "GET" && path === "notifications/subscriptions") return listNotificationSubscriptions(context);
  if (method === "GET" && path === "activity") return listActivity(context);

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

async function login(context: ApiContext): Promise<Response> {
  const body = await readBody(context.request);
  const identifier = requireString(body.identifier, "identifier").toLowerCase();
  const password = requireString(body.password, "password");
  const user = await context.env.SIDELINE_DB.prepare(
    `SELECT * FROM users
     WHERE lower(email) = ? OR phone = ?
     LIMIT 1`
  )
    .bind(identifier, identifier)
    .first<DbUser>();

  if (!user || !user.is_active) {
    return json({ error: "Invalid login or inactive account." }, 401);
  }

  if (!user.password_hash || !user.password_salt || !user.password_iterations) {
    const bootstrapCode = stringValue(body.bootstrap_code);
    if (user.id === "user_glenn" && isValidOwnerBootstrapCode(context, bootstrapCode)) {
      await setUserPassword(context.env.SIDELINE_DB, user.id, password);
      const updatedUser = await getUserById(context.env.SIDELINE_DB, user.id);
      if (updatedUser) return createLoginSession(context, updatedUser);
    }
    return json({ error: "This account does not have a password set yet. Use an invite or ask an owner/admin for help." }, 401);
  }

  const passwordOk = await verifyPassword(password, user);
  if (!passwordOk) {
    return json({ error: "Invalid login or inactive account." }, 401);
  }

  return createLoginSession(context, user);
}

async function logout(context: ApiContext): Promise<Response> {
  const token = getCookie(context.request, "sideline_session");
  if (token) {
    await context.env.SIDELINE_DB.prepare("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ?")
      .bind(await hashToken(token))
      .run();
  }
  return json({ ok: true }, 200, {
    "set-cookie": "sideline_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
  });
}

async function createLoginSession(context: ApiContext, user: DbUser): Promise<Response> {
  const token = randomToken();
  const sessionId = crypto.randomUUID();
  const expiresAt = dateAfterDays(90);
  await context.env.SIDELINE_DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, user_agent, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  )
    .bind(sessionId, user.id, await hashToken(token), expiresAt, context.request.headers.get("user-agent"))
    .run();

  return json({ ok: true, user: safeUser(user) }, 200, {
    "set-cookie": sessionCookie(token, expiresAt, new URL(context.request.url).protocol === "https:"),
  });
}

async function setUserPassword(db: D1Database, userId: string, password: string) {
  const passwordRecord = await hashPassword(password);
  await db.prepare(
    `UPDATE users
     SET password_hash = ?, password_salt = ?, password_iterations = ?, password_algorithm = ?,
         password_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(passwordRecord.hash, passwordRecord.salt, passwordRecord.iterations, passwordRecord.algorithm, userId)
    .run();
}

function isValidOwnerBootstrapCode(context: ApiContext, submittedCode: string | null): boolean {
  const expectedCode = context.env.SIDELINE_OWNER_BOOTSTRAP_CODE;
  return Boolean(expectedCode && submittedCode && timingSafeEqual(submittedCode, expectedCode));
}

async function getAuthMe(context: ApiContext): Promise<Response> {
  const user = await getCurrentSessionUser(context);
  return json({ user: user ? safeUser(user) : null });
}

async function listInvites(context: ApiContext): Promise<Response> {
  const actor = await requireAdminActor(context);
  const result = await context.env.SIDELINE_DB.prepare(
    `SELECT invites.id, invites.role, invites.status, invites.expires_at, invites.used_at, invites.created_at, invites.updated_at,
            invites.accepted_by_user_id, users.display_name AS accepted_by_display_name
     FROM invites
     LEFT JOIN users ON users.id = invites.accepted_by_user_id
     ORDER BY invites.created_at DESC
     LIMIT 50`
  ).all();
  await expireOldInvites(context.env.SIDELINE_DB);
  return json({ actor: safeUser(actor), invites: result.results });
}

async function createInvite(context: ApiContext, targetUserId?: string): Promise<Response> {
  const actor = await requireAdminActor(context);
  const token = randomToken();
  const inviteId = crypto.randomUUID();
  const expiresAt = dateAfterDays(31);

  await context.env.SIDELINE_DB.prepare(
    `INSERT INTO invites (id, token_hash, role, created_by_user_id, status, expires_at, created_at, updated_at)
     VALUES (?, ?, 'staff', ?, 'pending', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  )
    .bind(inviteId, await hashToken(token), actor.id, expiresAt)
    .run();

  if (targetUserId) {
    await logActivity(context.env.SIDELINE_DB, actor.id, "user", targetUserId, "invite_regenerated", "A new setup invite was generated.");
  } else {
    await logActivity(context.env.SIDELINE_DB, actor.id, "invite", inviteId, "created", "A staff setup invite was created.");
  }

  return json({
    invite: {
      id: inviteId,
      token,
      invite_url: `${new URL(context.request.url).origin}/invite/${token}`,
      role: "staff",
      status: "pending",
      expires_at: expiresAt,
    },
  }, 201);
}

async function getInvite(context: ApiContext, token: string): Promise<Response> {
  const invite = await getPendingInviteByToken(context.env.SIDELINE_DB, token);
  if (!invite) return json({ error: "Invite not found, already used, or expired." }, 404);
  const locations = await getLocations(context.env.SIDELINE_DB);
  return json({ invite: safeInvite(invite), locations: locations.filter((location) => Number((location as { is_active?: number }).is_active ?? 0) === 1) });
}

async function completeInvite(context: ApiContext, token: string): Promise<Response> {
  const invite = await getPendingInviteByToken(context.env.SIDELINE_DB, token);
  if (!invite) return json({ error: "Invite not found, already used, or expired." }, 404);

  const body = await readBody(context.request);
  const firstName = requireString(body.first_name, "first_name");
  const lastName = requireString(body.last_name, "last_name");
  const phone = requireString(body.phone, "phone");
  const email = requireString(body.email, "email").toLowerCase();
  const password = requireString(body.password, "password");
  const confirmPassword = requireString(body.confirm_password, "confirm_password");
  const emergencyContactName = stringValue(body.emergency_contact_name);
  const emergencyContactPhone = stringValue(body.emergency_contact_phone);
  const availabilityNotes = stringValue(body.availability_notes);

  if (password !== confirmPassword) throw new Error("Passwords do not match");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  const existing = await context.env.SIDELINE_DB.prepare("SELECT id FROM users WHERE is_active = 1 AND (lower(email) = ? OR phone = ?) LIMIT 1")
    .bind(email, phone)
    .first<{ id: string }>();
  if (existing) throw new Error("An active user with that email or phone already exists");

  const passwordRecord = await hashPassword(password);
  const userId = crypto.randomUUID();
  const displayName = `${firstName} ${lastName}`.trim();

  await context.env.SIDELINE_DB.prepare(
    `INSERT INTO users (
      id, display_name, first_name, last_name, phone, email, role, is_active,
      emergency_contact_name, emergency_contact_phone, availability_notes,
      password_hash, password_salt, password_iterations, password_algorithm, password_updated_at,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 'staff', 1, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  )
    .bind(
      userId,
      displayName,
      firstName,
      lastName,
      phone,
      email,
      emergencyContactName,
      emergencyContactPhone,
      availabilityNotes,
      passwordRecord.hash,
      passwordRecord.salt,
      passwordRecord.iterations,
      passwordRecord.algorithm
    )
    .run();

  await saveLocationAvailability(context.env.SIDELINE_DB, userId, body.location_availability);
  await context.env.SIDELINE_DB.prepare(
    "UPDATE invites SET status = 'used', accepted_by_user_id = ?, used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  )
    .bind(userId, invite.id)
    .run();
  await logActivity(context.env.SIDELINE_DB, userId, "invite", invite.id, "completed", `${displayName} completed staff setup.`);

  return json({ ok: true, user: safeUser(await getUserById(context.env.SIDELINE_DB, userId)) }, 201);
}

async function subscribeToNotifications(context: ApiContext): Promise<Response> {
  const actor = await requireSessionUser(context);
  const body = await readBody(context.request);
  const userId = requireString(body.userId, "userId");
  if (actor.id !== userId && !["owner", "admin"].includes(effectiveRole(actor))) {
    return json({ error: "Forbidden" }, 403);
  }
  const deviceId = requireString(body.deviceId, "deviceId");
  const deviceLabel = requireString(body.deviceLabel, "deviceLabel");
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
       SET user_id = ?, device_id = ?, device_label = ?, p256dh = ?, auth = ?, user_agent = ?,
           is_active = 1, last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(userId, deviceId, deviceLabel, p256dh, auth, userAgent, existing.id)
      .run();
    return json({ ok: true, subscription: await getNotificationSubscriptionById(context.env.SIDELINE_DB, existing.id, deviceId) });
  }

  const id = crypto.randomUUID();
  await context.env.SIDELINE_DB.prepare(
    `INSERT INTO notification_subscriptions (id, user_id, device_id, device_label, endpoint, p256dh, auth, user_agent, is_active, created_at, updated_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  )
    .bind(id, userId, deviceId, deviceLabel, endpoint, p256dh, auth, userAgent)
    .run();

  return json({ ok: true, subscription: await getNotificationSubscriptionById(context.env.SIDELINE_DB, id, deviceId) }, 201);
}

async function unsubscribeFromNotifications(context: ApiContext): Promise<Response> {
  const actor = await requireSessionUser(context);
  const body = await readBody(context.request);
  const endpoint = stringValue(body.endpoint);
  const deviceId = stringValue(body.deviceId);

  if (!endpoint && !deviceId) throw new Error("Missing endpoint or deviceId");

  const isAdmin = ["owner", "admin"].includes(effectiveRole(actor));
  const result = endpoint
    ? await context.env.SIDELINE_DB.prepare(
        `UPDATE notification_subscriptions
         SET is_active = 0, updated_at = CURRENT_TIMESTAMP
         WHERE endpoint = ? ${isAdmin ? "" : "AND user_id = ?"}`
      )
        .bind(...(isAdmin ? [endpoint] : [endpoint, actor.id]))
        .run()
    : await context.env.SIDELINE_DB.prepare(
        `UPDATE notification_subscriptions
         SET is_active = 0, updated_at = CURRENT_TIMESTAMP
         WHERE device_id = ? AND is_active = 1 ${isAdmin ? "" : "AND user_id = ?"}`
      )
        .bind(...(isAdmin ? [deviceId] : [deviceId, actor.id]))
        .run();

  return json({ ok: true, updated: result.meta.changes ?? 0 });
}

async function listNotificationSubscriptions(context: ApiContext): Promise<Response> {
  const actor = await requireSessionUser(context);
  const url = new URL(context.request.url);
  const userId = url.searchParams.get("userId")?.trim();
  const deviceId = url.searchParams.get("deviceId")?.trim() || null;

  if (!userId) throw new Error("Missing userId");
  if (actor.id !== userId && !["owner", "admin"].includes(effectiveRole(actor))) {
    return json({ error: "Forbidden" }, 403);
  }

  const result = await context.env.SIDELINE_DB.prepare(
    `SELECT id, user_id, device_id, device_label, endpoint, is_active, created_at, updated_at, last_seen_at
     FROM notification_subscriptions
     WHERE user_id = ?
     ORDER BY is_active DESC, updated_at DESC`
  )
    .bind(userId)
    .all<DbPushSubscription>();

  return json({
    subscriptions: result.results.map((subscription) => safeSubscription(subscription, deviceId)),
  });
}

async function getPendingNotifications(context: ApiContext): Promise<Response> {
  const body = await readBody(context.request);
  const endpoint = requireString(body.endpoint, "endpoint");
  const subscription = await context.env.SIDELINE_DB.prepare(
    `SELECT id, user_id, device_id, device_label, endpoint, p256dh, auth
     FROM notification_subscriptions
     WHERE endpoint = ? AND is_active = 1
     LIMIT 1`
  )
    .bind(endpoint)
    .first<DbPushSubscription>();

  if (!subscription) {
    return json({ ok: true, notifications: [] });
  }

  const deliveries = await context.env.SIDELINE_DB.prepare(
    `SELECT id, subscription_id, user_id, device_id, title, body, url, status, created_at, fetched_at, shown_at, error, metadata_json
     FROM notification_deliveries
     WHERE subscription_id = ? AND status = 'pending'
     ORDER BY created_at ASC
     LIMIT 10`
  )
    .bind(subscription.id)
    .all<NotificationDelivery>();

  if (deliveries.results.length > 0) {
    await context.env.SIDELINE_DB.batch(
      deliveries.results.map((delivery) =>
        context.env.SIDELINE_DB.prepare(
          "UPDATE notification_deliveries SET status = 'fetched', fetched_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'"
        ).bind(delivery.id)
      )
    );
  }

  return json({
    ok: true,
    notifications: deliveries.results.map((delivery) => ({
      id: delivery.id,
      title: delivery.title,
      body: delivery.body,
      url: delivery.url || "/",
    })),
  });
}

async function markNotificationsShown(context: ApiContext): Promise<Response> {
  const body = await readBody(context.request);
  if (!Array.isArray(body.ids)) throw new Error("Missing ids");
  const ids = body.ids.filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.trim());
  const uniqueIds = Array.from(new Set(ids));

  if (uniqueIds.length === 0) {
    return json({ ok: true, updated: 0 });
  }

  const results = await context.env.SIDELINE_DB.batch(
    uniqueIds.map((id) =>
      context.env.SIDELINE_DB.prepare(
        "UPDATE notification_deliveries SET status = 'shown', shown_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(id)
    )
  );
  const updated = results.reduce((sum, result) => sum + (result.meta.changes ?? 0), 0);
  return json({ ok: true, updated });
}

async function sendTestNotification(context: ApiContext): Promise<Response> {
  const actor = await requireSessionUser(context);
  const body = await readBody(context.request);
  const userId = requireString(body.userId, "userId");
  if (actor.id !== userId && !["owner", "admin"].includes(effectiveRole(actor))) {
    return json({ error: "Forbidden" }, 403);
  }
  const target = requireString(body.target, "target");
  const deviceId = requireString(body.deviceId, "deviceId");
  const modeInput = stringValue(body.mode) || "payload";
  const vapidPublicKey = context.env.VAPID_PUBLIC_KEY || "";
  const vapidPrivateKey = context.env.VAPID_PRIVATE_KEY || "";
  const vapidSubject = context.env.VAPID_SUBJECT || "";

  if (!["current-device", "all-user-devices"].includes(target)) {
    throw new Error("Invalid target");
  }

  if (!["empty", "payload", "fetch"].includes(modeInput)) {
    throw new Error("Invalid mode");
  }
  const mode = modeInput as "empty" | "payload" | "fetch";

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return json(
      {
        ok: false,
        error: "Missing VAPID server configuration. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT, then redeploy.",
      },
      400
    );
  }

  const subscriptions = target === "current-device"
    ? await context.env.SIDELINE_DB.prepare(
      `SELECT id, user_id, device_id, device_label, endpoint, p256dh, auth
       FROM notification_subscriptions
       WHERE user_id = ? AND device_id = ? AND is_active = 1
       ORDER BY updated_at DESC`
    )
      .bind(userId, deviceId)
      .all<DbPushSubscription>()
    : await context.env.SIDELINE_DB.prepare(
    `SELECT id, user_id, device_id, device_label, endpoint, p256dh, auth
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
  let createdDeliveries = 0;

  for (const subscription of subscriptions.results) {
    const deliveryId = mode === "fetch"
      ? await createNotificationDelivery(context.env.SIDELINE_DB, subscription, {
        title: "Sideline Ops",
        body: "Fetched test notification from Sideline Ops.",
        url: "/",
      })
      : undefined;
    if (deliveryId) createdDeliveries += 1;

    try {
      const response = await sendWebPush(subscription, payload, {
        publicKey: vapidPublicKey,
        privateKey: vapidPrivateKey,
        subject: vapidSubject,
      }, mode);
      const ok = response.ok || response.status === 201;
      const result: TestPushResult = {
        id: subscription.id,
        device_id: subscription.device_id,
        device_id_short: subscription.device_id ? shortenId(subscription.device_id) : null,
        device_label: subscription.device_label,
        endpoint_host: endpointHost(subscription.endpoint),
        audience: endpointAudience(subscription.endpoint),
        mode,
        ok,
        status: response.status,
        marked_inactive: false,
        delivery_id: deliveryId,
      };

      if (!ok) {
        const responseText = await response.text().catch(() => response.statusText);
        result.response_text_excerpt = safeExcerpt(responseText);
        result.error = response.statusText || "Push service returned a non-2xx response.";
      }

      if (response.status === 404 || response.status === 410) {
        await markNotificationSubscriptionInactive(context.env.SIDELINE_DB, subscription.id);
        result.marked_inactive = true;
      }

      results.push(result);
    } catch (err) {
      results.push({
        id: subscription.id,
        device_id: subscription.device_id,
        device_id_short: subscription.device_id ? shortenId(subscription.device_id) : null,
        device_label: subscription.device_label,
        endpoint_host: endpointHost(subscription.endpoint),
        audience: endpointAudience(subscription.endpoint),
        mode,
        ok: false,
        status: null,
        marked_inactive: false,
        delivery_id: deliveryId,
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
    target,
    mode,
    created_deliveries: createdDeliveries,
    devicesAttempted: new Set(subscriptions.results.map((subscription) => subscription.device_id).filter(Boolean)).size,
    results,
  });
}

async function createNotificationDelivery(
  db: D1Database,
  subscription: DbPushSubscription,
  notification: { title: string; body: string; url: string }
): Promise<string> {
  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO notification_deliveries
      (id, subscription_id, user_id, device_id, title, body, url, status, created_at, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, ?)`
  )
    .bind(
      id,
      subscription.id,
      subscription.user_id,
      subscription.device_id,
      notification.title,
      notification.body,
      notification.url,
      JSON.stringify({ source: "manual_test_send", mode: "fetch" })
    )
    .run();
  return id;
}

async function markNotificationSubscriptionInactive(db: D1Database, id: string) {
  await db.prepare("UPDATE notification_subscriptions SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run();
}

async function getNotificationSubscriptionById(db: D1Database, id: string, currentDeviceId: string | null) {
  const subscription = await db
    .prepare(
      `SELECT id, user_id, device_id, device_label, endpoint, is_active, created_at, updated_at, last_seen_at
       FROM notification_subscriptions
       WHERE id = ?`
    )
    .bind(id)
    .first<DbPushSubscription>();

  return subscription ? safeSubscription(subscription, currentDeviceId) : null;
}

function safeSubscription(subscription: DbPushSubscription, currentDeviceId: string | null) {
  return {
    id: subscription.id,
    user_id: subscription.user_id,
    device_id: subscription.device_id,
    device_label: subscription.device_label,
    endpoint_host: endpointHost(subscription.endpoint),
    is_active: Number(subscription.is_active ?? 0),
    created_at: subscription.created_at,
    updated_at: subscription.updated_at,
    last_seen_at: subscription.last_seen_at ?? null,
    is_current_device: Boolean(currentDeviceId && subscription.device_id === currentDeviceId),
  };
}

function endpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return "invalid-endpoint";
  }
}

function endpointAudience(endpoint: string): string {
  try {
    return new URL(endpoint).origin;
  } catch {
    return "invalid-endpoint";
  }
}

function shortenId(id: string): string {
  return id.length <= 8 ? id : id.slice(0, 8);
}

function safeExcerpt(value: string): string {
  return value.length > 240 ? `${value.slice(0, 240)}...` : value;
}

async function sendWebPush(
  subscription: DbPushSubscription,
  payload: JsonValue,
  vapid: { publicKey: string; privateKey: string; subject: string },
  mode: "empty" | "payload" | "fetch"
): Promise<Response> {
  const endpoint = new URL(subscription.endpoint);
  const authorization = await createVapidAuthorizationHeader(endpoint.origin, vapid);
  const headers: Record<string, string> = {
    authorization,
    "crypto-key": `p256ecdsa=${vapid.publicKey}`,
    ttl: "60",
    urgency: "normal",
  };

  if (mode === "empty" || mode === "fetch") {
    return fetch(subscription.endpoint, {
      method: "POST",
      headers,
    });
  }

  const encrypted = await encryptWebPushPayload(JSON.stringify(payload), subscription.p256dh, subscription.auth);

  return fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      ...headers,
      "content-encoding": "aes128gcm",
      "content-type": "application/octet-stream",
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

async function getBootstrap(context: ApiContext): Promise<Response> {
  const user = await requireSessionUser(context);
  const db = context.env.SIDELINE_DB;
  if (effectiveRole(user) === "staff") {
    const [locations, availability] = await Promise.all([
      getLocations(db),
      getAvailabilityRequests(db),
    ]);
    return json({
      users: [safeUser(user)],
      locations: [],
      events: [],
      availabilityRequests: availability
        .filter((request) => request.recipients.some((recipient) => recipient.user_id === user.id))
        .map((request) => ({
          ...request,
          recipients: request.recipients.filter((recipient) => recipient.user_id === user.id),
          responses: request.responses.filter((response) => response.user_id === user.id),
        })),
      activity: [],
      locationCount: locations.length,
    });
  }

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

async function listUsers(context: ApiContext): Promise<Response> {
  await requireAdminActor(context);
  return json({ users: await getUsers(context.env.SIDELINE_DB) });
}

async function createUser(context: ApiContext): Promise<Response> {
  const actor = await requireAdminActor(context);
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

  await logActivity(context.env.SIDELINE_DB, actor.id, "user", id, "created", `${displayName} was added.`);
  return json({ user: await getById(context.env.SIDELINE_DB, "users", id) }, 201);
}

async function updateUserProfile(context: ApiContext, userId: string): Promise<Response> {
  if (!userId) throw new Error("Missing user id");
  const actor = await requireAdminActor(context);
  const body = await readBody(context.request);
  const existing = await getUserById(context.env.SIDELINE_DB, userId);
  if (!existing) return json({ error: "User not found" }, 404);

  const role = stringValue(body.role);
  if (role && role !== effectiveRole(existing)) {
    if (effectiveRole(actor) !== "owner") return json({ error: "Only an owner can change roles." }, 403);
    if (!["owner", "admin", "manager", "staff"].includes(role)) throw new Error("Invalid role");
    if (role === "owner" && userId !== "user_glenn") return json({ error: "Owner role is reserved for Glenn in this early auth milestone." }, 400);
  }
  const dbRole = role === "owner" ? "admin" : role;

  const firstName = stringValue(body.first_name) ?? existing.first_name ?? "";
  const lastName = stringValue(body.last_name) ?? existing.last_name ?? "";
  const displayName = stringValue(body.display_name) || `${firstName} ${lastName}`.trim() || existing.display_name;
  const skills = Array.isArray(body.skills)
    ? body.skills.filter((skill): skill is string => typeof skill === "string" && skill.trim().length > 0).map((skill) => skill.trim())
    : parseSkills(existing.skills_json);

  await context.env.SIDELINE_DB.prepare(
    `UPDATE users
     SET display_name = ?, first_name = ?, last_name = ?, phone = ?, email = ?, role = ?, is_active = ?,
         emergency_contact_name = ?, emergency_contact_phone = ?, availability_notes = ?,
         skills_json = ?, internal_notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(
      displayName,
      firstName || null,
      lastName || null,
      stringValue(body.phone) ?? existing.phone,
      stringValue(body.email) ?? existing.email,
      dbRole || existing.role,
      boolToInt(body.is_active, Boolean(existing.is_active)),
      stringValue(body.emergency_contact_name) ?? existing.emergency_contact_name ?? null,
      stringValue(body.emergency_contact_phone) ?? existing.emergency_contact_phone ?? null,
      stringValue(body.availability_notes) ?? existing.availability_notes ?? null,
      JSON.stringify(skills),
      stringValue(body.internal_notes) ?? existing.internal_notes ?? null,
      userId
    )
    .run();

  if (Array.isArray(body.location_availability)) {
    await saveLocationAvailability(context.env.SIDELINE_DB, userId, body.location_availability);
  }

  await logActivity(context.env.SIDELINE_DB, actor.id, "user", userId, "updated", `${displayName} was updated.`);
  return json({ user: safeUser(await getUserById(context.env.SIDELINE_DB, userId)) });
}

async function listLocations(context: ApiContext): Promise<Response> {
  await requireAdminActor(context);
  return json({ locations: await getLocations(context.env.SIDELINE_DB) });
}

async function createLocation(context: ApiContext): Promise<Response> {
  const actor = await requireAdminActor(context);
  const body = await readBody(context.request);
  const id = stringValue(body.id) || crypto.randomUUID();
  const name = requireString(body.name, "name");

  await context.env.SIDELINE_DB.prepare(
    `INSERT INTO locations (id, name, location_type, notes, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  )
    .bind(id, name, requireString(body.location_type, "location_type"), stringValue(body.notes), boolToInt(body.is_active, true))
    .run();

  await logActivity(context.env.SIDELINE_DB, actor.id, "location", id, "created", `${name} was added.`);
  return json({ location: await getById(context.env.SIDELINE_DB, "locations", id) }, 201);
}

async function listEvents(context: ApiContext): Promise<Response> {
  await requireAdminActor(context);
  return json({ events: await getEvents(context.env.SIDELINE_DB) });
}

async function createEvent(context: ApiContext): Promise<Response> {
  const actor = await requireAdminActor(context);
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

  await logActivity(context.env.SIDELINE_DB, actor.id, "event", id, "created", `${title} was added.`);
  return json({ event: await getById(context.env.SIDELINE_DB, "events", id) }, 201);
}

async function listAvailabilityRequests(context: ApiContext): Promise<Response> {
  const user = await requireSessionUser(context);
  const requests = await getAvailabilityRequests(context.env.SIDELINE_DB);
  if (effectiveRole(user) === "staff") {
    return json({
      availabilityRequests: requests
        .filter((request) => request.recipients.some((recipient) => recipient.user_id === user.id))
        .map((request) => ({
          ...request,
          recipients: request.recipients.filter((recipient) => recipient.user_id === user.id),
          responses: request.responses.filter((response) => response.user_id === user.id),
        })),
    });
  }
  return json({ availabilityRequests: requests });
}

async function createAvailabilityRequest(context: ApiContext): Promise<Response> {
  const actor = await requireAdminActor(context);
  const body = await readBody(context.request);
  const id = stringValue(body.id) || crypto.randomUUID();
  const title = requireString(body.title, "title");
  const actorId = actor.id;
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
  const sessionUser = await requireSessionUser(context);
  const body = await readBody(context.request);
  const requestId = requireString(body.request_id, "request_id");
  const userId = requireString(body.user_id, "user_id");
  const response = requireString(body.response, "response");
  if (effectiveRole(sessionUser) === "staff" && sessionUser.id !== userId) {
    return json({ error: "Staff can only update their own availability responses." }, 403);
  }

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

async function listActivity(context: ApiContext): Promise<Response> {
  await requireAdminActor(context);
  return json({ activity: await getActivity(context.env.SIDELINE_DB) });
}

async function getUsers(db: D1Database) {
  const result = await db.prepare(
    `SELECT id, display_name, phone, email, role, is_active, first_name, last_name,
            emergency_contact_name, emergency_contact_phone, availability_notes,
            skills_json, internal_notes, created_at, updated_at
     FROM users
     ORDER BY role, display_name`
  ).all<DbUser>();
  const availability = await db.prepare(
    `SELECT user_location_availability.*, locations.name AS location_name
     FROM user_location_availability
     JOIN locations ON locations.id = user_location_availability.location_id
     ORDER BY locations.name`
  ).all<Record<string, unknown> & { user_id: string }>();
  return result.results.map((user) => ({
    ...safeUser(user),
    location_availability: availability.results.filter((item) => item.user_id === user.id),
  }));
}

async function getUserById(db: D1Database, id: string): Promise<DbUser | null> {
  return db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").bind(id).first<DbUser>();
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

async function requireAdminActor(context: ApiContext): Promise<DbUser> {
  const actor = await requireSessionUser(context);
  if (!["owner", "admin"].includes(effectiveRole(actor))) {
    throw new Error("Forbidden");
  }
  return actor;
}

async function requireOwnerActor(context: ApiContext): Promise<DbUser> {
  const actor = await requireSessionUser(context);
  if (effectiveRole(actor) !== "owner") {
    throw new Error("Forbidden");
  }
  return actor;
}

async function requireSessionUser(context: ApiContext): Promise<DbUser> {
  const user = await getCurrentSessionUser(context);
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

async function getCurrentSessionUser(context: ApiContext): Promise<DbUser | null> {
  const token = getCookie(context.request, "sideline_session");
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const user = await context.env.SIDELINE_DB.prepare(
    `SELECT users.*
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ?
       AND sessions.revoked_at IS NULL
       AND sessions.expires_at > CURRENT_TIMESTAMP
     LIMIT 1`
  )
    .bind(tokenHash)
    .first<DbUser>();
  if (user) {
    await context.env.SIDELINE_DB.prepare("UPDATE sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token_hash = ?").bind(tokenHash).run();
  }
  return user && user.is_active ? user : null;
}

async function getPendingInviteByToken(db: D1Database, token: string): Promise<DbInvite | null> {
  if (!token) return null;
  await expireOldInvites(db);
  return db.prepare(
    `SELECT id, role, status, expires_at, used_at, created_at, updated_at, accepted_by_user_id
     FROM invites
     WHERE token_hash = ? AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP
     LIMIT 1`
  )
    .bind(await hashToken(token))
    .first<DbInvite>();
}

async function expireOldInvites(db: D1Database) {
  await db.prepare(
    "UPDATE invites SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE status = 'pending' AND expires_at <= CURRENT_TIMESTAMP"
  ).run();
}

async function saveLocationAvailability(db: D1Database, userId: string, value: JsonValue | undefined) {
  if (!Array.isArray(value)) return;
  const rows = value
    .map((item) => {
      const row = objectValue(item);
      return {
        locationId: stringValue(row?.location_id),
        preference: stringValue(row?.preference),
      };
    })
    .filter((item): item is { locationId: string; preference: string } =>
      Boolean(item.locationId && ["preferred", "willing", "cannot"].includes(item.preference ?? ""))
    );

  await db.prepare("DELETE FROM user_location_availability WHERE user_id = ?").bind(userId).run();
  if (rows.length === 0) return;
  await db.batch(
    rows.map((row) =>
      db.prepare(
        `INSERT INTO user_location_availability (id, user_id, location_id, preference, created_at, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(crypto.randomUUID(), userId, row.locationId, row.preference)
    )
  );
}

function safeUser(user: DbUser | null) {
  if (!user) return null;
  return {
    id: user.id,
    display_name: user.display_name,
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
    phone: user.phone ?? null,
    email: user.email ?? null,
    role: effectiveRole(user),
    storedRole: user.role,
    stored_role: user.role,
    is_active: user.is_active,
    emergency_contact_name: user.emergency_contact_name ?? null,
    emergency_contact_phone: user.emergency_contact_phone ?? null,
    availability_notes: user.availability_notes ?? null,
    skills: parseSkills(user.skills_json),
    internal_notes: user.internal_notes ?? null,
    has_password: Boolean(user.password_hash),
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function effectiveRole(user: Pick<DbUser, "id" | "email" | "role">): string {
  const email = user.email?.trim().toLowerCase();
  if (email && ownerEmails.has(email)) return "owner";
  return user.id === "user_glenn" ? "owner" : user.role;
}

function safeInvite(invite: DbInvite) {
  return {
    id: invite.id,
    role: invite.role,
    status: invite.status,
    expires_at: invite.expires_at,
    used_at: invite.used_at,
    created_at: invite.created_at,
  };
}

function parseSkills(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function hashPassword(password: string) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = bytesToBase64Url(saltBytes);
  const iterations = 100000;
  const keyMaterial = await crypto.subtle.importKey("raw", utf8(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" }, keyMaterial, 256);
  return {
    hash: bytesToBase64Url(new Uint8Array(bits)),
    salt,
    iterations,
    algorithm: "PBKDF2-SHA-256",
  };
}

async function verifyPassword(password: string, user: DbUser): Promise<boolean> {
  if (!user.password_hash || !user.password_salt || !user.password_iterations) return false;
  const saltBytes = base64UrlToBytes(user.password_salt);
  const keyMaterial = await crypto.subtle.importKey("raw", utf8(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: user.password_iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return timingSafeEqual(bytesToBase64Url(new Uint8Array(bits)), user.password_hash);
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", utf8(token));
  return bytesToBase64Url(new Uint8Array(digest));
}

function randomToken(): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

function dateAfterDays(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function sessionCookie(token: string, expiresAt: string, secure: boolean): string {
  const parts = [`sideline_session=${token}`, "Path=/", "HttpOnly", "SameSite=Lax", `Expires=${new Date(expiresAt).toUTCString()}`];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function getCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const part = cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
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

function json(payload: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...jsonHeaders,
      ...headers,
    },
  });
}

function corsHeaders(): HeadersInit {
  return {
    ...jsonHeaders,
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
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
