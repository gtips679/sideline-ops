# Sideline Ops

Milestone 2.0B login-first deployable app for Sideline Supplies, a PWA-style concessions and staffing operations app.

This project includes:

- React, TypeScript, and Vite frontend
- Cloudflare Pages-compatible Functions API under `functions/api`
- Cloudflare D1 schema and demo seed data under `migrations`
- Login-first account access with Owner/Admin/Staff role-based UI and API permissions
- Owner-only View As testing tool for Glenn
- Staff invites, password setup, login sessions, and staff profile management
- Admin create forms for staff, locations, events, and availability requests
- Targeted availability requests with recipient-aware response counts
- Basic PWA manifest/icons
- Settings/status screen for API, bootstrap, account, app version, environment, and notifications
- Push notification opt-in, device-aware diagnostics, and empty-push plus fetched notification test sending

## Project Structure

```txt
src/app                     App shell, route state, navigation, global styles
src/components              Shared presentational components
src/features/staff          Staff list and staff-facing dashboard screens
src/features/auth           Login and invite setup screens
src/features/locations      Location screens
src/features/events         Admin dashboard and event screens
src/features/availability   Availability admin and staff request screens
src/features/messages       Messaging placeholder
src/features/inventory      Inventory placeholder
src/features/checklists     Checklist placeholder
src/features/activity       Recent activity components
src/features/settings       Settings/status screen
src/lib                     API client, types, formatting, demo fallback data
functions/api               Cloudflare Pages Functions API routes
migrations                  D1 schema and seed data
```

## Local Development

Install dependencies:

```bash
npm install
```

Run the frontend-only Vite app. This mode is useful for UI work and falls back to local demo data if the API is not running:

```bash
npm run dev
```

Local default preview access code:

```txt
sideline-dev
```

Apply local D1 migrations:

```bash
npm run db:migrate:local
```

Build the frontend:

```bash
npm run build
```

Run the Cloudflare Pages/Functions/D1 stack locally:

```bash
npm run build
npm run pages:dev
```

Local Pages/API runs at:

```txt
http://127.0.0.1:8788
```

## Local Reset / Reseed

Stop any running Pages/Wrangler dev server before resetting. Local SQLite files under `.wrangler` can be locked while `npm run pages:dev` is running.

Windows reset/reseed:

```bash
npm run db:reset:local
```

Manual PowerShell equivalent:

```powershell
Get-NetTCPConnection -LocalPort 8788 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
Remove-Item -LiteralPath .wrangler -Recurse -Force
npm run db:migrate:local
```

This only affects local `.wrangler` state. Do not run destructive reset commands against production data.

## API Routes

- `POST /api/access/verify`
- `GET /api/health`
- `GET /api/bootstrap`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/invites?actor_user_id=...`
- `POST /api/invites/create`
- `GET /api/invites/:token`
- `POST /api/invites/:token/complete`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `GET /api/locations`
- `POST /api/locations`
- `GET /api/events`
- `POST /api/events`
- `GET /api/availability-requests`
- `POST /api/availability-requests`
- `POST /api/availability-responses`
- `GET /api/notifications/config`
- `POST /api/notifications/subscribe`
- `POST /api/notifications/unsubscribe`
- `GET /api/notifications/subscriptions?userId=...&deviceId=...`
- `POST /api/notifications/test-send`
- `POST /api/notifications/pending`
- `POST /api/notifications/mark-shown`
- `GET /api/activity`

## Cloudflare Pages Compatibility

Current structure is intended for Cloudflare Pages + Pages Functions + D1:

- Vite build output: `dist`
- Pages Functions: `functions/api`
- D1 migrations: `migrations`
- Wrangler config: `wrangler.jsonc`
- Required D1 binding: `SIDELINE_DB`
- D1 database name: `sideline-ops`

Preview access uses one Pages environment variable:

```txt
SIDELINE_ACCESS_CODE
```

Push subscription capture uses this Pages environment variable:

```txt
VAPID_PUBLIC_KEY
```

Manual test push sending also requires:

```txt
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

Example `VAPID_SUBJECT`:

```txt
mailto:gtips679@gmail.com
```

Never commit the private key to the repo.

## Cloudflare Deployment Checklist

1. Create the D1 database:

```bash
npx wrangler d1 create sideline-ops
```

2. Copy the returned database id into `wrangler.jsonc`, replacing:

```txt
replace-with-cloudflare-d1-database-id
```

3. Confirm the binding in `wrangler.jsonc`:

```txt
binding = SIDELINE_DB
database_name = sideline-ops
migrations_dir = migrations
```

4. Apply remote migrations deliberately:

```bash
npm run db:migrate:remote
```

5. Create or connect the Cloudflare Pages project.

6. Use these Pages build settings:

```txt
Build command: npm run build
Build output directory: dist
Functions directory: functions
```

7. Confirm the Pages project has the D1 binding:

```txt
SIDELINE_DB -> sideline-ops
```

8. Set the preview access code in Cloudflare Pages:

```txt
Settings -> Environment variables -> Production -> SIDELINE_ACCESS_CODE
Settings -> Environment variables -> Preview -> SIDELINE_ACCESS_CODE
```

9. Set the VAPID values in Cloudflare Pages:

```txt
Settings -> Environment variables -> Production -> VAPID_PUBLIC_KEY
Settings -> Environment variables -> Preview -> VAPID_PUBLIC_KEY
Settings -> Environment variables -> Production -> VAPID_PRIVATE_KEY
Settings -> Environment variables -> Preview -> VAPID_PRIVATE_KEY
Settings -> Environment variables -> Production -> VAPID_SUBJECT
Settings -> Environment variables -> Preview -> VAPID_SUBJECT
```

Do not commit the real access code to the repo.

Do not commit VAPID private keys to the repo. The public key can be configured in Pages; the future private key should be handled as a secret.

10. Redeploy after setting or changing environment variables.

11. Confirm API health after deploy by opening:

```txt
https://YOUR_DEPLOYED_URL/api/health
```

12. Confirm bootstrap/D1 after deploy by opening:

```txt
https://YOUR_DEPLOYED_URL/api/bootstrap
```

13. Confirm push config after deploy by opening:

```txt
https://YOUR_DEPLOYED_URL/api/notifications/config
```

14. Open the deployed app. The login screen should appear when signed out.

15. Sign in as Glenn/Owner. If Glenn has no password yet, use the owner bootstrap API path with `SIDELINE_OWNER_BOOTSTRAP_CODE` once to store a real password hash.

16. Check Settings. It should show API health, bootstrap loaded, app version `2.0.1-dev`, environment, service worker status, notification permission, this-device status, and account devices.

## Milestone 2.0B Production Auth and Roles

Normal app access is now login-first:

- `/invite/:token` remains public for staff setup.
- `/login` remains public.
- Logged-out users opening `/` are sent to `/login`.
- The old access-code gate remains in the codebase only as fallback/dev scaffolding and no longer blocks normal logged-in app use.
- Logged-in users do not need an access code.

Roles:

- Owner can access all admin, operational, settings, notification, profile, invite, and testing tools.
- Admin can access operational admin screens, create invites, edit staff profiles, deactivate/reactivate staff, create locations/events/availability requests, and use existing notification controls.
- Admin cannot change roles and cannot use owner testing/View As.
- Staff can access only My Dashboard, My Shifts placeholder, Requests, Messages placeholder, Tasks placeholder, and Upload Photos placeholder.
- Staff cannot access Staff admin, Locations, Events, Availability admin, Reports, Settings/debug, invite tools, or other users' profile data.
- `gtips679@gmail.com` and `user_glenn` are treated as Owner through effective-role logic even if the stored D1 `users.role` value is `staff` or `admin`.
- API user payloads return effective `role`; they may also include `storedRole`/`stored_role` for early-schema compatibility visibility.
- Future cleanup should rebuild or normalize role storage so D1 can store Owner directly without compatibility logic.

Owner View As:

- Glenn/Owner sees an `Owner Testing` control in the top bar.
- Owner can view the app as Glenn/Owner, Admin, or Staff without signing out.
- Admin and Staff never see this control.
- This uses the existing persona mechanics internally but is owner-only.

API permission model:

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, invite lookup, and invite completion remain public where needed.
- `GET /api/bootstrap` requires a valid session.
- Owner/Admin can receive full bootstrap/admin data.
- Staff bootstrap and availability APIs are filtered to the signed-in staff user.
- Staff management, invites, locations, events, availability-request creation, and activity APIs require Owner/Admin.
- Role changes require Owner.
- Staff availability responses can only be submitted by that same staff user unless an Owner/Admin is signed in.
- Unauthorized requests return JSON `401` or `403`.

Owner bootstrap setup:

- Existing seeded Glenn may not have a password yet.
- If Glenn has no password hash, `POST /api/auth/login` can set the first password only when the request includes a separate `bootstrap_code` matching `SIDELINE_OWNER_BOOTSTRAP_CODE`.
- The submitted `password` becomes Glenn's real stored password hash.
- No hardcoded bootstrap fallback is accepted.
- Once the password hash exists, the bootstrap code is ignored and normal password verification is required.
- Do not expose `SIDELINE_OWNER_BOOTSTRAP_CODE` in UI, logs, or source control.

## Milestone 2.0A Account Foundation

Milestone 2.0A added the account foundation. Milestone 2.0B made login the normal app gate and limited persona-style testing to Owner only.

Account workflow:

1. Sign in as Glenn/Owner.
2. Open Staff.
3. Create a staff invite link.
4. Open `/invite/:token` directly. Invite setup does not require login.
5. Staff enters name, required phone, required email, password, emergency contact, availability notes, and initial location availability.
6. The invite is marked used and cannot be completed again.
7. Staff signs in at `/login` using phone or email plus password.
8. Staff lands on My Dashboard with large tiles only: My Schedule, Availability Requests, Messages, and Tasks.

Security shape:

- Invite tokens are generated once and only the SHA-256 token hash is stored in D1.
- Invites are single-use and expire after roughly one month.
- Passwords use Workers-compatible Web Crypto PBKDF2-SHA-256 with per-user random salt.
- Session cookies are HttpOnly and store only a random token client-side; D1 stores only the session token hash.
- Deactivated users cannot log in.
- The access-code gate is retained only as fallback/dev code. Normal app access uses real login.

Roles:

- Owner can change user roles.
- Admin can manage staff profile fields but cannot change roles.
- Staff accounts created through generic invite links always start as Staff.
- Manager remains a legacy/demo route label only and is not a full role workflow in this milestone.

Admin profile management in Staff includes:

- Name, phone, email, emergency contact, basic availability notes
- Internal skills checklist
- Internal notes
- Location availability
- Active/deactivated status
- Owner-only role editing

Staff cannot see or edit internal skills, internal notes, or location availability after setup.

New account tables and fields are in `migrations/0005_accounts_invites_profiles.sql`:

- Expanded `users` profile/password fields and `owner` role support
- `invites`
- `sessions`
- `user_location_availability`
- `staff_schedule_views`
- `shift_assignments.first_viewed_at`
- `shift_assignments.last_viewed_at`
- `shift_assignments.confirmed_at`

Local account testing:

```bash
npm run db:migrate:local
npm run build
npm run pages:dev
```

Then open:

```txt
http://127.0.0.1:8788
http://127.0.0.1:8788/login
http://127.0.0.1:8788/invite/YOUR_CREATED_TOKEN
```

Remote deployment reminder:

```bash
npm run db:migrate:remote
```

Apply remote migrations deliberately. Do not run local reset workflows against production.

## Access Gate Status

The old access-code gate is retained only as fallback/dev scaffolding. Normal app access is now handled by `/login` and the HttpOnly session cookie.

`POST /api/access/verify` still exists, but the React app no longer shows the access gate in the normal flow. If Glenn has no stored password yet, the first owner bootstrap login requires `SIDELINE_OWNER_BOOTSTRAP_CODE`.

## Push Notification Opt-In and Test Send

Milestone 1.1.3 registers a service worker, lets each browser/device save or disable its own push subscription, shows device-aware diagnostics in Settings, and adds a preferred fetched-notification path. It does not automatically send availability-request notifications or any real operational push campaigns yet.

Each browser or installed PWA gets a local diagnostic identity:

```txt
sideline_device_id
sideline_device_label
```

This is not secure identity or authentication. It is only a local debugging label so Settings can distinguish an iPhone Home Screen PWA subscription from a desktop browser subscription.

Required for subscription capture:

```txt
VAPID_PUBLIC_KEY
```

Manual test sending also requires:

```txt
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

If `VAPID_PUBLIC_KEY` is missing, `/api/notifications/config` returns `pushEnabled=false`, Settings shows `Push config missing`, and the app continues to work without push.

If `VAPID_PRIVATE_KEY` or `VAPID_SUBJECT` is missing, `POST /api/notifications/test-send` returns a clear error and no push send is attempted.

Settings separates:

- This device: local device label/id, notification permission, service worker status, and this browser/PWA push subscription.
- Account/viewed-user devices: active/inactive subscriptions stored for the current signed-in user or the owner-selected View As user.
- Test push: send fetched, empty, or payload pushes to the current device only, or all active devices for the selected user.

Fetched vs empty vs payload push:

- Fetched notification is the preferred path. The server creates a pending `notification_deliveries` row, sends an empty push, and the service worker fetches pending notification content from `/api/notifications/pending`.
- Empty push sends a Web Push request with VAPID authentication but no body and no pending delivery. The service worker should show `Empty push received by Sideline Ops.`
- Payload push sends the encrypted JSON test payload using Web Push `aes128gcm` message encryption. Payload push is currently unreliable and remains diagnostic only.
- Safe debug results include endpoint host, VAPID audience, HTTP status, send mode, success/failure, and whether a subscription was marked inactive. Full endpoints, push keys, auth secrets, and private keys are never returned.

Temporary security note: `/api/notifications/pending` uses the push subscription endpoint as a lookup token because service worker push events do not carry the app session cookie in a normal page request. This is acceptable for the current non-sensitive preview test content only. Do not use this path for sensitive notification content until device-scoped tokens exist.

Generate VAPID keys locally with a one-time command:

```bash
npx web-push generate-vapid-keys
```

Copy the public key to Cloudflare Pages as `VAPID_PUBLIC_KEY` for both Preview and Production. Store the private key as `VAPID_PRIVATE_KEY` in Cloudflare Pages environment variables only. Keep the private key out of the repo.

iPhone test-send flow:

1. Open the deployed URL in Safari.
2. Add Sideline Ops to the Home Screen.
3. Open Sideline from the Home Screen icon.
4. Sign in.
5. If signed in as Owner, choose the intended View As user.
6. Go to Settings.
7. Enable notifications.
8. Confirm the iPhone appears under the selected user's subscribed devices.
9. Tap Show local test notification on the phone.
10. From desktop, open the same deployed app and sign in as the same user, or use Owner View As.
11. In Settings, send a fetched notification to the iPhone/current device if testing on the phone, or all devices for that user if testing from desktop.
12. Put the phone on the Home Screen or lock it, then send a fetched notification from desktop to the phone/all devices.
13. Use empty push only as a delivery diagnostic and payload push only as an encrypted-payload diagnostic.
14. Confirm the phone receives "Fetched test notification from Sideline Ops."

Diagnostic interpretation:

- Local notification works, empty push fails: likely VAPID/auth/audience/env var or endpoint issue.
- Local notification works, empty push works, fetched notification works: usable notification path is good.
- Local notification works, empty push works, fetched notification fails: check `/api/notifications/pending`, endpoint matching, or delivery rows.
- Local notification works, empty push works, payload push fails: encrypted payload path still needs future work, but it is not blocking.
- Local notification works, empty push works, payload push works: encrypted server push path is also good.
- Empty/payload send says sent but no visible notification: check Focus/Do Not Disturb, app state, iOS notification settings, or endpoint/device/persona mismatch.

iPhone note: Web push is available only after the app is added to the Home Screen and opened from the Home Screen icon. Permission prompts may not appear in ordinary Safari tab mode.

Notification troubleshooting:

- Use HTTPS or local development.
- Confirm the app is opened from the Home Screen on iPhone.
- Check Settings for service worker support and registration status.
- If permission is `denied`, reset the site/app notification permission in browser or OS settings.
- If Settings says `Push config missing`, set `VAPID_PUBLIC_KEY` and redeploy.
- If test send says VAPID server configuration is missing, set `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`, then redeploy.
- If desktop is subscribed but phone is not, subscribe again from the iPhone Home Screen PWA.
- If the iPhone is subscribed under a different user, switch Owner View As to that user or resubscribe with the intended user selected.
- If a subscription is inactive or expired, subscribe again from Settings. The test-send endpoint marks 404/410 push-service responses inactive.
- If local notification works but empty server push does not, check VAPID env vars, audience, deployment, subscription targeting, and push-service delivery.
- If empty push works but fetched notification does not, check pending deliveries, endpoint matching, and service worker fetch access.
- If empty push works but payload push does not, check Web Push `aes128gcm` encryption and subscription keys.
- If local notification fails, check permission, PWA install mode, Focus/Do Not Disturb, and service worker status.
- Redeploy after changing any Cloudflare Pages environment variables.
- Notification settings now use the signed-in account or owner-only View As user.

## Deployment Smoke Tests

After deploying, run these from a browser:

```txt
https://YOUR_DEPLOYED_URL/api/health
https://YOUR_DEPLOYED_URL/api/bootstrap
https://YOUR_DEPLOYED_URL/api/notifications/config
```

Then test the app UI:

1. Open the deployed URL.
2. Confirm `/login` appears when logged out.
3. Sign in as Glenn/Owner.
4. Confirm Owner Testing / View As appears.
5. Open Staff and create a test invite link.
6. Open the invite link in a fresh tab and confirm it loads without login.
7. Submit the invite form with missing required fields and confirm validation.
8. Complete the invite with phone, email, password, emergency contact, availability notes, and location choices.
9. Open the invite link again and confirm reuse is rejected.
10. Sign in at `/login` with the new staff email and password.
11. Sign out, then sign in with the new staff phone and password.
12. Confirm Staff My Dashboard shows only tiles and no schedule details.
13. Confirm Staff cannot access admin screens or admin APIs.
14. Sign in as Owner and edit the staff profile.
15. Use an Admin account and confirm Owner Testing is hidden.
16. Confirm Admin role changes are rejected with `403`.
17. Deactivate the staff account and confirm login is rejected.
18. Reactivate the staff account.
19. Create or choose an event.
20. Create an availability request targeted to the test staff member.
21. Sign in as that Staff user, open Requests, and respond Yes/No/Maybe.
22. Sign in as Owner/Admin, open Availability, and confirm counts only include targeted staff.
23. Open Settings and confirm API status, account status, app version, environment, service worker status, and push config status.
24. If `VAPID_PUBLIC_KEY` is configured, click Enable notifications and confirm subscription status changes to subscribed.
25. Confirm the current browser appears in account/viewed-user devices without exposing full endpoints or keys.
26. Use Show local test notification to confirm the device can display notifications.
27. If `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` are configured, click fetched notification for current device or all devices and confirm attempted/sent/failed counts and deliveries created.
28. Use empty and payload buttons only for diagnostics.
29. Click Disable notifications and confirm subscription status changes to not subscribed.

## Phone Test Checklist

Use the deployed HTTPS URL for phone testing.

1. Open the deployed URL on iPhone Safari.
2. Confirm `/login` appears.
3. Sign in with a real Staff or Owner/Admin account.
4. Tap Share, then Add to Home Screen.
5. Open Sideline from the Home Screen icon.
6. Confirm it opens in standalone app display and stays signed in.
7. Test Staff Requests and the Yes/No/Maybe buttons.
8. Sign in as Owner/Admin and inspect Dashboard, Staff, Events, Availability, and Settings.
9. Confirm mobile admin tables display as cards.
10. Confirm Settings shows API health, account status, environment, and app version.
11. Confirm Settings shows service worker, notification permission, push config, and subscription status.
12. If `VAPID_PUBLIC_KEY` is configured, test Enable notifications.
13. Confirm the phone appears under the signed-in or Owner View As user's subscribed devices and is marked current device.
14. Tap Show local test notification.
15. If `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` are configured, tap Send fetched notification to this device and confirm the phone receives it.
16. Optionally test empty push as delivery-only diagnostic and payload push as encrypted-payload diagnostic.
17. Test Disable notifications.
18. Sign out and confirm `/login` returns.
19. On Android Chrome, open the deployed URL.
20. Use Install app or Add to Home screen.
21. Open from the icon and repeat the login/staff/admin/push-readiness checks.

## Database Safety

- `npm run db:reset:local` is local only.
- Stop Pages/Wrangler dev before local reset because `.wrangler` SQLite files may be locked.
- Remote migrations should be deliberate.
- Do not run destructive reset commands against production.
- This project currently has no production reset command.

## Notes

Authentication is now the normal app gate. Owner-only View As remains as a testing tool for Glenn.

The old access-code gate remains only as fallback/dev scaffolding and is not used in the normal app flow.

Availability requests are targeted through `availability_request_recipients`. Admin response counts and staff request visibility use that table, so "No response" only includes users who were actually targeted.

The app is structured for later additions: web push notifications, inventory photo uploads, checklists, scheduling, Zettle integration, Google Calendar import, SMS fallback, and AI summaries.

## PWA Notes

The app includes a basic installable manifest with SVG placeholder icons. Production app-store-quality PNG icons are still a design TODO.
