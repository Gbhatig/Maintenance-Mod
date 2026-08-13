# Discrete Manufacturing ERP — Maintenance Module

This repository contains the complete specification, architecture, database schemas, API specs, frontend reference components, and CI/CD pipelines for the **Cloud Maintenance Module** (Forging + Machining ERP).

## Repository Contents

- [`CHAT_LOG.md`](file:///d:/MM/CHAT_LOG.md): Complete end-to-end technical specification, including:
  - Multi-site isolation & domain models
  - PostgreSQL DDL (`prisma/schema.sql`)
  - OpenAPI 3.0 REST API specification (`/api/v1/sites/{siteId}/maintenance/`)
  - Mathematical models for **Availability %**, **MTBF**, **MTTR**, and **PM Compliance (PMC)**
  - Frontend component definitions (`AddDowntimeModal.tsx`, `WorkOrderDetailDrawer.tsx`, `KpiDashboardPage`)
  - Seed summary (`prisma/seed.ts`)
  - System architecture diagrams (Mermaid) & GitHub Actions CI workflow (`.github/workflows/ci.yml`)

## Target Repository

- GitHub URL: [https://github.com/Gbhatig/Maintenance-Mod](https://github.com/Gbhatig/Maintenance-Mod)

## Quick Start (Git Push Commands)

To push this repository to GitHub:

```bash
git init
git branch -M main
git remote add origin https://github.com/Gbhatig/Maintenance-Mod.git
git add .
git commit -m "docs: add ERP maintenance module specification and CHAT_LOG.md"
git push -u origin main
```
