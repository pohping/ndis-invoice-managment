# NDIS Invoice Management System

A participant invoicing platform built for the Witty Data assessment — covering participant/provider management, NDIS rate-set Excel import, and invoice management with rate/price matching.

## Tech Stack

- Node.js v24.18.0, Next.js v16.2.10, TypeScript
- PostgreSQL (via Kysely)
- antd, TailwindCSS

## Setup

### 1. Prerequisites

- Node.js v24.18.0
- Docker (for Postgres [+ MinIO if used]), or your own local instances

### 2. Install

```bash
npm install
```

### 3. Start infrastructure

```bash
docker compose up -d
```

### 4. Configure environment

```bash
cp .env.example .env
```

### 5. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`.

[Confirm you actually ran steps 1–5 in order against a clean database before submitting.]

## What's Implemented

- Participant (Client) Management
- Provider Management
- Invoice Management (create/edit/list/view, rate-set matching, price lookup, draft vs completed validation)
- Rate Set Management
- NDIS Excel Import (idempotent, all worksheets, categories/items/attributes/prices)
