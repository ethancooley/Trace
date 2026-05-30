# Trace

A Strava-connected activity dashboard that renders your GPS routes as beautiful, minimal maps.

![Trace](https://img.shields.io/badge/status-active-4a7c59?style=flat-square)
![React](https://img.shields.io/badge/React-18-2E7DA3?style=flat-square)
![Node](https://img.shields.io/badge/Node-24-4A8FA8?style=flat-square)

## Overview

Trace connects to your Strava account and renders every activity as a clean GPS route visualization — no base maps, just the pure trace of where you went. Click any activity to expand it into a full-screen detail view with complete performance stats.

## Features

- **OAuth connection** via Strava — read-only access, your data stays yours
- **Route visualization** — GPS traces rendered on dark canvas with layered glow effects
- **Activity detail** — click any card to fly it open into a full-screen view
- **Sport-specific stats** — pace, power, heart rate, elevation, cadence and more depending on activity type
- **Summary bar** — total distance, time, and elevation for any filtered view
- **Sport filters** — filter by Run, Ride, Swim, Hike, Walk
- **Imperial units** — distance in miles, elevation in feet

## Tech Stack

- **Frontend** — React + Vite
- **Backend** — Node/Express (OAuth token exchange only)
- **Deployment** — Vercel

## Local Development

### Prerequisites

- Node.js 18+
- A Strava account with [API access](https://www.strava.com/settings/api)

### Setup

1. Clone the repo

```bash
git clone https://github.com/ethancooley/trace.git
cd trace
```

2. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

3. Configure environment variables

```bash
# backend/.env
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret

# frontend/.env
VITE_STRAVA_CLIENT_ID=your_client_id
```

4. Run both servers

```bash
# Terminal 1
cd backend && node index.js

# Terminal 2
cd frontend && npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173)

## Deployment

The backend is deployed as Vercel serverless functions. The frontend is a standard Vite/React build deployed to Vercel.

Add the following environment variables in the Vercel dashboard for both projects:

| Variable | Description |
|---|---|
| `STRAVA_CLIENT_ID` | Your Strava API client ID |
| `STRAVA_CLIENT_SECRET` | Your Strava API client secret (backend only) |
| `VITE_STRAVA_CLIENT_ID` | Your Strava API client ID (frontend only) |

## License

MIT