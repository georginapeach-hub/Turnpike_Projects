# Turnpike Productions CRM prototype

A responsive SvelteKit prototype for tour bookings, venue and company directories,
follow-ups, artist briefings and a Wix CSV export preview.

## Run locally

Requires Node.js 22.12+ (Node 24 recommended) and npm.

```sh
npm ci
npm run dev
```

The development server prints its address. To validate and build:

```sh
npm run check
npm run build
npm run preview
```

In a restricted cloud workspace, use `npm ci --cache /tmp/turnpike-npm-cache`.

## Try the workflow

1. Open **New booking**, choose a production and venue, and enter a date.
2. Save it, then reopen it to edit logistics, contract progress and the deal.
3. Set a task and deadline; mark it complete from **Tasks**.
4. Mark an upcoming, confirmed booking for publication. **Website export**
   previews the records and downloads a CSV.
5. Download an artist briefing from the booking details. It uses the current
   form values; save separately if you want those edits retained.

All records are fictional. Changes are stored in this browser's local storage
under `turnpike-demo-v1`; browsers and devices do not share changes. Clearing that
key restores sample bookings. There are no accounts, access controls, live emails,
file uploads, electronic signatures or automatic financial calculations yet.
Directories are sample records and cannot yet be edited. The calendar groups
performances by month. Each prototype booking represents one performance;
multi-performance engagements and workshops are planned for the full CRM.

Do not enter real contact details, confidential deals or other sensitive data in
this public demo. Wix headers are based on the supplied screenshot and require
verification against the full import template. End times and venue phone numbers
are not collected yet; their CSV cells remain blank. Export includes only upcoming
confirmed performances explicitly marked for publication. Export dates use the
Europe/London timezone.

## GitHub Pages

The project uses SvelteKit's static adapter. A manual deployment workflow is
included at `.github/workflows/pages.yml`; nothing is automatically published.
After committing and pushing, select **GitHub Actions** as the Pages source in
repository Settings → Pages, then run **Deploy prototype to GitHub Pages** from
Actions. The workflow builds with `/Turnpike_Projects` as the base path.
For another repository name, update `BASE_PATH`; for a custom domain, leave it
empty. Configure access appropriate to the repository's GitHub plan. Only publish
fictional demo data.

For the production CRM, the recommended next phase is Supabase authentication,
Postgres and document storage, with editor access for the two owners and full
read-only access for Molly. Email integration depends on the underlying mailbox
provider used by Thunderbird.

## Browser smoke test

```sh
npx playwright install chromium
npm run test:smoke
```

The test starts and stops its own server on port 5180. If Chromium is already
installed, use `CHROMIUM_PATH=/usr/bin/chromium npm run test:smoke` instead.
It exercises booking creation, filtering, persistence, artist briefing downloads,
task completion, website CSV selection, calendar navigation and mobile layout.
