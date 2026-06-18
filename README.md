# Sideline Ops

Milestone 0.4 deployable preview for Sideline Supplies, a PWA-style concessions and staffing operations app.

This project includes:

- React, TypeScript, and Vite frontend
- Cloudflare Pages-compatible Functions API under `functions/api`
- Cloudflare D1 schema and demo seed data under `migrations`
- Temporary persona switcher for Glenn/Admin, Manager, and Staff
- Admin create forms for staff, locations, events, and availability requests
- Targeted availability requests with recipient-aware response counts
- Basic PWA manifest/icons
- Settings/status screen for API, bootstrap, persona, app version, and environment

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

No secrets are required for Milestone 0.4.

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

8. Deploy.

9. Confirm API health after deploy by opening:

```txt
https://YOUR_DEPLOYED_URL/api/health
```

10. Confirm bootstrap/D1 after deploy by opening:

```txt
https://YOUR_DEPLOYED_URL/api/bootstrap
```

11. Open the deployed app and check Settings. It should show API health, bootstrap loaded, app version `0.4.0-dev`, and an environment label.

## Deployment Smoke Tests

After deploying, run these from a browser:

```txt
https://YOUR_DEPLOYED_URL/api/health
https://YOUR_DEPLOYED_URL/api/bootstrap
```

Then test the app UI:

1. Open the deployed URL.
2. Use `Glenn / Admin`.
3. Create a test staff member.
4. Create or choose an event.
5. Create an availability request targeted to the test staff member and Ava.
6. Switch the persona to `Staff`.
7. Open Requests.
8. Respond Yes, No, or Maybe.
9. Switch back to `Glenn / Admin`.
10. Open Availability.
11. Confirm Yes/No/Maybe/No response counts only include targeted staff.
12. Open Settings and confirm API status and environment.

## Phone Test Checklist

Use the deployed HTTPS URL for phone testing.

1. Open the deployed URL on iPhone Safari.
2. Use the demo persona switcher.
3. Tap Share, then Add to Home Screen.
4. Open Sideline from the Home Screen icon.
5. Confirm it opens in standalone app display.
6. Test Staff Requests and the Yes/No/Maybe buttons.
7. Switch to Glenn/Admin and inspect Dashboard, Staff, Events, Availability, and Settings.
8. Confirm mobile admin tables display as cards.
9. Confirm Settings shows API health and app version.
10. On Android Chrome, open the deployed URL.
11. Use Install app or Add to Home screen.
12. Open from the icon and repeat the staff/admin checks.

## Database Safety

- `npm run db:reset:local` is local only.
- Stop Pages/Wrangler dev before local reset because `.wrangler` SQLite files may be locked.
- Remote migrations should be deliberate.
- Do not run destructive reset commands against production.
- This project currently has no production reset command.

## Notes

Authentication is intentionally not implemented yet. The persona switcher is temporary scaffolding for UI and workflow testing.

Availability requests are targeted through `availability_request_recipients`. Admin response counts and staff request visibility use that table, so "No response" only includes users who were actually targeted.

The app is structured for later additions: web push notifications, inventory photo uploads, checklists, scheduling, Zettle integration, Google Calendar import, SMS fallback, and AI summaries.

## PWA Notes

The app includes a basic installable manifest with SVG placeholder icons. Production app-store-quality PNG icons are still a design TODO.
