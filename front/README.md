# Inventuurisusteem / Inventory System

Office Device Inventory with workspace-level subscriptions.

## Stack

- Frontend: React + Vite + Tailwind + React Router
- Main data/auth: PocketBase SDK directly from frontend
- Billing backend: Node.js + Express + Stripe (checkout + webhook)

## What is implemented

- Auth with PocketBase (email/password + OAuth)
- Role model: admin, worker
- Admin-only Users page and Billing page
- Workspace-based device tracking
- Subscription-based limits:
  - Free workspace: max 10 devices
  - Active/trialing subscription: unlimited devices
- Frontend limit warnings and blocked create action
- Server-side device limit enforcement using PocketBase hook
- Stripe subscription checkout and webhook provisioning

## Updated project structure

```text
backend/
  .env.example
  package.json
  src/
    server.js
pocketbase/
  SCHEMA_CHANGES.md
  pb_hooks/
    devices-limit.pb.js
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

## Environment variables

### Frontend (.env)

```bash
VITE_POCKETBASE_URL=http://127.0.0.1:8090
VITE_API_URL=http://localhost:4000
VITE_STRIPE_PUBLISHABLE_KEY=
```

### Backend (backend/.env)

```bash
PORT=4000
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
CLIENT_URL=http://localhost:5173
POCKETBASE_URL=http://127.0.0.1:8090
PB_ADMIN_EMAIL=
PB_ADMIN_PASSWORD=
```

## PocketBase schema and rules

Apply all required changes from:

- pocketbase/SCHEMA_CHANGES.md

Critical users rules for visibility fix:

- listRule: @request.auth.role = "admin" || id = @request.auth.id
- viewRule: @request.auth.role = "admin" || id = @request.auth.id
- updateRule: @request.auth.role = "admin" || id = @request.auth.id
- options.manageRule: @request.auth.role = "admin"

This is what allows admin to list all users, while worker can only see self.

## Stripe subscription flow

1. Admin opens Billing page and clicks Upgrade to Unlimited.
2. Frontend calls backend endpoint:
   - POST /api/create-subscription-checkout-session
3. Backend creates Stripe Checkout session in subscription mode.
4. Stripe redirects user back to frontend Billing page.
5. Stripe webhook calls backend:
   - POST /api/stripe/webhook
6. Backend updates workspace in PocketBase:
   - active/trialing -> unlimited limit (large value)
   - canceled/past_due/inactive -> limit reset to 10 for future creation

## Server-side limit enforcement

- Hook file: pocketbase/pb_hooks/devices-limit.pb.js
- It blocks creating devices when free workspace has reached limit.
- Existing devices are preserved; only new creation is blocked.

## Local development

1. Install frontend dependencies:

```bash
npm install
```

2. Install backend dependencies:

```bash
npm --prefix backend install
```

3. Run backend:

```bash
npm run backend:dev
```

4. Run frontend:

```bash
npm run dev
```

## Stripe webhook local testing

Use Stripe CLI and forward webhook events to backend:

```bash
stripe listen --forward-to localhost:4000/api/stripe/webhook
```

Copy webhook signing secret to backend .env as STRIPE_WEBHOOK_SECRET.

## Coolify notes

- Frontend and backend should be deployed as separate services.
- Frontend needs VITE_API_URL pointing to backend public URL.
- Backend must have Stripe secret env variables and PocketBase admin credentials.
