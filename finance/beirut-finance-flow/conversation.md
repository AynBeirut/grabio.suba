# Conversation Log

## 2026-06-18 Importer Reliability

Problem: CSV imports for clients, suppliers, and products can reject valid rows with `Missing required 'name'`, especially when files come from Excel or use header variants.

Method:
- Audit `src/lib/csvImport.ts` and `src/components/DataImportDialog.tsx`.
- Fix CSV parsing for UTF-8 BOM, quoted fields, comma and semicolon delimiters, Excel `sep=` preambles, and empty rows.
- Add automatic and adjustable source-column to destination-field mapping.
- Add validation for required fields, invalid email/date values, and duplicates with exact source-column references.
- Add sample CSV fixtures and tests for clients, suppliers, and products.

Expected Results:
- Excel and Google Sheets CSV exports import without false missing-name failures.
- Header mismatches show a mapping screen instead of rejecting every row.
- Import preview clearly reports valid and invalid rows before writing data.

Next Steps:
- Completed parser, mapping, preview UI, validation, fixtures, and verification commands.

Results:
- Root cause confirmed: comma-only parsing and exact-header lookup failed semicolon/Excel/header-variant files, causing every row to miss the `name` field.
- Added source-aware parsing and mapping in `src/lib/csvImport.ts`.
- Added adjustable mapping preview in `src/components/DataImportDialog.tsx`.
- Added real sample fixtures under `src/lib/__fixtures__`.
- `npm test` passed: 6 importer tests.
- `npm run build` passed.
- `npm run lint` still fails on existing app-wide lint debt outside the changed importer files.

Remaining Limitations:
- CSV import is supported; native `.xlsx` parsing is not included.
- Current clients, suppliers, and products import schemas do not include a date destination field, but the importer now has shared date validation support for date-capable fields.

## 2026-06-18 Stabilization And SIM Migration

Problem: The app must replace Simple Invoice Manager before the subscription expires. Pending blockers are Google OAuth 404s, direct URL refresh 404s, SIM backup migration, and making `anwar@aynbeirut.com` Premium Plan by authorized override.

Method:
- Replace Lovable-hosted Google OAuth broker usage with Supabase native OAuth for self-hosted deployment.
- Add Apache/Webuzo SPA fallback so direct routes like `/invoices` serve the React app.
- Keep the completed CSV importer fixes as regression-tested work.
- Parse the SIM backup at `backup invoice manger/Backup_17Jun2026_0807.sim`.
- Add a migration preview/import path for clients, products/services, invoices, and receipts/payments.
- Keep invoice calculations, inventory calculations, payment verification, organization architecture, and existing working CRUD unchanged.

Backup Findings:
- Format: JSON with top-level `OtherData` and `InvoiceTBLs`.
- Clients: 85.
- Products/services: 276.
- Invoices: 15.
- Invoice line items: 42.
- Invoice payments: 5.
- Receipt rows: 6.

Next Steps:
- Completed OAuth/routing fixes.
- Completed SIM parser, preview, import UI, and sanitized tests.
- Completed app-level Premium override for `anwar@aynbeirut.com`.

Results:
- Google OAuth now uses Supabase native OAuth with `/auth/callback`; it no longer depends on Lovable `/~oauth/initiate`.
- Apache/Webuzo route refresh support added through `public/.htaccess`; build output includes `dist/.htaccess`.
- SIM migration UI added in Settings. It imports clients, products/services, invoices, and receipts/payments into the active organization.
- Historical invoice import bypasses normal invoice creation to avoid replaying stock deductions, document limits, and calculation side effects.
- `anwar@aynbeirut.com` receives app-level Premium Plan behavior through a narrow override; payment verification flow remains unchanged.
- `npm test` passed: 8 tests across CSV and SIM import.
- `npm run build` passed.
- `npm run lint` still fails on pre-existing app-wide lint debt, not in the new SIM/OAuth files.

Remaining:
- Real production data import requires logging into the app as `anwar@aynbeirut.com`, opening Settings > Data, selecting the SIM backup, reviewing the preview, and clicking import. No authenticated production session/service-role credential was available in this workspace for a direct terminal-side data write.
- Supabase Auth dashboard must allow redirect URL `https://<production-domain>/auth/callback` for Google OAuth.

## 2026-06-18 Grabio Finance Rebrand

Problem: The finance app should belong to the Grabio product line and be branded as `Grabio Finance`, powered by `emoove.co`.

Method:
- Inspected `grabio.space` for visual brand direction.
- Applied Grabio teal primary accents across the app UI.
- Updated landing page, app shell, footer, PWA metadata, browser metadata, and support contact copy.
- Preserved finance logic, migration logic, auth flow, and CRUD behavior.

Results:
- App title and public metadata now use `Grabio Finance — Powered by emoove.co`.
- Main shell and landing page use `Grabio Finance` with `Powered by emoove.co`.
- PWA manifests use Grabio Finance naming and teal theme color.
- `npm test` passed: 8 tests.
- `npm run build` passed.

Next Steps:
- Commit and deploy the rebrand when approved.

## 2026-06-18 Official Domain Setup

Problem: Keep `aynbeirut.dev` live, add the official app domain `grabio.online`, connect it to the VPS, and make GitHub deployments update the official domain too.

Method:
- Used the VPS/Webuzo root credentials stored in the local credentials file.
- Added an Apache vhost for `grabio.online` and `www.grabio.online` serving the existing app root at `/home/aynbeirut/public_html/aynbeirut.dev`.
- Added a local DNS zone on the VPS for `grabio.online` pointing apex and `www` to `104.207.71.117`.
- Kept the GitHub Actions deploy path unchanged because it deploys to the shared app root used by both domains.
- Renamed the deploy workflow to reflect the shared Grabio Finance domain deployment.

Results:
- Direct VPS Host-header check for `grabio.online` returns the current Grabio Finance app.
- VPS DNS answers `grabio.online` and `www.grabio.online` with `104.207.71.117`.
- `aynbeirut.dev` remains unchanged.

Remaining:
- Public DNS for `grabio.online` still uses Namecheap parking nameservers/records. Change the registrar DNS to either `ns1.emoove.co` and `ns2.emoove.co`, or set A records for `@` and `www` to `104.207.71.117`.
- SSL for `grabio.online` should be issued after DNS points to the VPS.

## 2026-06-18 Account Migration Change

Problem: Google Sign-In should be verified first on the current live domain. The business data should now belong to `anwar.abouhassan@gmail.com`, not `anwar@aynbeirut.com`. The old account should become a sub-account/member of the Gmail-owned organization.

Method:
- Parked the `grabio.online` public DNS change until Google Sign-In is confirmed stable.
- Documented the official-domain follow-up and account migration target in `README.md`.
- Changed the app-level Premium override target to `anwar.abouhassan@gmail.com`.

Results:
- `anwar.abouhassan@gmail.com` receives app-level Premium/Pro behavior.
- `anwar@aynbeirut.com` is no longer the Premium override target in code.

Remaining:
- Production SIM data still needs to be imported while logged in as `anwar.abouhassan@gmail.com`, or imported directly with Supabase service-role/admin access.
- Making `anwar@aynbeirut.com` a member/sub-account requires the Gmail-owned organization ID and the old account's registered Supabase user ID. This can be done from Organization Members after both accounts exist, or directly with Supabase admin access.

## 2026-06-18 New Supabase Project Preparation

Problem: Prepare a new owner-controlled Supabase project without switching production before schema, auth, and data are ready.

Method:
- Opened Supabase project `sczukeipzyfmyfshbcen` (`grabio finance`) under the `AYN BEIRUT` Supabase organization.
- Set Auth Site URL to `https://aynbeirut.dev`.
- Added redirect URLs for `https://aynbeirut.dev/auth/callback`, `https://grabio.online/auth/callback`, `https://www.grabio.online/auth/callback`, and `http://localhost:5173/auth/callback`.
- Applied the existing local Supabase migration history to the new project through the IPv4 session pooler.
- Moved the new database password from the temporary `data` file into gitignored `.credentials.md`.

Results:
- New project database connection verified through the session pooler.
- Migrations applied successfully.
- Verified public schema has 24 app tables, key organization/auth helper functions, and 49 RLS policies.

Remaining:
- Google provider is still disabled in the new project until OAuth client credentials are configured.
- The app `.env` still points to the old production project `bkxflwxkqnyohhussbvv`; do not switch until auth keys and data migration are ready.
- Business data still needs migration or re-import into the new project.
