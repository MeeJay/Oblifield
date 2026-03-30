<p align="center">
  <img src="client/public/logo.svg" alt="Oblifield" height="80">
</p>

<h3 align="center">Field Intervention Management for IT Service Companies</h3>

<p align="center">
  Technician check-in/check-out, photo uploads, real-time dashboards, PDF reports.
  <br>
  Part of the <a href="https://obli.tools"><strong>obli.tools</strong></a> ecosystem &mdash; compatible with <strong>Obligate</strong> SSO &amp; <strong>ObliTools</strong> desktop.
</p>

---

Oblifield manages field interventions for IT service teams. Technicians check in and out of sites with GPS timestamps, upload photos, and add notes. Managers get a real-time dashboard, generate PDF intervention reports, and export data for billing and compliance.

## Features at a Glance

- **Intervention lifecycle** &mdash; pending, assigned, in progress, done, issue, cancelled
- **Technician check-in / check-out** &mdash; GPS timestamp, automatic status transitions
- **Photo uploads** &mdash; per intervention, embedded in PDF reports
- **Client & site hierarchy** &mdash; nested clients/sites with address, city, country, filtering by country
- **PDF intervention reports** &mdash; branded layout matching paper forms (company name, comments, photos, signatures)
- **Manager dashboard** &mdash; live status cards, today's schedule, recent activity feed
- **Reports & CSV export** &mdash; per technician, per client, per period, with duration stats
- **10 notification channels** &mdash; Telegram, Discord, Slack, Teams, SMTP, Webhook, Gotify, Ntfy, Pushover, Free Mobile
- **Multi-tenant workspaces** &mdash; isolated tenants with per-workspace roles
- **Teams & RBAC** &mdash; read-only / read-write per client or intervention
- **SSO via Obligate** &mdash; single sign-on across the Obli suite
- **ObliTools compatible** &mdash; runs inside the ObliTools desktop shell (iframe SSO)
- **2FA** &mdash; TOTP authenticator apps + Email OTP
- **Import / Export** &mdash; full config backup as JSON
- **i18n** &mdash; French & English (extensible)
- **Real-time** &mdash; Socket.io live updates and live alert toasts
- **Theming** &mdash; Modern & Neon themes, accent color #AEEA00

---

## Domain Model

| Entity | Description |
|--------|-------------|
| **Intervention** | A scheduled or ad-hoc field task (installation, maintenance, repair, inspection) |
| **Client** | A customer organization, with nested sites/locations across countries |
| **Technician** | A user linked to a field worker profile with GPS tracking |
| **Timeline Event** | Check-in, check-out, note, photo, status change, assignment |
| **Intervention Photo** | Uploaded image attached to an intervention and its timeline |

### Intervention Statuses

| Status | Description |
|--------|-------------|
| `pending` | Created, not yet assigned |
| `assigned` | Technician assigned, waiting for dispatch |
| `in_progress` | Technician checked in on site |
| `done` | Completed successfully |
| `issue` | Completed with problems reported |
| `cancelled` | Cancelled before completion |

### Intervention Types

`installation` &bull; `maintenance` &bull; `repair` &bull; `inspection` &bull; `other`

### Priority Levels

`low` &bull; `normal` &bull; `high` &bull; `urgent`

---

## Client & Site Management

Clients are organized in a **nested hierarchy** (client &rarr; sites &rarr; sub-locations) using a closure table for efficient queries.

- Full address fields: street, city, postal code, region, country
- **Country filtering** &mdash; dropdown filter on the client list for multi-country deployments
- A single client can have hundreds of sites across multiple countries
- Intervention counts per client node
- Settings and notification channels cascade through the hierarchy

---

## PDF Intervention Reports

Generate professional PDF reports directly from any intervention, matching the structure of paper field forms:

- **Header**: company logo/name + "RAPPORT D'INTERVENTION" + intervention title
- **Info table**: client, site, date, start/end times, technician, supervisor, status, address
- **Comments section**: intervention description + all timeline notes (with check-in/out timestamps)
- **Photos section**: 2-column grid of uploaded photos with automatic page breaks
- **Footer**: accent line + "Company Name &mdash; Document confidentiel" on every page

The company name is configurable in **Settings &rarr; Company**.

---

## Notification Channels

Bind channels at **global**, **client**, or **intervention** level with **merge**, **replace**, or **exclude** inheritance modes.

| Channel | Notes |
|---------|-------|
| **Telegram** | Bot token + chat ID |
| **Discord** | Webhook URL |
| **Slack** | Incoming webhook |
| **Microsoft Teams** | Webhook URL |
| **Email (SMTP)** | Custom SMTP server |
| **Webhook** | Generic HTTP &mdash; GET / POST / PUT / PATCH, custom headers |
| **Gotify** | Self-hosted push |
| **Ntfy** | Self-hosted or ntfy.sh |
| **Pushover** | Mobile push |
| **Free Mobile** | SMS via French operator API |

---

## Multi-Tenant Workspaces

- Each workspace has its own interventions, clients, technicians, teams, notification channels, and settings
- Users can belong to multiple workspaces with independent **admin** or **member** roles
- Workspace switching from the UI without re-login
- Notification channels can be shared across workspaces

---

## Teams & RBAC

- Create **teams** per workspace
- Grant teams **read-only** or **read-write** access per client or intervention
- Access cascades through the client hierarchy
- `canCreate` flag per team: allows non-admins to create interventions/clients
- Admins always have full access

---

## Settings Inheritance

| Level | Scope |
|-------|-------|
| Global | Applies to everything in the workspace |
| Client | Applies to the client and all sub-sites |
| Intervention | Intervention-specific override |

Settings include: default priority, default estimated duration, notification cooldown, timeline retention, photo max size, auto-complete on check-out.

---

## Deployment

### Docker Compose (built-in PostgreSQL)

```bash
docker compose up -d
```

### Docker Compose (external PostgreSQL)

```bash
docker compose -f docker-compose.external-db.yml up -d
```

Set `DATABASE_URL` in your `.env` to point at your existing PostgreSQL instance.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://oblifield:changeme@localhost:5432/oblifield` |
| `SESSION_SECRET` | Session signing secret | &mdash; |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | `production` or `development` | `production` |
| `CLIENT_ORIGIN` | CORS origin for the client | `http://localhost` |
| `APP_NAME` | Fallback app name (overridden by Settings &rarr; Company) | `Oblifield` |
| `DEFAULT_ADMIN_USERNAME` | Admin account created on first run | `admin` |
| `DEFAULT_ADMIN_PASSWORD` | Admin password on first run | `admin123` |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Server** | Node.js 24 LTS, TypeScript, Express |
| **Database** | PostgreSQL 16, Knex (migrations + query builder) |
| **Real-time** | Socket.io |
| **Client** | React 18, Vite, Tailwind CSS, Zustand |
| **PDF** | PDFKit |
| **Monorepo** | npm workspaces (`shared/`, `server/`, `client/`) |

---

> **Built with Claude Code**
>
> This project was built using Claude Code as a development assistant throughout the entire process.

<p align="center">
  <a href="https://github.com/alexandreaj/Oblifield">github.com/alexandreaj/Oblifield</a>
  &nbsp;&bull;&nbsp;
  <a href="https://obli.tools">obli.tools</a>
</p>
