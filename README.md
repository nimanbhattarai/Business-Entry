# SoleTrack - Sole Production & Sales Management

SoleTrack is a cross-platform business app for managing:

- Daily sole production
- Sales and payment tracking
- Material costs and suppliers
- Inventory with low-stock alerts
- Profit/loss analytics and reports

This repository is organized as a monorepo:

- `mobile/` - Expo React Native app (iOS + Android)
- `backend/` - Express API + MongoDB schema + Firebase integration points
- `admin/` - React admin panel

## 1) Prerequisites

- Node.js 20+
- npm 10+
- MongoDB (local or Atlas)
- Firebase project (Auth + FCM + Firestore optional)

## 2) Install

```bash
npm install
```

## 3) Run all apps

```bash
npm run dev
```

Or run separately:

```bash
npm run dev:mobile
npm run dev:backend
npm run dev:admin
```

## 4) Environment

Copy `backend/.env.example` to `backend/.env` and configure values.

## 5) Core Modules Included

- Authentication with role support (`admin`, `employee`)
- Production, sales, materials, inventory, reports endpoints
- Dashboard metrics and chart-ready data API
- Mobile screens and bottom-tab navigation
- Admin dashboard starter with KPI cards
- Notification service scaffolding (daily reminder, low stock, pending payments)

## 6) Offline + Cloud Sync Approach

The mobile app is structured to support:

- Local caching via AsyncStorage-based store (initial version)
- API sync queue pattern in service layer
- Firebase push token registration

You can swap in SQLite/WatermelonDB if you need heavier offline workloads.
