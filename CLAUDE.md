# Contractor CRM — Project Context

## What This Is

A single-page React CRM app for independent contractors. Manages clients, jobs, estimates, invoices, contracts, e-signatures, payments (Venmo), photos, and a calendar. Built as a PWA — installable on mobile, works offline.

**Live site:** https://contractor-crm.netlify.app  
**Repo:** github.com/fazekasm/contractor-crm  
**Owner:** Michael Fazekas (fazekas.michael@gmail.com)

## Architecture

```
Frontend (Netlify)          Backend (Railway)
┌─────────────────┐        ┌──────────────────────────────┐
│ React SPA        │───────▶│ Express proxy                │
│ Vite + PWA       │        │ contractor-crm-backend-      │
│ Single App.jsx   │        │ production.up.railway.app    │
│ (~2,926 lines)   │        │                              │
│ Firebase SDK     │        │ Routes:                      │
│                  │        │  /api/ai → Claude/OpenAI     │
│ Auth: Google     │        │  /api/opensign → OpenSign    │
│ DB: Firestore    │        │                              │
│ Storage: Firebase│        │ Auth: Firebase idToken verify │
└─────────────────┘        └──────────────────────────────┘
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `src/App.jsx` | Entire frontend — all views, components, logic | ~2,926 |
| `src/firebase.js` | Firebase init, auth, Firestore, Storage exports | 43 |
| `src/index.css` | Global styles, theme vars, animations | 268 |
| `src/main.jsx` | React root + PWA service worker registration | 22 |
| `netlify.toml` | Build config, CSP headers, caching | 23 |
| `firestore.rules` | Per-user document isolation | 16 |
| `storage.rules` | Per-user photo isolation | 13 |
| `vite.config.js` | Vite + PWA plugin config | 42 |

### Data Model

All data lives in a single Firestore document per user at `users/{uid}`. Structure:

```javascript
{
  company: { name, phone, email, address, city, state, zip, ccbNumber, venmoHandle, logo, customContract, customContractName },
  theme: { preset: "Bold Blue", custom: { accent, accent2, border, bg, surface, surface2, text, subtext, muted } },
  lightMode: false,
  customers: [{ id, name, phone, email, address, city, state, zip, notes }],
  jobs: [{ id, customerId, customerName, title, description, status, startDate, endDate, notes }],
  estimates: [{ id, customerId, customerName, jobId, number, date, lines: [{ description, qty, unit, unitPrice, type }], taxRate, notes, status }],
  invoices: [{ id, customerId, customerName, jobId, number, date, dueDate, lines, taxRate, notes, status, signedAt, openSignUrl, openSignSentTo, openSignSentAt, photos: [{ url, caption, label }] }],
  aiConfig: { provider, region, customRates, customInstructions },
  openSign: { backendUrl },
  calendarNotes: { "YYYY-MM-DD": "note text" }
}
```

### Theme System

- 6 dark presets + Custom with color picker
- Light/dark mode toggle (LIGHT_OVERRIDES applied on top of any preset)
- Theme object `t` passed as prop to all components: `{ accent, accent2, border, bg, surface, surface2, text, subtext, muted }`
- **IMPORTANT:** Never hardcode hex colors in JSX. Always use `t.text`, `t.subtext`, `t.surface`, `t.border`, etc. Hardcoded dark-mode colors break light mode.

### Security Measures (Pentest Hardened)

- `safeMerge()` for Firestore data loading — skips null values, merges sub-objects one level deep
- `ErrorBoundary` class component wraps entire app
- `esc()` HTML escaping on all user input in generated contract/invoice HTML
- CSP headers in netlify.toml (no unsafe-eval)
- 30-minute idle session timeout with auto sign-out
- localStorage cleared on sign-out
- API keys stripped from saveData (legacy cleanup)
- 10MB photo upload limit
- maxLength on all input fields (500) and textareas (2000)
- Firebase rules: per-user document isolation

### Services & Credentials

| Service | Details |
|---------|---------|
| Firebase Project | `contractor-crm-792d3` |
| Firebase API Key | In `src/firebase.js` — intentionally public (security via rules + App Check) |
| Netlify | Auto-deploy from `main` branch. `SECRETS_SCAN_SMART_DETECTION_ENABLED=false` in build env |
| Railway Backend | `contractor-crm-backend-production.up.railway.app` — hardcoded in App.jsx |
| AI Proxy | Backend route `/api/ai` — accepts Firebase idToken, forwards to Claude or OpenAI |
| OpenSign | Backend route `/api/opensign` — e-signature sending |

## Development

```bash
npm run dev     # Local dev server (Vite)
npm run build   # Production build → dist/
npm run preview # Preview production build locally
```

**Deploys:** Push to `main` → Netlify auto-builds and publishes. If deploy fails, check the Netlify deploys page — the secrets scanner has been disabled but other build issues can occur.

**Syntax validation:** `node -e "const acorn=require('acorn');const jsx=require('acorn-jsx');acorn.Parser.extend(jsx()).parse(require('fs').readFileSync('src/App.jsx','utf8'),{sourceType:'module',ecmaVersion:2022});console.log('OK')"` (acorn + acorn-jsx are in node_modules)

## Patterns & Conventions

- **Single-file architecture**: Everything is in App.jsx. Components are function components with hooks. No routing library — tab state drives which view renders.
- **Inline styles with theme object**: All styling is inline via the `t` theme object. CSS file is only for global resets, animations, and pseudo-classes.
- **Component props**: Most components receive `{ data, setData, t }`. Some get additional callbacks.
- **State updates**: `setData(d => ({ ...d, invoices: d.invoices.map(...) }))` pattern for immutable updates.
- **ID generation**: `uid()` → 8-char random base36 string.
- **Status flow**: lead → estimate → approved → active → complete → invoiced → paid (STATUSES array with dark/light color variants).
- **Contract/Invoice HTML**: Generated via template strings in `buildContractHTML()`. All user content must go through `esc()`.

## Open Tasks

### CRM-003: Enable Firebase App Check — ⚠️ DISABLED (2026-04-26)
- App Check init in `src/firebase.js` is commented out — was breaking Google Sign-In on production (`contractor-crm.netlify.app`). `signInWithPopup` rejected silently because the auth handler had no `.catch`; root cause was App Check token fetch failing.
- reCAPTCHA Enterprise key still exists: `6LcnvcosAAAAAGZsNIXoilkKEMQ7pxTTXtfPFxOA`
- `netlify.toml` CSP headers still allow `recaptchaenterprise.googleapis.com` / `recaptcha.google.com` (left in place; no harm)
- **To re-enable:** add `contractor-crm.netlify.app` to the reCAPTCHA Enterprise key's allowed domains in Google Cloud Console, verify Firebase Console → App Check enforcement state for Identity Toolkit, then uncomment the import and `initializeAppCheck` block in `src/firebase.js`. Test sign-in on the deployed site before considering it shipped.
- `signInWithGoogle` now has a `.catch` that logs and re-throws, so future auth failures surface in the console instead of silently doing nothing.

### CRM-001: Migrate Credential Docs to Firebase Storage
- Currently, custom contract PDFs are stored as base64-encoded strings inside the Firestore user document
- Should be moved to Firebase Storage (like photos already are) to reduce document size and improve performance
- Architectural change: update save/load logic and document generation flow

## Standing Preferences

- Michael prefers autonomous work — act without asking when possible
- He runs git commands from his own Terminal (not from the sandbox)
- Push commands should be provided as copy-paste snippets
- The "Contractor CRM Project" folder in his selected workspace has a full archive of source, docs, configs, and the pentest report

## Related Files Outside This Repo

- **Pentest Report:** `Noah Presgrove/Contractor-CRM-Pentest-Report.docx` — 14 findings, 8 remediated, 2 open, 4 accepted risk
- **Master Project Record:** `Noah Presgrove/Contractor CRM Project/01 - Documentation/Contractor_CRM_Master_Record.docx`
- **Backend Source:** `Noah Presgrove/contractor-crm-backend/` — Express server deployed on Railway
