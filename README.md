# Sideline Ops

Milestone 0.3 foundation for Sideline Supplies, a PWA-style concessions and staffing operations app.

This project includes:

- React, TypeScript, and Vite frontend
- Cloudflare Pages-compatible Functions API under `functions/api`
- Cloudflare D1 schema and demo seed data under `migrations`
- Temporary persona switcher for Glenn/Admin, Manager, and Staff
- Responsive admin and staff app shell
- Admin create forms for staff, locations, events, and availability requests
- Targeted availability requests with recipient-aware response counts
- Basic PWA manifest/icons
- Settings/status screen for API, bootstrap, persona, and build info

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
src/lib                     API client, types, formatting, demo fallback data
functions/api               Cloudflare Pages Functions API routes
migrations                  D1 schema and seed data
```

## Local Setup

Install dependencies:

```bash
npm install
```

Run the frontend-only Vite app. This mode is useful for UI work and falls back to local demo data if the API is not running:

```bash
npm run dev
```

Create the D1 database in Cloudflare, then replace the placeholder `database_id` in `wrangler.jsonc`:

```bash
npx wrangler d1 create sideline-ops
```

Apply migrations locally:

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

Apply the migration to the remote D1 database when ready:

```bash
npm run db:migrate:remote
```

## Local Reset / Reseed

To wipe local persisted Wrangler/D1 state and rerun migrations on Windows:

```bash
npm run db:reset:local
```

Manual PowerShell equivalent:

```powershell
Get-NetTCPConnection -LocalPort 8788 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
Remove-Item -LiteralPath .wrangler -Recurse -Force
npm run db:migrate:local
```

This only affects local `.wrangler` state. It does not touch the remote D1 database.

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

Smoke-test local Pages/API mode:

```powershell
Invoke-RestMethod http://127.0.0.1:8788/api/health
Invoke-RestMethod http://127.0.0.1:8788/api/bootstrap
```

## Cloudflare Deployment Notes

Cloudflare Pages should build the Vite app and serve the Functions API from `functions/api`.

Recommended build settings:

- Build command: `npm run build`
- Build output directory: `dist`
- Functions directory: `functions`

Required binding:

- D1 binding name: `SIDELINE_DB`
- Database name: `sideline-ops`

Before deploying against a real Cloudflare account:

```bash
npx wrangler d1 create sideline-ops
```

Copy the returned database id into `wrangler.jsonc`, replacing `replace-with-cloudflare-d1-database-id`.

Apply remote migrations:

```bash
npm run db:migrate:remote
```

No secrets are required for Milestone 0.3. Future milestones may add secrets or bindings for auth, push notifications, SMS, uploads, and integrations.

## Notes

Authentication is intentionally not implemented yet. The persona switcher is temporary scaffolding for UI and workflow testing.

Availability requests are targeted through `availability_request_recipients`. Admin response counts and staff request visibility use that table, so "No response" only includes users who were actually targeted.

The app is structured for later additions: web push notifications, inventory photo uploads, checklists, scheduling, Zettle integration, Google Calendar import, SMS fallback, and AI summaries.

## PWA Notes

The app includes a basic installable manifest with SVG placeholder icons. Production app-store-quality PNG icons are still a design TODO.
