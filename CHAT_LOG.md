# Discrete Manufacturing ERP — Maintenance Module (Complete Chat Log & Specification)

## Architectural Overview & Context
This document serves as the complete technical specification, architectural blueprint, database design, API specification, source code reference, and setup guide for the **Cloud Maintenance Module** of a multi-site discrete manufacturing ERP (forging + machining).

---

## Phase 1: Domain Model, PostgreSQL DDL, and Technical Assumptions

### Technical Assumptions
1. **Multi-Site Row-Level Isolation**: Every operational table includes a mandatory `site_id` column. Cross-site isolation is enforced at the database level using composite foreign keys and composite unique constraints (`(site_id, id)`). Cross-site resource access yields `403 Forbidden`.
2. **Open-Ended Downtime Engine**: An active downtime event has `end_time = NULL` and automatically sets linked machines to `DOWN`. Setting `end_time` restores status to `RUNNING` (unless another open breakdown exists).
3. **Shift Proportional Splitting**: Shifts run 12 hours (e.g., Shift-A 08:00–20:00, Shift-B 20:00–08:00 overnight). Operating time per shift is 11 hours (660 minutes) after deducting 60 minutes of planned break. Events spanning shifts are allocated proportionally based on shift boundaries.
4. **Work Order Lifecycle & Supervisor Thresholds**: Status transitions follow `DRAFT` → `OPEN` → `ASSIGNED` → `IN_PROGRESS` → `ON_HOLD` → `COMPLETED` → `CLOSED`. Work orders exceeding **8 estimated hours** or **$500 in total spare parts cost** require `SUPERVISOR` or `MANAGER` approval before moving to `IN_PROGRESS`.
5. **Idempotent PM Scheduler**: PM schedule generation uses a unique constraint on `(site_id, pm_template_id, scheduled_due_date)` to prevent duplicate Work Order creation.

---

### Database DDL Schema (`prisma/schema.sql`)

```sql
-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ENUMS
CREATE TYPE machine_criticality_enum AS ENUM ('A', 'B', 'C');
CREATE TYPE machine_status_enum AS ENUM ('RUNNING', 'DOWN', 'UNDER_MAINTENANCE');
CREATE TYPE severity_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE fault_type_enum AS ENUM ('MAN', 'MACHINE', 'MATERIAL', 'METHOD');
CREATE TYPE wo_type_enum AS ENUM ('BREAKDOWN', 'PREVENTIVE', 'INSPECTION', 'CALIBRATION');
CREATE TYPE wo_priority_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE wo_status_enum AS ENUM ('DRAFT', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CLOSED');
CREATE TYPE pm_frequency_type_enum AS ENUM ('CALENDAR', 'USAGE');
CREATE TYPE pm_frequency_unit_enum AS ENUM ('DAYS', 'WEEKS', 'MONTHS', 'HOURS', 'CYCLES');
CREATE TYPE dept_code_enum AS ENUM ('ADMIN', 'PRODUCTION', 'MAINTENANCE', 'QUALITY', 'PLANNING', 'PROCESS', 'PURCHASE', 'SALES', 'IT');
CREATE TYPE role_code_enum AS ENUM ('WORKER', 'OPERATOR', 'TECHNICIAN', 'SUPERVISOR', 'MANAGER', 'SUPPORT');
CREATE TYPE notification_type_enum AS ENUM ('MACHINE_DOWN', 'WO_ASSIGNED', 'PM_DUE', 'PM_OVERDUE', 'LOW_STOCK');

-- 1. SITES & CORE MASTERS
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    code dept_code_enum NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_site_department UNIQUE (site_id, code)
);

CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_site_section UNIQUE (site_id, code)
);

CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_hours NUMERIC(4,2) NOT NULL DEFAULT 12.00,
    break_duration_minutes INT NOT NULL DEFAULT 60,
    is_overnight BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_site_section_shift UNIQUE (site_id, section_id, name)
);

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id),
    employee_code VARCHAR(64) NOT NULL,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role role_code_enum NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_site_employee_code UNIQUE (site_id, employee_code),
    CONSTRAINT uq_site_employee_email UNIQUE (site_id, email)
);

CREATE TABLE machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    criticality machine_criticality_enum NOT NULL DEFAULT 'B',
    make VARCHAR(128),
    model VARCHAR(128),
    serial_number VARCHAR(128),
    commissioning_date DATE,
    live_status machine_status_enum NOT NULL DEFAULT 'RUNNING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_site_machine_code UNIQUE (site_id, code)
);

CREATE TABLE fault_natures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_site_fault_nature UNIQUE (site_id, code)
);

-- 2. DOWNTIME TRACKING
CREATE TABLE downtime_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    event_number VARCHAR(64) NOT NULL,
    is_planned BOOLEAN NOT NULL DEFAULT FALSE,
    department_id UUID NOT NULL REFERENCES departments(id),
    severity severity_enum NOT NULL DEFAULT 'MEDIUM',
    type_of_fault fault_type_enum NOT NULL,
    fault_nature_id UUID NOT NULL REFERENCES fault_natures(id),
    fault_code VARCHAR(64),
    reported_by_id UUID NOT NULL REFERENCES employees(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes NUMERIC(10, 2),
    shift_id UUID REFERENCES shifts(id),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_site_downtime_event UNIQUE (site_id, event_number),
    CONSTRAINT chk_downtime_timestamps CHECK (end_time IS NULL OR end_time > start_time)
);

CREATE TABLE downtime_machines (
    downtime_event_id UUID NOT NULL REFERENCES downtime_events(id) ON DELETE CASCADE,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    PRIMARY KEY (downtime_event_id, machine_id)
);

CREATE TABLE downtime_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    downtime_event_id UUID NOT NULL REFERENCES downtime_events(id) ON DELETE CASCADE,
    label_name VARCHAR(64) NOT NULL,
    CONSTRAINT uq_event_label UNIQUE (downtime_event_id, label_name)
);

CREATE TABLE machine_downtime_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    downtime_event_id UUID NOT NULL REFERENCES downtime_events(id) ON DELETE CASCADE,
    period TSRANGE NOT NULL,
    EXCLUDE USING gist (machine_id WITH =, period WITH &&)
);

-- 3. PREVENTIVE MAINTENANCE & WORK ORDERS
CREATE TABLE pm_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    frequency_type pm_frequency_type_enum NOT NULL,
    frequency_value INT NOT NULL CHECK (frequency_value > 0),
    frequency_unit pm_frequency_unit_enum NOT NULL,
    estimated_duration_hours NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    required_role role_code_enum NOT NULL DEFAULT 'TECHNICIAN',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_site_pm_template UNIQUE (site_id, code)
);

CREATE TABLE parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    part_number VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    quantity_on_hand NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    min_stock_level NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_site_part_number UNIQUE (site_id, part_number)
);

CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    wo_number VARCHAR(64) NOT NULL,
    wo_type wo_type_enum NOT NULL,
    priority wo_priority_enum NOT NULL DEFAULT 'MEDIUM',
    status wo_status_enum NOT NULL DEFAULT 'DRAFT',
    downtime_event_id UUID REFERENCES downtime_events(id) ON DELETE SET NULL,
    pm_template_id UUID REFERENCES pm_templates(id) ON DELETE SET NULL,
    scheduled_date TIMESTAMPTZ,
    estimated_hours NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    actual_hours NUMERIC(6,2) DEFAULT 0.00,
    estimated_parts_cost NUMERIC(12,2) DEFAULT 0.00,
    actual_parts_cost NUMERIC(12,2) DEFAULT 0.00,
    requires_supervisor_approval BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by_id UUID REFERENCES employees(id),
    approved_at TIMESTAMPTZ,
    created_by_id UUID NOT NULL REFERENCES employees(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_site_wo_number UNIQUE (site_id, wo_number)
);

CREATE TABLE pm_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    pm_template_id UUID NOT NULL REFERENCES pm_templates(id) ON DELETE CASCADE,
    scheduled_due_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED',
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    generated_at TIMESTAMPTZ,
    CONSTRAINT uq_site_pm_schedule_cycle UNIQUE (site_id, pm_template_id, scheduled_due_date)
);

-- INDEXES
CREATE INDEX idx_machines_site_status ON machines(site_id, live_status);
CREATE INDEX idx_downtime_site_start_end ON downtime_events(site_id, start_time, end_time);
CREATE INDEX idx_wo_site_status ON work_orders(site_id, status);
```

---

## Phase 2: OpenAPI 3.0 API Specification

The REST API is scoped under `/api/v1/sites/{siteId}/maintenance/`:
- `GET /downtime-masters`: Retrieve site fault metadata.
- `GET /machines`: Paginated asset registry.
- `POST /downtimes`: Log downtime (handles single or multi-machine).
- `PUT /downtimes/{downtimeId}/close`: Record downtime end time.
- `POST /downtimes/{downtimeId}/convert-to-wo`: Convert event to Breakdown WO.
- `GET /work-orders`: Filterable WO list.
- `POST /work-orders/{woId}/transition`: Status lifecycle transitions.
- `POST /work-orders/{woId}/approve`: Supervisor threshold approval.
- `POST /work-orders/{woId}/consume-parts`: Spare parts usage & stock deduction.
- `POST /pm/scheduler/run`: Idempotent PM generator.
- `GET /analytics/kpis`: Availability, MTBF, MTTR, PM Compliance metrics.
- `GET /analytics/bad-actors`: Top 10 breakdown machines.

---

## Phase 3: Backend Implementation & Mathematical Models

### Core Mathematical Formulations
1. **Gross Planned Operating Time ($T_{\text{planned}}$)**:
   $$T_{\text{planned}} = \sum_{s \in \text{Shifts}} \left( T_{\text{shift\_duration}}(s) - T_{\text{planned\_breaks}}(s) \right) - T_{\text{planned\_downtime}}$$
2. **Availability Percentage ($A$)**:
   $$A = \left( \frac{T_{\text{planned}} - T_{\text{unplanned\_downtime}}}{T_{\text{planned}}} \right) \times 100\%$$
3. **Mean Time Between Failures ($\text{MTBF}$)**:
   $$\text{MTBF} = \frac{T_{\text{planned}} - T_{\text{unplanned\_downtime}}}{N_{\text{failures}}}$$
4. **Mean Time To Repair ($\text{MTTR}$)**:
   $$\text{MTTR} = \frac{T_{\text{unplanned\_downtime}}}{N_{\text{failures}}}$$
5. **PM Compliance Percentage ($\text{PMC}$)**:
   $$\text{PMC} = \left( \frac{N_{\text{pm\_completed\_on\_time}}}{N_{\text{pm\_scheduled}}} \right) \times 100\%$$

---

## Phase 4: Frontend Component Reference

The React/Next.js frontend includes:
- `AddDowntimeModal.tsx`: Spec 1.1 form with multi-chip input, multi-select machine trigger, fault natures, and planned radio inputs.
- `MachineSelectModal.tsx`: Searchable machine modal with "0 Selected" badge, Select All, and Remove All controls.
- `WorkOrderDetailDrawer.tsx`: Status stepper, task checklist, spare parts log, and approval warning banner.
- `KpiDashboardPage`: Analytics cards for Availability %, MTBF, MTTR, PM Compliance, and Top 10 Bad Actors table.

---

## Phase 5: Database Seed & E2E Integration Suite

### Seed Summary (`prisma/seed.ts`)
- **Site**: `PUNE-PLANT-01`
- **Sections**: Pre-Machining (`SEC-PRE-MACH`), Final Machining (`SEC-FIN-MACH`)
- **Shifts**: Shift-A (08:00–20:00), Shift-B (20:00–08:00 overnight)
- **Machines (12 total)**: `P/M CNC-1` through `P/M CNC-9`, `Drill-15`, `Drill-16`, `Milling-01`
- **Employees**: 20 staff members across all departments and roles
- **Downtime Events**: 30 seed events across 30 days
- **Work Orders**: 10 seed work orders covering all lifecycle states

---

## Phase 6: System Architecture Diagrams & CI Workflow

### System Flow
```mermaid
graph TD
    User([Web Client / Next.js App]) -->|HTTPS / REST API| Gateway[NestJS Gateway & Auth Middleware]
    
    subgraph Multi-Tenant Isolation Boundary
        Gateway -->|Verify JWT & Site Scope| TenantGuard[Site Scope & RBAC Guard]
        
        TenantGuard --> DowntimeModule[Downtime Tracking Service]
        TenantGuard --> WOModule[Work Order Engine]
        TenantGuard --> PMModule[PM Scheduler & Templates]
        TenantGuard --> PartsModule[Spare Parts & Inventory]
        TenantGuard --> AnalyticsModule[KPI & Analytics Engine]
    end

    subgraph Data Layer
        DowntimeModule --> DB[(PostgreSQL Database)]
        WOModule --> DB
        PMModule --> DB
        PartsModule --> DB
        AnalyticsModule --> DB
    end
```

### GitHub Actions CI/CD Pipeline (`.github/workflows/ci.yml`)

```yaml
name: ERP Maintenance Module CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    name: Build, Migrate & Test
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: erp_admin
          POSTGRES_PASSWORD: secure_password
          POSTGRES_DB: manufacturing_erp_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      DATABASE_URL: "postgresql://erp_admin:secure_password@localhost:5432/manufacturing_erp_test?schema=public"
      NODE_ENV: test
      JWT_SECRET: "ci-test-super-secret-key-12345"
      PORT: 4000

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 8

      - name: Setup Node.js (v20)
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Enable PostgreSQL Extensions
        run: |
          PGPASSWORD=secure_password psql -h localhost -U erp_admin -d manufacturing_erp_test -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
          PGPASSWORD=secure_password psql -h localhost -U erp_admin -d manufacturing_erp_test -c 'CREATE EXTENSION IF NOT EXISTS "btree_gist";'

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Deploy Database Migrations
        run: npx prisma migrate deploy

      - name: Seed Database
        run: npx prisma db seed

      - name: Run NestJS Unit Tests
        run: pnpm test

      - name: Run E2E Integration Tests
        run: pnpm test:e2e

      - name: Build Application
        run: pnpm run build
```