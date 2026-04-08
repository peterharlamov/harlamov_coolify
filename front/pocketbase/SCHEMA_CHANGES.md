# PocketBase Schema and Rules Changes

Apply these changes in PocketBase Admin UI.

## 1) users (auth collection)

Required fields:
- name (text)
- role (select: admin, worker)
- workspace (relation -> workspaces, maxSelect=1)

Rules:
- listRule: @request.auth.role = "admin" || id = @request.auth.id
- viewRule: @request.auth.role = "admin" || id = @request.auth.id
- updateRule: @request.auth.role = "admin" || id = @request.auth.id
- options.manageRule: @request.auth.role = "admin"

## 2) workspaces (new base collection)

Fields:
- name (text, required)
- owner (relation -> users, maxSelect=1)
- subscription_status (select: inactive, trialing, active, past_due, canceled; default inactive)
- device_limit (number, default 10)
- stripe_customer_id (text)
- stripe_subscription_id (text)
- stripe_price_id (text)

Recommended rules:
- listRule: owner = @request.auth.id || id = @request.auth.workspace || @request.auth.role = "admin"
- viewRule: owner = @request.auth.id || id = @request.auth.workspace || @request.auth.role = "admin"
- createRule: @request.auth.role = "admin"
- updateRule: owner = @request.auth.id || @request.auth.role = "admin"
- deleteRule: @request.auth.role = "admin"

## 3) devices collection updates

Add field:
- workspace (relation -> workspaces, maxSelect=1, required)

Recommended rules:
- listRule: @request.auth.id != "" && workspace = @request.auth.workspace
- viewRule: @request.auth.id != "" && workspace = @request.auth.workspace
- createRule: @request.auth.role = "admin" && workspace = @request.auth.workspace
- updateRule: @request.auth.role = "admin" && workspace = @request.auth.workspace
- deleteRule: @request.auth.role = "admin" && workspace = @request.auth.workspace

## 4) device_notes collection updates

Keep notes scoped by related device workspace in your app logic and rules. Basic rules can remain, but ideally bind to same workspace as parent device.

## 5) Server-side device cap enforcement

Deploy hook file:
- pocketbase/pb_hooks/devices-limit.pb.js

This hook enforces:
- free/inactive workspace -> max device_limit (default 10)
- active/trialing workspace -> unlimited creation

This is server-side enforcement inside PocketBase (not only frontend).
