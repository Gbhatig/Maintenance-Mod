MANUFACTURING MODULE
Full Product Development Document
Database • Backend • Frontend • Security • Testing • DevOps
Build-ready specification for: Sites, Employees, Shifts, Machines (Masters Module)
Version 2.0  |  September 2026
1. Purpose & Scope
This document is a complete, build-ready specification for developing the Manufacturing Module’s Masters foundation — Sites, Employees, Shifts, and Machines — as a fully functional web application. It is written so a development team can start coding directly from it: database schema (DDL), backend API contracts (request/response JSON), frontend architecture and components, authentication/security, testing strategy, and deployment/DevOps setup are all included.
Scope boundary: the four Masters screens supplied are specified to full implementation depth (schema, API, UI, tests). The remaining eight nav menus (Orders, Inventory, Planning & Scheduling, Production, Quality, Maintenance, Dispatch, Dashboards) are scoped at architecture level only — with foreign-key stubs so the Masters schema is forward-compatible — since no reference screens exist for them yet. Section 15 flags this explicitly so nothing is assumed to be “covered” that isn’t.
2. System Architecture
2.1 High-Level Architecture (3-tier)
Presentation tier: React SPA served via CDN, talking to the backend only through versioned REST APIs (no direct DB access from browser).
Application tier: stateless Node.js (NestJS) API servers behind a load balancer, horizontally scalable; each request authenticated via JWT and authorized via RBAC middleware before hitting business logic.
Data tier: PostgreSQL (primary, relational, ACID for masters/transactions) + Redis (session/cache, rate-limiting counters) + S3-compatible object storage (employee photos, machine documents, bulk-import files).
| [ Browser / SPA ]  --HTTPS-->  [ CDN + Static Hosting (frontend build) ]
|
v  HTTPS (REST/JSON, JWT bearer)
[ API Gateway / Load Balancer ]
|
v
[ NestJS App Servers (stateless, auto-scaled) ]
|            |              |
v            v              v
[ PostgreSQL ] [ Redis Cache ] [ S3 Object Storage ]
|
v
[ Background Workers (bulk import, notifications, audit) ]
|
2.2 Technology Stack (final)
| | Layer
| Choice
| Reason
|
| Frontend framework
| React 18 + TypeScript
| Type safety for large forms (Employee/Machine) and complex grid state
|
| UI/state
| TanStack Table (grids), React Hook Form + Zod (forms/validation), Redux Toolkit (global site context, auth)
| Matches the sortable/searchable grid and multi-field forms in the reference screens
|
| Backend framework
| Node.js 20 + NestJS (TypeScript)
| Opinionated modules/DI — clean mapping to Sites/Employees/Shifts/Machines modules
|
| ORM
| Prisma
| Type-safe queries, migrations, works cleanly with the self-referencing machine tree
|
| Database
| PostgreSQL 16
| Recursive CTEs for machine hierarchy, row-level security by site_id, JSONB for machine parameters
|
| Cache/session
| Redis 7
| JWT refresh-token store, rate limiting, grid-query caching
|
| File storage
| S3-compatible (AWS S3 / MinIO)
| Bulk-import CSVs, employee documents
|
| Auth
| JWT (access + refresh) via NestJS Passport, OTP via SMS gateway for shop-floor login
| Office + shop-floor login patterns both required (§6.4)
|
| Infra
| Docker + Kubernetes (or ECS), Nginx ingress, GitHub Actions CI/CD
| Horizontal scale, blue-green deploys
|
| Monitoring
| OpenTelemetry → Grafana/Prometheus, Sentry for FE/BE error tracking
| Production-grade observability
|
3. Database Design
3.1 Entity-Relationship Summary
sites (1)—(N) warehouses · sites (1)—(N) machines · sites (N)—(N) employees via employee_sites · warehouses (N)—(N) employees via employee_warehouses · departments (1)—(N) roles · roles (1)—(N) employees · shifts (1)—(N) shift_working_days · employees (N)—(N) shifts via employee_shift_roster · machines (1)—(N) machines (self-referencing parent_machine_id) · machines (1)—(N) machine_production_params · machines (1)—(N) machine_parameters · machines (N)—(N) shifts via machine_shift_assignment.
3.2 Full DDL — Core Schema (PostgreSQL)
| -- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- ============================================================
-- SITES
-- ============================================================
CREATE TABLE sites (
id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
code            VARCHAR(20) UNIQUE NOT NULL,
name            VARCHAR(150) NOT NULL,
address         TEXT,
city            VARCHAR(100),
state           VARCHAR(100),
country         CHAR(2) NOT NULL DEFAULT 'IN',
gst_no          VARCHAR(30),
timezone        VARCHAR(50) DEFAULT 'Asia/Kolkata',
status          VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'
CHECK (status IN ('ACTIVE','INACTIVE')),
is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
created_by      UUID,
created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_by      UUID,
updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sites_name    ON sites (name) WHERE is_deleted = FALSE;
CREATE INDEX idx_sites_city    ON sites (city);
CREATE UNIQUE INDEX uq_sites_name_active ON sites (lower(name)) WHERE is_deleted = FALSE;
-- ============================================================
-- WAREHOUSES
-- ============================================================
CREATE TABLE warehouses (
id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
name        VARCHAR(150) NOT NULL,
type        VARCHAR(30) NOT NULL
CHECK (type IN ('FABRICATION','GALVANIZING','FG_YARD','RAW_MATERIAL','OTHER')),
is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_warehouses_site ON warehouses (site_id);
-- ============================================================
-- DEPARTMENTS / ROLES
-- ============================================================
CREATE TABLE departments (
id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
name        VARCHAR(100) NOT NULL UNIQUE,
is_deleted  BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE roles (
id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
name            VARCHAR(100) NOT NULL,
permission_set  JSONB NOT NULL DEFAULT '{}',
is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
UNIQUE (department_id, name)
);
-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE TABLE employees (
id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
emp_code      VARCHAR(20) UNIQUE NOT NULL,
name          VARCHAR(150) NOT NULL,
mobile        VARCHAR(20),
email         VARCHAR(150),
department_id UUID NOT NULL REFERENCES departments(id),
role_id       UUID NOT NULL REFERENCES roles(id),
landing_page  VARCHAR(50) NOT NULL DEFAULT 'DEFAULT',
status        VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'
CHECK (status IN ('ACTIVE','INACTIVE')),
is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
created_by    UUID,
created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_by    UUID,
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
CONSTRAINT chk_contact_present CHECK (mobile IS NOT NULL OR email IS NOT NULL)
);
CREATE INDEX idx_employees_dept ON employees (department_id);
CREATE UNIQUE INDEX uq_employees_email ON employees (lower(email)) WHERE email IS NOT NULL AND is_deleted = FALSE;
CREATE TABLE employee_sites (
employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
PRIMARY KEY (employee_id, site_id)
);
CREATE TABLE employee_warehouses (
employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
PRIMARY KEY (employee_id, warehouse_id)
);
-- ============================================================
-- SHIFTS
-- ============================================================
CREATE TABLE shifts (
id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
site_id        UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
name           VARCHAR(100) NOT NULL,
start_time     TIME NOT NULL,
end_time       TIME NOT NULL,
is_overnight   BOOLEAN NOT NULL DEFAULT FALSE,
break_minutes  INTEGER NOT NULL DEFAULT 0 CHECK (break_minutes >= 0),
gross_minutes  INTEGER NOT NULL,
net_minutes    INTEGER NOT NULL,
is_deleted     BOOLEAN NOT NULL DEFAULT FALSE,
created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
UNIQUE (site_id, name)
);
CREATE TABLE shift_working_days (
shift_id    UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
PRIMARY KEY (shift_id, day_of_week)
);
CREATE TABLE employee_shift_roster (
id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
shift_id        UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
effective_from  DATE NOT NULL,
effective_to    DATE,
CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE INDEX idx_roster_employee ON employee_shift_roster (employee_id, effective_from);
-- ============================================================
-- MACHINES  (self-referencing tree, ISA-95 Work Center/Unit)
-- ============================================================
CREATE TABLE machines (
id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
site_id           UUID NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
warehouse_id      UUID REFERENCES warehouses(id) ON DELETE SET NULL,
parent_machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
name              VARCHAR(150) NOT NULL,
level             SMALLINT NOT NULL DEFAULT 0,
path              TEXT NOT NULL,
is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
UNIQUE (parent_machine_id, name)
);
CREATE INDEX idx_machines_site   ON machines (site_id);
CREATE INDEX idx_machines_path   ON machines USING gin (path gin_trgm_ops);
CREATE INDEX idx_machines_parent ON machines (parent_machine_id);
CREATE TABLE machine_production_params (
id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
machine_id   UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
metric_name  VARCHAR(100) NOT NULL,
unit         VARCHAR(30) NOT NULL,
is_active    BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE machine_parameters (
id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
parameter_name  VARCHAR(100) NOT NULL,
min_value       NUMERIC(12,2),
max_value       NUMERIC(12,2),
unit            VARCHAR(30)
);
CREATE TABLE machine_shift_assignment (
machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
shift_id   UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
PRIMARY KEY (machine_id, shift_id)
);
-- ============================================================
-- AUTH & AUDIT
-- ============================================================
CREATE TABLE users (
id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
employee_id    UUID UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
username       VARCHAR(100) UNIQUE NOT NULL,
password_hash  VARCHAR(255),
last_login_at  TIMESTAMPTZ,
is_locked      BOOLEAN NOT NULL DEFAULT FALSE,
created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE audit_log (
id           BIGSERIAL PRIMARY KEY,
entity_name  VARCHAR(50) NOT NULL,
entity_id    UUID NOT NULL,
action       VARCHAR(10) NOT NULL CHECK (action IN ('CREATE','UPDATE','DELETE')),
actor_id     UUID NOT NULL REFERENCES users(id),
diff         JSONB,
created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_log (entity_name, entity_id);
-- ============================================================
-- ROW LEVEL SECURITY (per-site data isolation)
-- ============================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines  ENABLE ROW LEVEL SECURITY;
CREATE POLICY employees_site_isolation ON employees
USING (id IN (SELECT employee_id FROM employee_sites
WHERE site_id = ANY (current_setting('app.current_site_ids')::uuid[])));
|
3.3 Recursive Query — Fetch Full Machine Tree for a Site
| WITH RECURSIVE machine_tree AS (
SELECT id, parent_machine_id, name, level, path
FROM machines
WHERE site_id = $1 AND parent_machine_id IS NULL AND is_deleted = FALSE
UNION ALL
SELECT m.id, m.parent_machine_id, m.name, m.level, m.path
FROM machines m
INNER JOIN machine_tree mt ON m.parent_machine_id = mt.id
WHERE m.is_deleted = FALSE
)
SELECT * FROM machine_tree ORDER BY path;
|
3.4 Phase 2+ Stub Tables (forward-compatibility only, not detailed in this document)
These are referenced by the roadmap but require their own reference screens/spec before build: work_orders (site_id, machine_id FK), stock_ledger (warehouse_id FK), quality_inspections (work_order_id, employee_id FK), maintenance_logs (machine_id FK), dispatch_notes (site_id, warehouse_id FK). They are listed here only so the Masters schema above is designed with the correct foreign keys to support them later.
4. Backend — API Specification
4.1 Conventions
Base URL: /api/v1/ — all endpoints versioned.
Auth: Authorization: Bearer <JWT> header on every call except /auth/*.
Pagination: ?page=1&page_size=25&sort_by=name&sort_dir=asc on all list endpoints.
Column search: ?q_<field>=<value>, e.g. ?q_city=Mandi (matches the per-column search boxes in the Sites grid).
Standard success envelope and standard error envelope shown below; every endpoint uses these shapes.
| // Success (list)
{
"data": [ { "...": "..." } ],
"meta": { "page": 1, "page_size": 25, "total": 132, "total_pages": 6 }
}
// Error
{
"error": {
"code": "VALIDATION_ERROR",
"message": "One or more fields are invalid.",
"fields": {
"name": "Name is required",
"country": "Must be a valid ISO-3166 alpha-2 code"
}
}
}
|
4.2 Sites Endpoints
| GET /api/v1/sites?page=1&page_size=25&q_city=Mandi&sort_by=name
200 OK
{
"data": [{
"id": "b1f3...", "code": "STE-0001", "name": "Transmission Tower",
"address": "village harbanspura, near talwara road, Mandi",
"city": "Adampur", "state": "Punjab", "country": "IN",
"created_at": "2026-05-05T15:20:00Z",
"updated_at": "2026-08-20T13:59:00Z",
"updated_by": { "id": "u9..", "name": "Saurav Khari" }
}],
"meta": { "page": 1, "page_size": 25, "total": 1, "total_pages": 1 }
}
POST /api/v1/sites
Request:
{ "name": "Transmission Tower", "address": "...", "city": "Adampur",
"state": "Punjab", "country": "IN", "gst_no": "03ABCDE1234F1Z5" }
201 Created  -> returns created Site object (same shape as above)
409 Conflict -> { "error": { "code": "DUPLICATE", "message": "A site with this name already exists." } }
DELETE /api/v1/sites/{id}
204 No Content
409 Conflict -> { "error": { "code": "HAS_DEPENDENTS",
"message": "Site has 3 warehouses and 12 employees. Reassign before deleting.",
"dependents": { "warehouses": 3, "employees": 12, "machines": 5 } } }
|
4.3 Employees Endpoints
| POST /api/v1/employees
Request:
{
"name": "Ramesh Kumar", "mobile": "+919812345678", "email": "ramesh@example.com",
"department_id": "d1..", "role_id": "r1..",
"site_ids": ["s1..","s2.."], "warehouse_ids": ["w1..","w2..","w3.."],
"landing_page": "DEFAULT"
}
201 Created -> { "id": "...", "emp_code": "EMP-0231", ...same fields... }
400 Bad Request ->
{ "error": { "code": "VALIDATION_ERROR", "message": "...",
"fields": { "mobile": "Either mobile or email is required" } } }
POST /api/v1/employees/bulk   (multipart/form-data, file=employees.csv)
202 Accepted -> { "job_id": "job_88f2", "status_url": "/api/v1/jobs/job_88f2" }
GET /api/v1/jobs/job_88f2
200 OK -> { "status": "COMPLETED", "processed": 240, "succeeded": 236, "failed": 4,
"errors_file_url": "https://.../job_88f2_errors.csv" }
|
4.4 Shifts Endpoints
| POST /api/v1/shifts
Request:
{ "name": "Day Shift A", "start_time": "08:00", "end_time": "20:00",
"break_minutes": 30, "working_days": [0,1,2,3,4] }
Server computes: is_overnight=false, gross_minutes=720, net_minutes=690
201 Created -> full Shift object incl. computed fields
400 Bad Request (identical start/end time):
{ "error": { "code": "VALIDATION_ERROR", "message": "...",
"fields": { "end_time": "Start and end time cannot be identical" } } }
|
4.5 Machines Endpoints (tree + wizard)
| GET /api/v1/machines/tree?site_id=s1..
200 OK
{
"data": [
{ "id": "m1", "name": "Fabrication Line 1", "children": [
{ "id": "m2", "name": "Cutting Station", "children": [
{ "id": "m3", "name": "Shear Machine A", "children": [] }
]}
]},
{ "id": "m4", "name": "Galvanizing Bath 1", "children": [] }
]
}
POST /api/v1/machines
Request:
{ "site_id": "s1..", "warehouse_id": "w1..",
"nodes": [
{ "temp_id": "n1", "name": "Fabrication Line 1", "parent_temp_id": null },
{ "temp_id": "n2", "name": "Cutting Station",     "parent_temp_id": "n1" }
] }
201 Created -> { "created": [ { "temp_id": "n1", "id": "m1" }, { "temp_id": "n2", "id": "m2" } ] }
POST /api/v1/machines/{id}/production-params
Request: { "params": [ { "metric_name": "units_per_hour", "unit": "pcs/hr" } ] }
POST /api/v1/machines/{id}/parameters
Request: { "parameters": [
{ "parameter_name": "Rated Capacity", "min_value": 0, "max_value": 500, "unit": "kg" } ] }
DELETE /api/v1/machines/{id}?cascade=true
200 OK -> { "deleted_count": 3 }
|
4.6 HTTP Status Code Standard
| | Code
| Meaning
| Used for
|
| 200
| OK
| Successful GET / PUT / non-creating POST
|
| 201
| Created
| Successful POST that creates a resource
|
| 202
| Accepted
| Async job started (bulk import)
|
| 204
| No Content
| Successful DELETE
|
| 400
| Bad Request
| Field-level validation errors
|
| 401
| Unauthorized
| Missing/expired/invalid JWT
|
| 403
| Forbidden
| Valid user, insufficient role/site scope
|
| 404
| Not Found
| Unknown id
|
| 409
| Conflict
| Duplicate unique key, or delete blocked by dependents
|
| 422
| Unprocessable
| Business-rule violation (e.g., break ≥ shift duration)
|
| 500
| Server Error
| Unhandled exception (logged to Sentry, never leaks stack trace)
|
5. Backend — Application Architecture
5.1 Module/Folder Structure (NestJS)
| src/
common/
guards/          (JwtAuthGuard, RolesGuard, SiteScopeGuard)
interceptors/     (AuditInterceptor, ResponseEnvelopeInterceptor)
filters/          (HttpExceptionFilter -> standard error envelope)
pipes/            (ZodValidationPipe)
modules/
auth/             (login, refresh, OTP)
sites/
sites.controller.ts
sites.service.ts
sites.repository.ts
dto/
employees/
employees.controller.ts
employees.service.ts
employees.repository.ts
bulk-import.processor.ts   (BullMQ worker)
dto/
shifts/
shifts.controller.ts
shifts.service.ts
shift-time.util.ts
machines/
machines.controller.ts
machines.service.ts
machine-tree.repository.ts
audit/
audit.service.ts
prisma/
schema.prisma
migrations/
main.ts
|
5.2 Layered Request Flow
Controller (routing + DTO validation) → Guard chain (JwtAuthGuard → RolesGuard → SiteScopeGuard, which injects the caller's allowed site_ids into the Postgres session for row-level security) → Service (business rules: uniqueness checks, shift duration calc, cascade-delete checks) → Repository/Prisma (SQL) → AuditInterceptor (writes audit_log after successful mutation) → ResponseEnvelopeInterceptor (wraps in the standard {data, meta} / {error} shape).
6. Authentication & Security
6.1 Login Flows
Office staff (password login)
POST /auth/login {username, password} → verify bcrypt hash → issue access_token (JWT, 15 min expiry) + refresh_token (opaque, stored hashed in Redis, 7-day expiry, httpOnly cookie).
Client stores access_token in memory only (not localStorage) to reduce XSS token-theft risk; refresh happens silently via the httpOnly cookie.
Shop-floor operators (OTP login)
POST /auth/otp/request {mobile} → SMS gateway sends 6-digit OTP, valid 5 minutes, rate-limited to 3 requests/10 min per number (Redis counter).
POST /auth/otp/verify {mobile, otp} → issues the same access/refresh token pair as above.
6.2 JWT Payload
| {
"sub": "user-uuid",
"employee_id": "emp-uuid",
"role": "PRODUCTION_SUPERVISOR",
"site_ids": ["s1..","s2.."],
"warehouse_ids": ["w1..","w2.."],
"iat": 1758150000,
"exp": 1758150900
}
|
6.3 RBAC Enforcement
| | Layer
| Mechanism
|
| Route level
| @Roles('SITE_ADMIN','SUPER_ADMIN') decorator + RolesGuard rejects with 403 before controller runs
|
| Data level
| SiteScopeGuard sets Postgres app.current_site_ids per request; RLS policies (§3.2) filter rows automatically — impossible to leak cross-site data even via a bug in a service method
|
| Field level
| DTOs strip fields a role isn’t allowed to set (e.g., Machine Operator role cannot set landing_page on another employee)
|
| Frontend
| Route guards hide/disable nav items and buttons per role — UX only, never the security boundary
|
6.4 Security Checklist (OWASP-aligned)
All input validated server-side with Zod schemas mirroring the DTOs (never trust client-side validation alone).
Parameterized queries only (Prisma) — no raw string SQL concatenation, preventing SQL injection.
Passwords: bcrypt (cost 12); OTPs: single-use, short expiry, rate-limited.
TLS 1.2+ enforced everywhere; HSTS header; secure/httpOnly/sameSite cookies for refresh token.
Rate limiting (Redis token bucket) on /auth/* and bulk-import endpoints.
File upload (Bulk Add CSV) scanned for type/size limits and sanitized before parsing; processed in an isolated worker, never inline in the request thread.
Secrets (DB creds, JWT signing key, SMS gateway key) in a secrets manager (AWS Secrets Manager/Vault), never in source control or plain env files in prod.
Audit log (§3.2) is append-only and covers every CREATE/UPDATE/DELETE across the four masters, satisfying traceability expectations typical of MES/manufacturing compliance.
7. Frontend — Application Architecture
7.1 Folder Structure
| src/
app/
store.ts
router.tsx
features/
auth/
activeSite/
sites/
SitesListPage.tsx
SiteFormPage.tsx
sites.api.ts
employees/
EmployeesListPage.tsx
EmployeeFormPage.tsx
employees.api.ts
shifts/
ShiftsListPage.tsx
ShiftFormPage.tsx
shifts.api.ts
machines/
MachineTreePage.tsx
MachineWizard/
Step1AddMachine.tsx
Step2RecordProduction.tsx
Step3SetParameters.tsx
machines.api.ts
components/
DataGrid/
ChipMultiSelect/
TimeRangePicker/
TreeBuilder/
StepWizard/
FormField, Modal, ConfirmDialog, Toast
styles/
tokens.css
|
7.2 Route Table
| | Path
| Component
| Guard
|
| /login, /login/otp
| LoginPage / OtpLoginPage
| public
|
| /masters/sites
| SitesListPage
| role: *_ADMIN
|
| /masters/sites/new, /masters/sites/:id
| SiteFormPage
| role: *_ADMIN
|
| /masters/employees
| EmployeesListPage
| role: *_ADMIN
|
| /masters/employees/new, /:id
| EmployeeFormPage
| role: *_ADMIN
|
| /masters/shifts
| ShiftsListPage
| role: *_ADMIN
|
| /masters/shifts/new, /:id
| ShiftFormPage
| role: *_ADMIN
|
| /masters/machines
| MachineTreePage
| role: *_ADMIN, SUPERVISOR (view)
|
| /masters/machines/new
| MachineWizard (3 steps)
| role: *_ADMIN
|
7.3 State Management
| | Slice / Cache
| Holds
| Notes
|
| authSlice
| access token (memory), user, role, permissions
| Cleared on logout/expiry
|
| activeSiteSlice
| currently selected site (top-right switcher)
| Persisted to sessionStorage; injected as a header X-Active-Site on every API call
|
| RTK Query cache: sitesApi, employeesApi, shiftsApi, machinesApi
| Server data, auto-cache & invalidation
| Mutations invalidate the relevant list tag so grids refresh without manual refetch
|
| machineWizardSlice
| in-progress Step 1–3 draft tree
| Persisted to sessionStorage so navigating away and back resumes the wizard
|
7.4 Design Tokens (derived from the reference screens)
| | Token
| Value
| Usage
|
| --color-primary
| #2E3A87 (navy)
| Top nav background, primary buttons (+NEW, Submit)
|
| --color-accent
| #1E63C4 (blue)
| Links, active tab underline, selected chip text
|
| --color-danger
| #D93025 (red)
| Delete icon, required-field asterisk
|
| --color-bg
| #FFFFFF
| Page background
|
| --color-surface-alt
| #F5F7FB
| Zebra-striped grid rows
|
| --color-border
| #E0E3E8
| Input borders, table borders
|
| --font-family
| Inter / system-ui
| All UI text
|
| --radius-control
| 6px
| Inputs, buttons, chips
|
| --spacing-unit
| 8px
| Base spacing scale (8/16/24/32)
|
7.5 Key Reusable Components — Behavior Spec
DataGrid
Props: columns[], fetchFn (RTK Query hook), enableColumnSearch, enableRowSelect, actions[].
Implements server-side pagination/sort/search (calls the ?page/&sort_by/&q_ params from §4.1) — never loads full dataset client-side.
ChipMultiSelect (Sites / Warehouses fields)
Renders selected values as removable chips + a search-to-filter dropdown; ‘Select All’ link toggles all currently visible options.
Emits onChange(ids[]); parent form (Employee) revalidates Warehouses against selected Sites.
TimeRangePicker (Shifts)
Two time inputs; computes and displays Duration and an Overnight badge live on every change, per §4.4 business rule.
TreeBuilder (Machines Step 1)
Recursive component: each node renders Machine Name input + ‘+ Add Child’ + delete icon; ‘+ Add Child’ inserts a new indented node as that node’s child in local state; ‘+ Add Another Machine’ (page level) adds a new root node.
On Submit, flattens the in-memory tree into the {temp_id, name, parent_temp_id} array expected by POST /api/v1/machines (§4.5).
8. Validation Rules (consolidated reference)
| | Entity
| Rule
|
| Site
| Name required, unique (case-insensitive) among active sites; City, State, Country required; Country must be ISO-3166 alpha-2
|
| Employee
| Name required; at least one of Mobile/Email required; Department & Role required and Role must belong to selected Department; every selected Warehouse must belong to a selected Site
|
| Shift
| Name required, unique per Site; at least 1 Working Day checked; Break Minutes ≥ 0 and < gross duration; Start ≠ End
|
| Machine
| Name required, unique among siblings under the same parent; Site required; deleting a node with children requires cascade confirmation
|
9. Testing Strategy
| | Level
| Tools
| Target Coverage / Scope
|
| Unit
| Jest (backend services, shift-duration util, tree-flatten util); Jest + React Testing Library (components)
| ≥ 80% on business-rule code (validation, duration calc, tree ops)
|
| Integration
| Supertest against NestJS app + a test Postgres DB (docker-compose)
| Every endpoint in §4: happy path + each documented error code
|
| E2E
| Playwright
| Full user journeys: create Site → create Employee assigned to it → create Shift → roster Employee to Shift → build a 3-level Machine tree → verify tree renders correctly
|
| Load
| k6
| Sites/Employees list endpoints at 200 req/s sustained, p95 < 500ms per §10 NFRs
|
| Security
| OWASP ZAP baseline scan + manual RLS test (attempt cross-site data access with a scoped JWT and confirm 403/empty result)
| Run in CI on every release branch
|
| UAT
| Scripted scenarios walked with the client using the 4 original screenshots as acceptance reference
| Sign-off gate before Phase 1 go-live
|
9.1 Sample E2E Test Cases
Creating a Shift with identical Start/End time shows the agreed behavior (block or treat as 24h, per resolved open question).
Deleting a Site with dependent Employees returns a blocking confirmation listing dependent counts, and the Site is NOT deleted.
Bulk Add of a 500-row employee CSV completes asynchronously and the error report correctly flags rows missing both Mobile and Email.
A user scoped to Site A cannot see or fetch (via direct API call) a Machine belonging to Site B, even with a valid token.
Building a Machine tree 4 levels deep, refreshing the page, and confirming the full hierarchy persists and re-renders correctly.
10. Non-Functional Requirements
| | Category
| Target
|
| Availability
| 99.5% monthly uptime for Phase 1 (Masters); multi-AZ DB with automated failover
|
| Performance
| List endpoints p95 < 500ms at 10k rows (server-side pagination); Machine tree endpoint p95 < 300ms for a 500-node site
|
| Scalability
| Stateless API servers behind an autoscaling group (CPU-based, min 2 / max 10 pods)
|
| Backup/DR
| Nightly automated Postgres backups, 30-day retention, point-in-time recovery; RPO 15 min, RTO 4 hrs
|
| Browser support
| Latest 2 versions of Chrome, Edge, Safari; responsive down to 768px (tablet, for shop-floor kiosks)
|
| Accessibility
| WCAG 2.1 AA for all form controls (labels, keyboard navigation, color contrast ≥ 4.5:1)
|
| Auditability
| Every mutation logged with actor + before/after diff, retained indefinitely (§3.2 audit_log)
|
11. DevOps & Deployment
11.1 Environments
| | Environment
| Purpose
| Deploy trigger
|
| dev
| Active development, seeded with fixture data
| Auto-deploy on merge to develop
|
| staging
| Client UAT, mirrors prod config at smaller scale
| Auto-deploy on merge to main, manual DB migration approval
|
| production
| Live
| Manual approval + blue-green deploy after staging sign-off
|
11.2 CI/CD Pipeline (GitHub Actions)
Lint + type-check (ESLint, tsc --noEmit) on every push.
Unit + integration tests (§9) must pass; coverage gate enforced.
Build Docker images (frontend static bundle + backend) and push to registry, tagged with commit SHA.
Run Prisma migrations against a throwaway DB to confirm they apply cleanly.
Deploy to dev automatically; staging on main-branch merge; production via manual approval gate + blue-green switch, with automatic rollback if health checks fail post-deploy.
11.3 Monitoring & Logging
Structured JSON logs (request id, actor, latency) shipped to a central log store (e.g., CloudWatch/ELK).
OpenTelemetry traces across API → DB calls; Grafana dashboards for latency/error-rate/throughput per endpoint.
Sentry for unhandled frontend and backend exceptions, alerting on error-rate spikes.
Uptime/health-check endpoint (/health) polled every 30s by the load balancer and an external uptime monitor.
12. Delivery Plan (Phase 1 — Masters Module)
| | Sprint (2 wks)
| Deliverable
|
| Sprint 0
| Repo setup, CI/CD skeleton, DB schema (§3) migrated to dev, auth module (§6)
|
| Sprint 1
| Sites: full CRUD API + SitesListPage + SiteFormPage, unit/integration tests
|
| Sprint 2
| Employees: full CRUD + Bulk Add + EmployeeFormPage with Chip pickers, tests
|
| Sprint 3
| Shifts: full CRUD + live duration/overnight logic + ShiftFormPage, tests
|
| Sprint 4
| Machines: tree API + 3-step wizard UI (TreeBuilder component) + Steps 2–3, tests
|
| Sprint 5
| Security hardening (RLS, rate limiting, ZAP scan), performance/load testing, UAT with client, staging sign-off, production go-live
|
13. Definition of Done (per screen)
All fields, validations, and behaviors in §4 implemented and match the reference screenshot layout, labels, and required markers.
API endpoints implemented exactly per §4 contracts, covered by integration tests for every documented status code.
RBAC and site-scoping enforced and verified by a cross-site-access negative test.
Audit log entries created and visible for every create/update/delete.
Page passes WCAG 2.1 AA automated checks (axe-core in CI) and manual keyboard-navigation pass.
E2E happy-path test in Playwright green in CI.
Client UAT sign-off recorded against the acceptance scenarios in §9.1.
14. Glossary
| | Term
| Meaning
|
| MES
| Manufacturing Execution System — software that tracks and controls shop-floor production in real time
|
| ISA-95
| International standard defining the equipment/site hierarchy (Enterprise→Site→Area→Work Center→Work Unit) used to model Sites and Machines
|
| RBAC
| Role-Based Access Control
|
| RLS
| Row-Level Security — database-enforced per-row access filtering, used here to isolate data by site_id
|
| JWT
| JSON Web Token — signed token used for stateless authentication
|
| OEE
| Overall Equipment Effectiveness — a KPI (Availability × Performance × Quality) planned for the Dashboards module, dependent on the Machines/Shifts masters in this document
|
15. What This Document Does Not Cover (explicit gaps)
In the interest of not overstating completeness:
No reference screens exist yet for Orders, Inventory, Planning & Scheduling, Production, Quality, Maintenance, Dispatch, or Dashboards — so those modules have architecture stubs (§3.4) only, not full schema/API/UI specs.
No visual mockups/wireframes are included; frontend implementation should follow the component and route specs in §7 plus your brand/design system if one exists beyond the tokens inferred in §7.4.
Infrastructure-as-code (Terraform/Helm charts) is not written here — §11 specifies what the pipeline must do, not the exact manifests.
Third-party integrations (SMS/OTP gateway provider, S3 provider, email provider) are named generically; final vendor selection and credentials setup are an implementation-time decision.
The identical Shift start/end time behavior is resolved here as “blocked as invalid” (§4.4) as a default design decision so the document is buildable — confirm with the client before Sprint 1 if a 24-hour-shift interpretation is actually wanted.