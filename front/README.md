# Inventuurisusteem / Inventory System

Modern office inventory system frontend built with React + Vite + Tailwind and PocketBase SDK.

## Tech Stack

- Frontend: React (JavaScript), Vite, Tailwind CSS, React Router
- Backend/Auth/Database: PocketBase (direct SDK usage from frontend)
- Deployment target: Coolify

## Features

- Email/password registration and login
- OAuth login through PocketBase auth providers
- Persistent login session (if token remains valid)
- Role-based UI and route access:
  - Admin: full devices CRUD, assignment to users
  - Worker: view devices and add notes
- Dashboard with device status counters
- Devices table with search and status badges
- Device details page with notes timeline
- Loading, error, and empty states
- Responsive sidebar + content layout

## Project Structure

```text
src/
  app/
  components/
  contexts/
  hooks/
  lib/
  pages/
  routes/
  utils/
```

## Environment Variables

Create .env in project root:

```bash
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

See .env.example for template.

## PocketBase Collections

### 1) users (auth collection)

Fields:
- name (text)
- role (select: admin, worker)

Behavior implemented in app:
- Standard registration creates role = worker
- OAuth login tries to set worker role for newly created users if role is missing
- Admin users should be created manually in PocketBase

### 2) devices (base collection)

Fields:
- name
- type
- inventory_number
- serial_number
- status
- assigned_to (relation -> users)
- description

### 3) device_notes (base collection)

Fields:
- device (relation -> devices)
- author (relation -> users)
- text

## Recommended PocketBase Rules

### devices

- listRule: @request.auth.id != ""
- viewRule: @request.auth.id != ""
- createRule: @request.auth.role = "admin"
- updateRule: @request.auth.role = "admin"
- deleteRule: @request.auth.role = "admin"

### device_notes

- listRule: @request.auth.id != ""
- viewRule: @request.auth.id != ""
- createRule: @request.auth.id != ""
- updateRule: author = @request.auth.id
- deleteRule: author = @request.auth.id || @request.auth.role = "admin"

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Open app URL from Vite output (usually http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

## Deploying on Coolify

Use a static frontend deployment (Node build):

- Install command: npm install
- Build command: npm run build
- Start command: npm run preview -- --host 0.0.0.0 --port $PORT
- Expose port: $PORT (or fixed preview port configured in Coolify)
- Environment variable required: VITE_POCKETBASE_URL

## Notes

- There is no Express proxy layer: all API/auth calls are done with PocketBase JS SDK.
- Ensure OAuth providers are configured in PocketBase Auth settings to see OAuth buttons on login page.
