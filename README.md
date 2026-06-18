# Sideline Ops

Milestone 0.5 preview-gated deployable app for Sideline Supplies, a PWA-style concessions and staffing operations app.

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
- `GET /api/activity`

## Cloudflare Pages Compatibility

Current structure is intended for Cloudflare Pages + Pages Functions + D1:

- Vite build output: `dist`
- Pages Functions: `functions/api`
- D1 migrations: `migrations`
- Wrangler config: `wrangler.jsonc`
- Required D1 binding: `SIDELINE_DB`
- D1 database name: `sideline-ops`

Milestone 0.5 uses one Pages environment variable:

```txt
SIDELINE_ACCESS_CODE
```

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

Do not commit the real access code to the repo.

9. Redeploy after setting or changing environment variables.

10. Confirm API health after deploy by opening:

```txt
https://YOUR_DEPLOYED_URL/api/health
```

11. Confirm bootstrap/D1 after deploy by opening:

```txt
https://YOUR_DEPLOYED_URL/api/bootstrap
```

12. Open the deployed app. The access gate should appear before the main app.

13. Enter the configured preview access code.

14. Check Settings. It should show API health, bootstrap loaded, access granted, app version `0.5.0-dev`, and an environment label.

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

## Deployment Smoke Tests

After deploying, run these from a browser:

```txt
https://YOUR_DEPLOYED_URL/api/health
https://YOUR_DEPLOYED_URL/api/bootstrap
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
15. Open Settings and confirm API status, access status, app version, and environment.
16. Click Lock app and confirm the access gate returns.

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
12. Tap Lock app in Settings and confirm the gate returns.
13. On Android Chrome, open the deployed URL.
14. Use Install app or Add to Home screen.
15. Open from the icon and repeat the access/staff/admin checks.

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
