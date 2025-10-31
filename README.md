# FairyTale Platform

Modern Next.js app for browsing, submitting, and managing fairy tales. Built with the App Router, Firebase (Auth, Realtime Database, Storage, Firestore), and Tailwind CSS.

Important: Do NOT commit .env.local to GitHub. Use the provided .env.example to create a local .env.local.

## Tech Stack

- Next.js (App Router)
- React 19
- TypeScript
- Firebase (Auth, Realtime Database, Storage, Firestore)
- Tailwind CSS 4

## Local Development

1) Install dependencies:
   npm install

2) Create your environment file:
   - Copy .env.example to .env.local
   - Fill in your Firebase Web App credentials (see Firebase Setup below)

3) Run the dev server:
   npm run dev
   # http://localhost:3000

## Environment Variables

This project reads client-safe variables via NEXT_PUBLIC_* from .env.local. Do not commit .env.local.

Variables required:
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- NEXT_PUBLIC_FIREBASE_DATABASE_URL
- NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID (optional)

How to create .env.local:
- cp .env.example .env.local
- Fill in values for your Firebase project

.gitignore already prevents .env* from being committed. If .env.local was previously tracked, untrack it:
git rm --cached .env.local
git commit -m "chore: stop tracking local env file"

If you accidentally pushed secrets, rotate keys immediately in Firebase.

## Firebase Setup

See firebase-setup.md for step-by-step instructions on creating a Firebase project and obtaining your Web App configuration.

Services used:
- Realtime Database (primary story storage)
- Storage (optional images)
- Auth (username/password handled in app)
- Firestore (available via lib/firebase.ts for future use)

Ensure your database rules are configured in database.rules.json and storage.rules (already included in repo). Deploy rules with Firebase CLI if needed.

## Project Structure (Key Files)

- app/layout.tsx — global layout, SEO metadata
- app/page.tsx — landing page
- app/browse/page.tsx — server page that renders the client UI
- app/browse/Client.tsx — client UI with "use client" at the file top
- app/story/[id]/page.tsx — server page with dynamic metadata and renders ./Client.tsx
- app/story/[id]/Client.tsx — client story view and interactions
- components/Header.tsx — client header (auth-aware)
- lib/firebase.ts — Firebase initialization (reads NEXT_PUBLIC_* env vars)
- lib/realtime.ts — Realtime Database helpers (stories)
- app/robots.ts — robots.txt
- app/sitemap.ts — dynamic sitemap generation from published stories
- .env.example — template to create .env.local

## Build and Export

- Standard production build (SSR/Edge as per Next defaults):
  npm run build
  npm run start

- Static export:
  npm run export
  # Outputs to /out for static hosting (note: dynamic features requiring server cannot run statically)

Firebase Hosting
- If you use static export, set "public": "out" in firebase.json and deploy:
  npm run export
  firebase deploy --only hosting

- For SSR (server-rendered) hosting with Firebase, use Cloud Run or Next.js SSR adapters. Static Firebase Hosting alone does not run SSR.

## SEO

- Global metadata in app/layout.tsx
- Dynamic per-story metadata via generateMetadata in app/story/[id]/page.tsx
- Open Graph & Twitter cards
- robots.txt at app/robots.ts
- sitemap.xml at app/sitemap.ts (populated from published stories)

## Contributing

- Do not commit secrets or user data
- Keep "use client" at the very top of client component files
- Do not export metadata from client files (metadata must be server-side)

## Security

- Never commit .env.local
- Rotate Firebase keys if leaked
- Review database.rules.json and storage.rules before production

## Scripts

- npm run dev — start dev server
- npm run build — build production
- npm run start — run production server
- npm run export — static export to /out

## License

MIT (or your preferred license)
