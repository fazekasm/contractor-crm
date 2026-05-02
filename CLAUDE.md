# Contractor CRM — Project Context

## What This Is

A single-page React CRM app for independent contractors. Manages clients, jobs, estimates, invoices, contracts, e-signatures, payments (Venmo), photos, and a calendar. Built as a PWA — installable on mobile, works offline.

**Live site:** https://contractor-crm.netlify.app  
**Frontend repo:** github.com/fazekasm/contractor-crm  
**Backend repo:** github.com/fazekasm/contractor-crm-backend  
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
│ DB: Firestore    │        │  /api/contracts/pdf/:id      │
│ Storage: Firebase│        │  /webhooks/opensign          │
└─────────────────┘        │                              │
                           │ Auth: Firebase idToken verify │
                           └──────────────────────────────┘
                                        │
                           ┌────────────▼────────────────┐
                           │ OpenSign (self-hosted)       │
                           │ Parse Server:                │
                           │  server-production-0eb2      │
                           │  .up.railway.app             │
                           │ Client:                      │
                           │  client-production-3c72      │
                           │  .up.railway.app             │
                           └─────────────────────────────┘
```

### Key Files — Frontend

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

### Key Files — Backend (`/private/tmp/contractor-crm-backend/`)

| File | Purpose |
|------|---------|
| `backend/server.js` | Express app, CORS config, PDF route, imports |
| `backend/services/opensign.service.js` | OpenSign document creation, PDF caching, signing URL |
| `backend/services/htmlCache.js` | Firestore-backed HTML/PDF cache (`contractPdfs`, `contractPdfCache` collections) |
| `backend/routes/webhook.routes.js` | POST `/webhooks/opensign` — receives OpenSign completion events |
| `backend/middleware/auth.js` | Firebase Admin SDK init, `ensureFirebaseInitialized()`, `getFirestore()` |

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
| OpenSign Parse Server | `server-production-0eb2.up.railway.app` |
| OpenSign Client | `client-production-3c72.up.railway.app` |

### Railway Environment Variables (Backend)

| Var | Purpose |
|-----|---------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Admin SDK credentials (JSON string) |
| `OPENSIGN_APP_ID` | Parse Server application ID |
| `OPENSIGN_MASTER_KEY` | Parse Server master key |
| `OPENSIGN_SERVER_URL` | Parse Server URL (the server-production Railway URL) |
| `BACKEND_URL` | Self-reference URL for webhook registration |
| `FRONTEND_URL` | Added to CORS allowed origins |

## OpenSign E-Signature Flow

Understanding this flow is essential — many past debugging sessions have involved it.

### Send-for-Signature Flow
1. Frontend calls `sendForSignature()` in App.jsx
2. Builds contract HTML via `buildContractHTML()`, base64-encodes it
3. POSTs to backend `/api/opensign/send` with `{ pdfBase64, signers, title, ... }`
4. Backend decodes base64 → raw HTML string (`htmlContent`)
5. Backend checks if `htmlContent` starts with `%PDF` magic bytes:
   - Real PDF → uploads directly to Parse Server file store
   - HTML (normal case) → `cacheHtml(htmlContent)` → stores in Firestore `contractPdfs/{32hexId}` → returns `pdfId`
6. Backend sets `fileUrl = https://contractor-crm-backend-production.up.railway.app/api/contracts/pdf/${pdfId}`
7. Backend calls OpenSign Parse Server to create document with `fileUrl`
8. Returns `signingUrl` and `opensignDocId` to frontend

### PDF Serving Flow (when OpenSign or signer fetches the contract)
1. `GET /api/contracts/pdf/:id`
2. Check Firestore `contractPdfCache/{id}` — if cached PDF buffer exists, return it immediately
3. Otherwise: fetch raw HTML from Firestore `contractPdfs/{id}`, render via Puppeteer, cache result, return PDF
4. Always sets `Access-Control-Allow-Origin: *` BEFORE the try block (critical — error paths need CORS too)

### Webhook Flow (document completion)
- OpenSign calls `POST /webhooks/opensign` when a signer completes a document
- **OpenSign does NOT send authentication headers** — the webhook handler must accept calls without a secret
- Handler logs a warning if secret mismatch but always returns 200 OK
- Webhook failures are fatal to OpenSign's completion flow if they return non-2xx

### CORS Configuration
The backend allows these origins:
```javascript
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'https://client-production-3c72.up.railway.app',  // OpenSign client
].filter(Boolean);
```

## Development

### Frontend
```bash
npm run dev     # Local dev server (Vite)
npm run build   # Production build → dist/
npm run preview # Preview production build locally
```

**Deploys:** Push to `main` → Netlify auto-builds and publishes.

**Syntax validation:**
```bash
node -e "const acorn=require('acorn');const jsx=require('acorn-jsx');acorn.Parser.extend(jsx()).parse(require('fs').readFileSync('src/App.jsx','utf8'),{sourceType:'module',ecmaVersion:2022});console.log('OK')"
```
(acorn + acorn-jsx are in node_modules)

### Backend (at `/private/tmp/contractor-crm-backend/`)

**Deploys:** Push to `main` → Railway auto-deploys. Force redeploy with:
```bash
cd /private/tmp/contractor-crm-backend
git commit --no-verify --allow-empty -m "trigger: force Railway redeploy"
git push origin main
```

**Editing backend files from Dispatch (remote):**
- Use `start_task` with `directory: /private/tmp/contractor-crm-backend` for file edits (reads/writes files directly)
- Use `start_code_task` with `cwd: /private/tmp/contractor-crm-backend` to commit and push (git works from code tasks)
- Always use `git commit --no-verify` to skip pre-push hooks that can hang
- Both approaches work when Michael is away from the Mac Mini

**Making targeted text edits to backend files** when worktree approach is unreliable:
Write a Python script to the workspace folder and run via a cowork task:
```python
path = '/private/tmp/contractor-crm-backend/backend/services/opensign.service.js'
c = open(path).read()
old = "exact string to replace"
new = "replacement string"
if old not in c: print('NOT FOUND'); exit(1)
open(path, 'w').write(c.replace(old, new, 1))
print('Done')
```

## Patterns & Conventions

- **Single-file architecture**: Everything is in App.jsx. Components are function components with hooks. No routing library — tab state drives which view renders.
- **Inline styles with theme object**: All styling is inline via the `t` theme object. CSS file is only for global resets, animations, and pseudo-classes.
- **Component props**: Most components receive `{ data, setData, t }`. Some get additional callbacks.
- **State updates**: `setData(d => ({ ...d, invoices: d.invoices.map(...) }))` pattern for immutable updates.
- **ID generation**: `uid()` → 8-char random base36 string.
- **Status flow**: lead → estimate → approved → active → complete → invoiced → paid (STATUSES array with dark/light color variants).
- **Contract/Invoice HTML**: Generated via template strings in `buildContractHTML()`. All user content must go through `esc()`.

## Known Gotchas

- **Backend ES modules**: `backend/` uses `import`/`export` (ESM), not `require`. Always use `export async function`, not `module.exports`.
- **Duplicate declarations crash Railway**: If a patch script runs twice and appends the same functions, Railway crashes with `SyntaxError: Identifier already declared`. Always check file content before appending.
- **Code task worktree issue**: `start_code_task` creates a git worktree. `git add` in the main repo path won't see changes made in the worktree. Use `start_task` for file edits, `start_code_task` for git operations only.
- **zsh `!` expansion**: Inline Python or shell commands containing `!` (like `if (!html)`) trigger zsh history expansion. Use heredoc `<< 'EOF'` or write to a file.
- **CORS on error paths**: Setting `Access-Control-Allow-Origin` only on the success path means 404/500 responses lack the header and the browser shows a CORS error instead of the real error. Always set CORS headers before the `try` block.
- **Railway deploy throttling**: Railway can limit deploys during US infrastructure issues. Not rate limiting — retry after a few minutes.
- **OpenSign IsSendMail**: `IsSendMail: false` in the Parse Server document object means OpenSign's internal email sender is disabled (CRM backend handles this separately via Resend).
- **pdfId format**: Must be a 32-character hex string. The `getCachedHtml()` / `getCachedPdfBuffer()` functions validate this and return null for invalid IDs.
- **Parse Server mount path is `/app/`**: THREE places must use `/app/`: (1) CRM backend `opensign.service.js` uses `${PARSE_URL}/app/...`, (2) OpenSign server `SERVER_URL=https://server-production-0eb2.up.railway.app/app`, (3) OpenSign client `REACT_APP_SERVERURL=https://server-production-0eb2.up.railway.app/app`. If any say `/api/`, the signing flow breaks.
- **OpenSign `SERVER_URL` must be the PUBLIC URL**: In `apps/OpenSignServer/Utils.js`, `cloudServerUrl` is hardcoded to `http://localhost:8080/app` and is what all internal Parse Server calls (including `parseUploadFile`) use — no hairpin NAT issue. `SERVER_URL` env var maps to Parse Server's `publicServerURL`, which controls the base URL embedded in signed PDF file links. If `SERVER_URL` is set to localhost, all `SignedUrl` values stored in the DB will be `http://localhost:...` and unreachable from the browser. Correct value: `https://server-production-0eb2.up.railway.app/app`.

## OpenSign Private Server — Configuration & Troubleshooting Guide

This section documents every issue encountered deploying OpenSign on Railway, what was tried, what failed, what fixed it, and a canonical setup reference for future projects.

### Architecture (How OpenSign Works on Railway)

```
OpenSign Server (Parse Server)
  apps/OpenSignServer/Utils.js:
    cloudServerUrl = 'http://localhost:8080/app'  ← HARDCODED, used for all internal API calls
    
  apps/OpenSignServer/index.js:
    serverURL:       cloudServerUrl                          ← internal (always localhost)
    publicServerURL: process.env.SERVER_URL || cloudServerUrl ← external file URLs ← KEY
    mountPath:       process.env.PARSE_MOUNT || '/app'

  apps/OpenSignServer/utils/fileUtils.js:
    parseUploadFile() → posts to `${cloudServerUrl}/files/...` ← uses localhost, not SERVER_URL
```

**The critical insight:** `SERVER_URL` env var is ONLY used for `publicServerURL` (the base URL embedded in signed PDF download links). All internal Parse Server API calls use `cloudServerUrl`, which is hardcoded to `http://localhost:8080/app`. There is NO hairpin NAT problem because internal calls never go through the public domain.

### Canonical Railway Environment Variables (OpenSign Server)

| Variable | Correct Value | Why |
|----------|--------------|-----|
| `SERVER_URL` | `https://server-production-0eb2.up.railway.app/app` | Sets Parse Server `publicServerURL` — must be public HTTPS URL with `/app` path so signed PDF links are browser-accessible |
| `PUBLIC_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}/app` | OpenSign UI reference; add `/app` suffix |
| `PARSE_MOUNT` | `/app` | Parse Server mount path (default is also `/app`) |
| `REACT_APP_SERVERURL` (client) | `https://server-production-0eb2.up.railway.app/app` | OpenSign client must point to public server with `/app` |

### Issues Encountered, Fixes Tried, and Outcomes

#### Issue 1: "Something went wrong" after clicking Finish on signing page
**Symptom:** Signer completes all fields, clicks Finish, sees "Something went wrong, refreshing this page may solve this issue."  
**Server logs:** `✅ PDF digitally signed created: ./exports/signed_...pdf`, then `don't send mail` — no errors logged.  
**Root cause:** `SignedUrl` stored in the Parse DB was `http://localhost:.../app/files/...` — a localhost URL unreachable from any browser.

**Fixes tried that did NOT work:**
- Adding `PUBLIC_SERVER_URL` Railway env var — OpenSign doesn't read this variable name
- Setting `SERVER_URL=http://localhost:${{PORT}}/api` (Apr 30 attempt) — this is what directly caused the localhost SignedUrl problem; `${{PORT}}` also didn't expand so it became `http://localhost:/api`
- Setting `SERVER_URL=http://localhost:8080/app` — fixed the port but still localhost; still breaks external file access
- Adding `/app` to `PUBLIC_URL` alone — `PUBLIC_URL` is not what Parse Server reads for `publicServerURL`

**Fix that WORKED:**  
Set `SERVER_URL=https://server-production-0eb2.up.railway.app/app`  
Result: `SignedUrl` in DB is now `https://server-production-0eb2.up.railway.app/app/files/opensign/...?token=...` — fully accessible from any browser.

#### Issue 2: Webhook "Finish" returning 401
**Symptom:** OpenSign sent completion webhook but got 401 back, causing the signing UI to show an error.  
**Root cause:** Webhook handler required a secret that OpenSign doesn't send.  
**Fix:** Webhook handler accepts calls without a secret (logs warning, always returns 200 OK).  
Also removed `Webhook` field from the document creation payload in `opensign.service.js`.

#### Issue 3: "Failed to send document for signing" (CRM backend error)
**Symptom:** Clicking "Send for Signature" in the CRM showed an error immediately.  
**Root cause:** After SERVER_URL was changed to `http://localhost:.../api`, Parse Server remounted at `/app/` (not `/api/`). All 15 Parse API calls in `opensign.service.js` used `${PARSE_URL}/api/...` paths.  
**Fix:** Updated all Parse API calls in `opensign.service.js` to use `${PARSE_URL}/app/...`.  
**Verification:** `GET https://server-production-0eb2.up.railway.app/app/health` → `{"status":"ok"}`. If it returns 404, the path is wrong.

#### Issue 4: `${{PORT}}` Railway template variable not expanding
**Symptom:** `SERVER_URL` was set to `http://localhost:${{PORT}}/app` but the actual resolved value was `http://localhost:/app` (empty port).  
**Root cause:** `${{PORT}}` is a Railway reference variable that works in some contexts but was not expanding in this service's variable definitions.  
**Fix:** Hardcode the port. OpenSign server always runs on port 8080 (visible in deploy logs: `opensign-server running on port 8080`). However, since `SERVER_URL` should be the public URL anyway, this is moot.

### How to Debug Signing Issues

1. **Check `SignedUrl` in the database** — navigate to `https://server-production-0eb2.up.railway.app/app` and run:
   ```javascript
   fetch('/app/classes/contracts_Document?order=-createdAt&limit=1&keys=SignedUrl,objectId', {
     headers: { 'X-Parse-Application-Id': 'opensign', 'X-Parse-Master-Key': '<MASTER_KEY>' }
   }).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)));
   ```
   If `SignedUrl` starts with `http://localhost`, `SERVER_URL` is wrong. It must start with `https://server-production-0eb2.up.railway.app`.

2. **Check deploy logs** for the migration line: `Run migration on parse-server at http://localhost:8080/app` — this confirms internal connectivity works. If this URL changes, `cloudServerUrl` in `Utils.js` changed.

3. **Check HTTP logs** — `signPdf` returning HTTP 200 does NOT mean success. Parse cloud functions return 200 even on error; check the response body (`{ "code": 141, "error": "..." }`).

4. **Existing failed documents cannot be retried** — once a `SignedUrl` is stored as localhost, that document is broken. Create a new invoice and send fresh for testing.

### For Future Projects Using Self-Hosted OpenSign on Railway

1. Set `SERVER_URL` to the **public HTTPS URL** of your Parse Server with the mount path: `https://your-domain.up.railway.app/app`
2. Do NOT set it to localhost — the internal code already uses localhost; `SERVER_URL` is only for public file link generation
3. The webhook endpoint must accept calls **without authentication** — OpenSign does not send secrets
4. Parse Server mounts at `/app` by default — verify all client API calls use `/app/` not `/api/`
5. Signed PDFs are stored on ephemeral Railway filesystem — configure S3/R2 storage adapter before going to production (see CRM-008)

## Open Tasks

### ~~CRM-003: Enable Firebase App Check~~ ✅ COMPLETED (2026-04-25)
- reCAPTCHA Enterprise key: `6LcnvcosAAAAAGZsNIXoilkKEMQ7pxTTXtfPFxOA`
- `src/firebase.js` updated with `ReCaptchaEnterpriseProvider`
- `netlify.toml` CSP updated for recaptcha domains

### ~~CRM-004: Fix OpenSign "Finish" error~~ ✅ COMPLETED (2026-05-01)
- Root cause (original): webhook handler rejecting OpenSign's unauthenticated POST with 401
  - Fix: webhook now accepts calls without secret (logs warning, always returns 200)
  - Fix: removed `Webhook` field from opensign.service.js as belt-and-suspenders
- Root cause (deeper, fixed 2026-05-01): `SignedUrl` stored in DB was `http://localhost:.../app/files/...` — unreachable from browser
  - Parse Server's `publicServerURL` reads from `SERVER_URL` env var (`publicServerURL: process.env.SERVER_URL || cloudServerUrl` in `apps/OpenSignServer/index.js`)
  - `cloudServerUrl` is hardcoded to `http://localhost:8080/app` in `Utils.js` and is what internal calls (including `parseUploadFile`) use — no hairpin NAT problem
  - The Apr 30 "fix" that changed `SERVER_URL` to localhost was a misdiagnosis: it fixed nothing and broke `publicServerURL`
  - Real fix: `SERVER_URL=https://server-production-0eb2.up.railway.app/app` so Parse Server generates publicly-accessible file URLs
  - Signing flow now end-to-end verified working

### CRM-005: Add Contractor Signature to Contract PDFs
- Canvas-drawn signature in Settings → saved as `co.signature` base64 data URL
- Embedded in `buildContractHTML()` above contractor name line (currently a `<div class="sig-line"></div>` placeholder)
- Makes contracts legally binding for both parties
- Status: designed, not yet implemented

### CRM-001: Migrate Credential Docs to Firebase Storage
- Custom contract PDFs currently stored as base64 in Firestore user document
- Should move to Firebase Storage to reduce document size
- Architectural change: update save/load logic and document generation flow

### CRM-002: Apply Supabase RLS (if applicable)
- SQL ready to paste into Supabase dashboard
- Tables: `users`, `contractor_business_profiles`, and ~10 more
- URL: https://supabase.com/dashboard/project/wbyzjwurzyhkdbkcdsjj/sql

### CRM-006: Crowdsourced Leads Marketplace (Future)
- Performance-based lead marketplace: busy contractors list estimates as leads; other contractors claim them
- Commission model: ~7-8% of estimate total paid to referring contractor ONLY if job closes (tracked via e-signature + job status progression)
- Platform fee: ~2-3% of estimate total on successful conversions — no upfront cost for buyer or seller
- Conversion tracking: OpenSign signature event → job status moves to "active" triggers payout
- Requires: shared Firestore `marketplace/leads/` collection, updated security rules, new backend `/api/marketplace` routes, Stripe Connect for payouts, new Marketplace tab in frontend
- Differentiator: exclusive leads (not sold to multiple contractors), comes with pre-written estimate/scope, performance-only model (vs. Angi/HomeAdvisor upfront fee model)
- Full feasibility plan: `CRM-006-crowdsourced-leads-feasibility.md` (in workspace folder)
- Status: planned, not yet started — **app stability is first priority**

## Security Standing Rules

These rules apply to every code change, config update, script, and server operation — no exceptions.

### Credentials & Secrets
- **Never commit secrets to git.** API keys, service account JSON, tokens, passwords, and connection strings must never appear in committed code. Use environment variables only. Always verify `.env` and any file containing secrets is in `.gitignore` before committing.
- **Never log secrets.** Don't print `FIREBASE_SERVICE_ACCOUNT_JSON`, API keys, user tokens, or private keys to console/Railway logs — even in debug mode. Log only non-sensitive identifiers (e.g. a user UID, a doc ID).
- **Never hardcode credentials.** Not even in one-time scripts. Use `process.env.*` or the Railway env var system.
- **Rotate exposed credentials immediately.** If a secret appears in a log, transcript, or commit, flag it to Michael and rotate it before doing anything else.
- **Local `.env` files** are for dev only — they must never be pushed. The Railway dashboard is the source of truth for production secrets.

### Code Changes — User & App Safety
- **Validate and sanitize all user input.** All data from users (form fields, URL params, request bodies) must be validated server-side before use. Never trust the frontend. Use `esc()` in HTML generation, parameterized queries everywhere.
- **No unauthenticated state mutations.** Every POST/PATCH/DELETE backend route must verify the Firebase idToken via the `auth` middleware before touching any data.
- **CORS must stay locked.** Never set `Access-Control-Allow-Origin: *` on routes that handle authenticated user data. The allowedOrigins list in `server.js` is the boundary — don't widen it without a clear reason.
- **Firestore rules enforce isolation.** Any new collections or data paths must have matching security rules — no collection should be publicly readable/writable. Test rules before deploying.
- **No direct eval or dynamic code execution.** Never use `eval()`, `new Function()`, or `vm.runInNewContext()` on user-supplied content.
- **CSP must not be weakened.** Don't add `unsafe-inline`, `unsafe-eval`, or wildcard sources to `netlify.toml` unless there's no other option — and flag it explicitly if so.

### Dependencies & Infrastructure
- **Pin or review new dependencies.** Before adding an npm package, check it's actively maintained and not known-vulnerable. Prefer packages with low dependency footprints.
- **No ephemeral storage for permanent data.** Railway's filesystem is cleared on redeploy — never store user files, signed PDFs, or any persistent data on the local filesystem. Use Firestore, Firebase Storage, or S3/R2.
- **Webhook endpoints that accept unauthenticated calls** (like `/webhooks/opensign`) must be read-only in effect — they should only update state in controlled ways and must never expose or return sensitive data.
- **Error responses must not leak internals.** Stack traces, file paths, DB queries, and service account details must never appear in HTTP error responses sent to clients.

### Before Every Commit
1. Check that no secrets are staged: `git diff --cached | grep -i 'key\|secret\|password\|token\|private'`
2. Confirm `.env` and any credential files are gitignored
3. If the change touches auth, CORS, Firestore rules, or CSP headers — explicitly note that in the commit message

## Standing Preferences

- **Michael prefers autonomous work** — act without asking when possible; try things before reporting limitations
- **Try first, explain later** — if a task seems impossible (git push, terminal access, network ops), attempt it before giving up or asking Michael to do it manually
- **Remote-capable**: Michael often works from phone via Dispatch. `start_task` and `start_code_task` both work remotely and can push to GitHub
- **Commit flags**: Always use `--no-verify` on commits to avoid hooks that can hang sessions
- The "Contractor CRM Project" folder in the workspace has a full archive of source, docs, configs, and the pentest report

## Related Files Outside This Repo

- **Pentest Report:** `Noah Presgrove/Contractor-CRM-Pentest-Report.docx` — 14 findings, 8 remediated, 2 open, 4 accepted risk
- **Project Record (current):** `Contractor_CRM_Project_Record_Apr27.pdf` — in the frontend repo root (workspace folder). Updated daily by scheduled task.
- **Project Record (older copy):** `/Users/michaelfazekas/Desktop/Contractor CRM Project/01 - Documentation/Contractor_CRM_Project_Record.pdf` — Apr 19 version, superseded
- **NOTE:** No `Contractor_CRM_Master_Record.docx` exists on this machine — the CLAUDE.md previously referenced a `Noah Presgrove/` folder that does not exist. The actual project record is the PDF above.
- **Backend Source:** `Noah Presgrove/contractor-crm-backend/` — Express server deployed on Railway (also at `/private/tmp/contractor-crm-backend/` on Mac Mini)
