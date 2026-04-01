# Supply Request Pipeline App

A lightweight internal React app for managing cross-team requests into Supply and Content through one governed intake and prioritisation flow.

## What it includes

- dashboard with top-level metrics
- request intake form with live score preview
- triage queue for approval and deferral
- pipeline board by status
- ranked backlog with request detail

## Run locally

```bash
npm install
npm run dev
```

## Build for deployment

```bash
npm install
npm run build
```

The production files will be created in `dist/`.

## Suggested deployment options

- Vercel
- Netlify
- Azure Static Web Apps
- any internal static hosting that supports a Vite React build

## Notes

This is an MVP front end with in-memory data only. For production use, add:

- authentication
- API / database persistence
- user roles and permissions
- audit logging
- integration with your content prioritisation model
