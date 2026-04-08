# PocketBase Schema Requirements (Workspace Billing)

The frontend now expects workspace-based billing and limits. If `workspaces` does not exist,
Billing/Devices/Dashboard cannot load correctly.

## Required collections

### 1) workspaces (base collection)

Create collection: `workspaces`

Fields:
- `name` (text, required)
- `owner` (relation -> `users`, maxSelect: 1)
- `subscription_status` (select: `inactive`, `trialing`, `active`, `past_due`, `canceled`; default `inactive`)
- `device_limit` (number, default `10`)
- `stripe_customer_id` (text)
- `stripe_subscription_id` (text)
- `stripe_price_id` (text)

Recommended API rules:
- listRule: `owner = @request.auth.id || id = @request.auth.workspace || @request.auth.role = "admin"`
- viewRule: `owner = @request.auth.id || id = @request.auth.workspace || @request.auth.role = "admin"`
- createRule: `@request.auth.role = "admin"`
- updateRule: `owner = @request.auth.id || @request.auth.role = "admin"`
- deleteRule: `@request.auth.role = "admin"`

### 2) users (auth collection)

Ensure fields exist:
- `name` (text)
- `role` (select: `admin`, `worker`)
- `workspace` (relation -> `workspaces`, maxSelect: 1)

Recommended API rules:
- listRule: `@request.auth.role = "admin" || id = @request.auth.id`
- viewRule: `@request.auth.role = "admin" || id = @request.auth.id`
- updateRule: `@request.auth.role = "admin" || id = @request.auth.id`
- options.manageRule: `@request.auth.role = "admin"`

### 3) devices (base collection)

Ensure field exists:
- `workspace` (relation -> `workspaces`, maxSelect: 1, required)

Recommended API rules:
- listRule: `@request.auth.id != "" && workspace = @request.auth.workspace`
- viewRule: `@request.auth.id != "" && workspace = @request.auth.workspace`
- createRule: `@request.auth.role = "admin" && workspace = @request.auth.workspace`
- updateRule: `@request.auth.role = "admin" && workspace = @request.auth.workspace`
- deleteRule: `@request.auth.role = "admin" && workspace = @request.auth.workspace`

### 4) device_notes (base collection)

Keep notes scoped to the same workspace as parent device in rules/app logic.

## Optional: server-side device cap enforcement

Deploy hook file:
- `pocketbase/pb_hooks/devices-limit.pb.js`

Hook behavior:
- `inactive` workspace: enforce `device_limit` (default `10`)
- `active`/`trialing` workspace: unlimited create
