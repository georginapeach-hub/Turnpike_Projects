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

1. Open **Add Booking**, choose a production and venue, and enter a date.
2. Save it, then reopen it to edit logistics, contract progress and the deal.
3. Set a task and deadline; mark it complete from **Tasks**.
4. Mark an upcoming, confirmed booking for publication. **Website export**
   previews the records and downloads a CSV.
5. Download an artist briefing from the booking details. It uses the current
   form values; save separately if you want those edits retained.

Without Supabase configuration, all records are fictional. Changes are stored in this browser's local storage
under `turnpike-demo-v1`; browsers and devices do not share changes. Clearing that
key restores sample bookings. Demo mode has no accounts, access controls, live emails,
file uploads, electronic signatures or automatic financial calculations yet.
Companies, productions and venues can be created and edited. Companies and productions include marketing materials. The calendar groups
performances by month. Each prototype booking represents one performance;
multi-performance engagements and workshops are planned for the full CRM.

Do not enter real contact details, confidential deals or other sensitive data in
this public demo. Wix headers are based on the supplied screenshot and require
verification against the full import template. End times are not collected yet. The existing Wix export still leaves its end-time
and venue-phone cells blank. Export includes only upcoming
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

The shared CRM integration uses Supabase authentication, Postgres and private
document storage, with equal view and edit access for every invited team member.
Connect and validate a project using the instructions below before real use. Email integration depends on the underlying mailbox
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


## Shared team CRM (requires a Supabase project)

The app now supports a shared database with sign-in. Every **invited CRM member**
can view and edit bookings, companies, productions and venues; public visitors cannot.
The integration is implemented but requires verification against your project
before entering real information. Demo browser records are not automatically
copied into the shared database, and a fresh shared database starts empty.

1. Create a Supabase project and run `supabase/schema.sql` once in its SQL editor.
2. Invite each colleague through Supabase Authentication. Add each user's UUID to
   `public.crm_members` using the example in the SQL file. Do not enable public
   membership management; membership is administered in the Supabase dashboard.
3. Set the Supabase Auth Site URL and allowed redirect URLs to the exact deployed
   app URL (include `/Turnpike_Projects/` when using GitHub Pages). Configure email
   delivery in Supabase. Invited users can enter their email and choose **Email
   me a sign-in link**, or sign in with an existing password.
4. Copy `.env.example` to ignored `.env` and set the project URL and **public
   publishable/anon key**, never a service-role key. These public settings are
   embedded at build time. Set the same two variables in your deployment build
   environment and rebuild. For GitHub Actions, pass them to the build step;
   the current Pages workflow does not yet supply them.
5. Run `npm run check`, `npm run build`, and test with two invited accounts.
   Confirm that each can create/edit records and open uploaded files, while a
   signed-out browser and an authenticated non-member cannot read or write them.
   Confirm rejected saves remain visible as errors. Verify Supabase backups and
   recovery arrangements before entering business records.

Use **Refresh shared records** to see changes made by colleagues. Edits save a
whole record; simultaneous edits currently use the last successful save. Change
history and conflict detection are not implemented. Venue records are shared too. New projects start empty: add a company, production
and venue before creating the first booking.

Production records store website, description, marketing copy, pull quotes,
images and a venue-pack PDF. Company records store website, images, marketing
copy, about text, contact name, email, phone and address. Private storage accepts
PDF, JPEG, PNG and WebP files up to 20 MB each. Demo mode supports existing HTTPS
asset links only. Removing a file reference does not delete the stored file;
unused uploads can be removed through the Supabase Storage dashboard.

**Prepare email** assembles an email draft for a selected venue using the current
form values. Review and save the record separately. The draft opens in your mail
app; the CRM does not send messages itself. Files are linked rather than attached.
Private links expire after seven days, so download and attach files for longer
access. The email preview can be copied if your mail app cannot handle a long
mailto link. Sending and editing the draft happen in the email app.

`npm run test:smoke` covers local directory edits, reload persistence and email
contents as well as the existing booking workflow. It does not validate a live
Supabase project's authentication or access policies.


### Pages styling regression check

After a shared-mode build (`BASE_PATH=/Turnpike_Projects npm run build` with the
public Supabase settings configured), run
`CHROMIUM_PATH=/usr/bin/chromium node tests/pages-sign-in.cjs`.
This checks CSS/JavaScript/image loading with and without a trailing slash,
desktop/mobile sign-in layout, and mocked email sign-in; it does not send email
or validate live Supabase access.


### Existing Supabase projects: add venue support

Before deploying venue support, run `supabase/migrations/20261008_add_venues.sql`
in the SQL editor. It updates the allowed record kinds and retains existing
records and access rules; do not rerun the initial schema. Referenced legacy
sample venues are retained for existing bookings; edit them or choose real
venues as appropriate. Fresh projects should use the updated `schema.sql`.
Venue fields include name, city, capacity, contact name/email/phone/address,
website, parking/loading and technical information. Everyone in the CRM team
can add and edit venues. Add Booking requires a production and venue and now
shows instructions when either is missing.
