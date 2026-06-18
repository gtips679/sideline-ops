# Sideline Ops

Milestone 1.1 preview-gated deployable app for Sideline Supplies, a PWA-style concessions and staffing operations app.

This project includes:

- React, TypeScript, and Vite frontend
- Cloudflare Pages-compatible Functions API under `functions/api`
- Cloudflare D1 schema and demo seed data under `migrations`
- Temporary persona switcher for Glenn/Admin, Manager, and Staff
- Admin create forms for staff, locations, events, and availability requests
- Targeted availability requests with recipient-aware response counts
- Basic PWA manifest/icons
- Settings/status screen for API, bootstrap, persona, app version, and environment
- Temporary preview access gate before the demo persona switcher
- Push notification opt-in, subscription capture, and manual test push sending

## Project Structure

```txt
src/app                     App shell, route state, navigation, global styles
src/components              Shared presentational components
src/features/staff          Staff list and staff-facing dashboard screens
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
- `GET /api/users`
- `POST /api/users`
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
- `POST /api/notifications/test-send`
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

14. Open the deployed app. The access gate should appear before the main app.

15. Enter the configured preview access code.

16. Check Settings. It should show API health, bootstrap loaded, access granted, app version `1.1.0-dev`, environment, service worker status, notification permission, and push subscription status.

## Preview Access Gate

The access gate is a temporary preview gate, not real staff authentication.

Behavior:

- First load shows an access-code screen.
- The client submits the entered code to `POST /api/access/verify`.
- The Pages Function compares it to `SIDELINE_ACCESS_CODE`.
- If `SIDELINE_ACCESS_CODE` is missing, the server accepts the local development code `sideline-dev`.
- The browser stores only `sideline_access_granted=true` and `sideline_access_granted_at`.
- The entered access code is not stored in localStorage.
- Settings has a Lock app button that clears preview access and returns to the gate.

For Cloudflare Pages, set `SIDELINE_ACCESS_CODE` separately for both Preview and Production environments, then redeploy.

## Push Notification Opt-In and Test Send

Milestone 1.1 registers a service worker, lets a browser save or disable a push subscription, and adds a manual test send button in Settings. It does not automatically send availability-request notifications or any real operational push campaigns yet.

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

Generate VAPID keys locally with a one-time command:

```bash
npx web-push generate-vapid-keys
```

Copy the public key to Cloudflare Pages as `VAPID_PUBLIC_KEY` for both Preview and Production. Store the private key as `VAPID_PRIVATE_KEY` in Cloudflare Pages environment variables only. Keep the private key out of the repo.

iPhone test-send flow:

1. Open the deployed URL in Safari.
2. Add Sideline Ops to the Home Screen.
3. Open Sideline from the Home Screen icon.
4. Unlock the access gate.
5. Go to Settings.
6. Enable notifications.
7. Tap Send test notification.
8. Confirm the phone receives "Test notification from Sideline Ops."

iPhone note: Web push is available only after the app is added to the Home Screen and opened from the Home Screen icon. Permission prompts may not appear in ordinary Safari tab mode.

Notification troubleshooting:

- Use HTTPS or local development.
- Confirm the app is opened from the Home Screen on iPhone.
- Check Settings for service worker support and registration status.
- If permission is `denied`, reset the site/app notification permission in browser or OS settings.
- If Settings says `Push config missing`, set `VAPID_PUBLIC_KEY` and redeploy.
- If test send says VAPID server configuration is missing, set `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`, then redeploy.
- If a subscription is inactive or expired, subscribe again from Settings. The test-send endpoint marks 404/410 push-service responses inactive.
- Redeploy after changing any Cloudflare Pages environment variables.
- This still uses the demo persona switcher and preview access gate, not real authentication.

## Deployment Smoke Tests

After deploying, run these from a browser:

```txt
https://YOUR_DEPLOYED_URL/api/health
https://YOUR_DEPLOYED_URL/api/bootstrap
https://YOUR_DEPLOYED_URL/api/notifications/config
```

Then test the app UI:

1. Open the deployed URL.
2. Confirm the access gate appears.
3. Enter a wrong code and confirm it is rejected.
4. Enter the configured preview access code.
5. Use `Glenn / Admin`.
6. Create a test staff member.
7. Create or choose an event.
8. Create an availability request targeted to the test staff member and Ava.
9. Switch the persona to `Staff`.
10. Open Requests.
11. Respond Yes, No, or Maybe.
12. Switch back to `Glenn / Admin`.
13. Open Availability.
14. Confirm Yes/No/Maybe/No response counts only include targeted staff.
15. Open Settings and confirm API status, access status, app version, environment, service worker status, and push config status.
16. If `VAPID_PUBLIC_KEY` is configured, click Enable notifications and confirm subscription status changes to subscribed.
17. If `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` are configured, click Send test notification and confirm attempted/sent/failed counts.
18. Click Disable notifications and confirm subscription status changes to not subscribed.
19. Click Lock app and confirm the access gate returns.

## Phone Test Checklist

Use the deployed HTTPS URL for phone testing.

1. Open the deployed URL on iPhone Safari.
2. Confirm the access gate appears.
3. Enter the preview access code.
4. Use the demo persona switcher.
5. Tap Share, then Add to Home Screen.
6. Open Sideline from the Home Screen icon.
7. Confirm it opens in standalone app display and stays unlocked.
8. Test Staff Requests and the Yes/No/Maybe buttons.
9. Switch to Glenn/Admin and inspect Dashboard, Staff, Events, Availability, and Settings.
10. Confirm mobile admin tables display as cards.
11. Confirm Settings shows API health, access status, environment, and app version.
12. Confirm Settings shows service worker, notification permission, push config, and subscription status.
13. If `VAPID_PUBLIC_KEY` is configured, test Enable notifications.
14. If `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` are configured, tap Send test notification and confirm the phone receives it.
15. Test Disable notifications.
16. Tap Lock app in Settings and confirm the gate returns.
17. On Android Chrome, open the deployed URL.
18. Use Install app or Add to Home screen.
19. Open from the icon and repeat the access/staff/admin/push-readiness checks.

## Database Safety

- `npm run db:reset:local` is local only.
- Stop Pages/Wrangler dev before local reset because `.wrangler` SQLite files may be locked.
- Remote migrations should be deliberate.
- Do not run destructive reset commands against production.
- This project currently has no production reset command.

## Notes

Authentication is intentionally not implemented yet. The persona switcher is temporary scaffolding for UI and workflow testing.

The access gate is also temporary. It prevents casual public access to the deployed preview but does not replace real authentication, authorization, audit controls, or staff login.

Availability requests are targeted through `availability_request_recipients`. Admin response counts and staff request visibility use that table, so "No response" only includes users who were actually targeted.

The app is structured for later additions: web push notifications, inventory photo uploads, checklists, scheduling, Zettle integration, Google Calendar import, SMS fallback, and AI summaries.

## PWA Notes

The app includes a basic installable manifest with SVG placeholder icons. Production app-store-quality PNG icons are still a design TODO.
