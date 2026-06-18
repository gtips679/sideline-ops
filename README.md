# Sideline Ops

Phase 0 architecture shell for Sideline Supplies, a PWA-style concessions and staffing operations app.

This project includes:

- React, TypeScript, and Vite frontend
- Cloudflare Pages-compatible Functions API under `functions/api`
- Cloudflare D1 schema and demo seed data under `migrations`
- Temporary persona switcher for Glenn/Admin, Manager, and Staff
- Responsive admin and staff app shell

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

## Setup

Install dependencies:

```bash
npm install
```

Run the frontend with demo fallback data:

```bash
npm run dev
```

Create the D1 database in Cloudflare, then replace the placeholder `database_id` in `wrangler.jsonc`:

```bash
npx wrangler d1 create sideline-ops
```

Apply the migration locally:

```bash
npm run db:migrate:local
```

Build and run the Pages/Functions/D1 stack locally:

```bash
npm run build
npm run pages:dev
```

Apply the migration to the remote D1 database when ready:

```bash
npm run db:migrate:remote
```

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

## Notes

Authentication is intentionally not implemented in Phase 0. The persona switcher is temporary scaffolding for UI and workflow testing.

The app is structured for later additions: web push notifications, inventory photo uploads, checklists, scheduling, Zettle integration, Google Calendar import, SMS fallback, and AI summaries.
