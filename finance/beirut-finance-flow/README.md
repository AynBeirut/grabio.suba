# Grabio Finance

Grabio Finance is the finance/invoicing app for the Grabio product line, powered by `emoove.co`.

## Production

- Current live domain: `https://aynbeirut.dev`
- Planned official domain: `grabio.online`
- VPS: `104.207.71.117`
- App document root on VPS: `/home/aynbeirut/public_html/aynbeirut.dev`
- GitHub repository: `a-nooor/beirut-finance-flow`
- Deployment: GitHub Actions builds the app and rsyncs `dist/` to the shared app document root.

## Official Domain Follow-Up

Leave `grabio.online` parked for now until Google Sign-In is confirmed stable on the current live domain.

Prepared server-side work:

- Apache vhost exists for `grabio.online` and `www.grabio.online`.
- VPS DNS zone exists for `grabio.online`.
- Direct Host-header checks against the VPS served the Grabio Finance app.
- `aynbeirut.dev` remains unchanged and live.
- Supabase Auth redirect URLs include `https://grabio.online/auth/callback` and `https://www.grabio.online/auth/callback`.
- Google Console has `grabio.online` configured for the app.

Remaining when ready:

- Change registrar nameservers for `grabio.online` to `ns1.emoove.co` and `ns2.emoove.co`, or point Namecheap DNS A records for `@` and `www` to `104.207.71.117`.
- Issue SSL for `grabio.online` and `www.grabio.online` after DNS reaches the VPS.

## Account Migration Follow-Up

New production owner target:

- Primary account: `anwar.abouhassan@gmail.com`
- Premium override target: `anwar.abouhassan@gmail.com`
- Sub-account target: `anwar@aynbeirut.com`

The Simple Invoice Manager data should be imported into the organization owned by `anwar.abouhassan@gmail.com`, not the old `anwar@aynbeirut.com` account.

To complete production data migration, use one of these paths:

- Log in as `anwar.abouhassan@gmail.com`, open Settings > Data, import `backup invoice manger/Backup_17Jun2026_0807.sim`, review the preview, and confirm import.
- Or provide Supabase service-role/admin access so the migration can be executed directly against the production database.

After the Gmail-owned organization exists and the old account is registered, add `anwar@aynbeirut.com` as an organization member from Organization Members.

## New Supabase Project

Prepared but not active:

- Project ref: `sczukeipzyfmyfshbcen`
- Project name: `grabio finance`
- Supabase organization: `AYN BEIRUT`
- Auth Site URL: `https://aynbeirut.dev`
- Redirect URLs include `aynbeirut.dev`, `grabio.online`, `www.grabio.online`, and local development callbacks.
- Database schema migrations have been applied and verified.
- Google provider is enabled.
- New project publishable key is captured in local `.credentials.md`.

Do not switch production to this project until business data migration/import is complete. The current active app still uses `bkxflwxkqnyohhussbvv`.

## Development

```sh
npm install
npm run dev
```

## Verification

```sh
npm test
npm run build
```
