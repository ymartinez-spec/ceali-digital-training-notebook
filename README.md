# CEALI Digital Resource Notebook

Professional conference resource portal for **Having Tough Conversations with Families of Children Who Require Additional Support**.

## What Is Included

- Landing page with CEALI branding, welcome copy, presenter bio, and call to action.
- Required registration form with consent language.
- Server-side registration storage in Cloudflare D1.
- Optional Google Sheets or Airtable sync through `LEAD_WEBHOOK_URL`.
- Searchable, mobile-responsive digital notebook.
- Presentation Materials and Appendix Resources sections with view/download actions.
- Favorite Resources saved in each participant's browser.
- Admin CSV export.
- Analytics for visitors, registrations, views, downloads, and most downloaded files.
- Conference QR code at `public/qr/ceali-notebook-qr.svg`.

## Source Document Note

The provided files currently split into:

- 17 top-level handout/template resources from `Tough_Conversations_Handouts_and_Templates.docx - Google Docs.pdf`.
- 13 appendix resource cards from `Tough_Conversations_Appendix_Word_Banks.docx - Google Docs.pdf`.

The original appendix source contains 14 numbered sections; the final participant card combines “Strategies & Supports” with “Documentation Phrases & Sentence Starters” so the displayed appendix count matches the requested 13 documents while preserving all pages. The original request mentions 22 handouts; the provided handout packet contains 17 explicit top-level handout/template sections. The app is metadata-driven, so additional resources can be added or sections can be split in `lib/resources.ts` without changing the card UI.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Set a private admin key in `.env.local`:

   ```bash
   ADMIN_EXPORT_KEY=your-private-key
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Build before launch:

   ```bash
   npm run build
   ```

## Lead Storage

Cloudflare D1 is the built-in operational database. It stores:

- Timestamp
- First name
- Last name
- Email
- Phone number
- Organization
- Consent

To also send every submission to Google Sheets or Airtable, set `LEAD_WEBHOOK_URL` in the hosted runtime environment.

### Google Sheets Webhook

Create a Google Sheet with columns:

`Timestamp, First Name, Last Name, Email, Phone Number, Organization, Consent`

Use this Apps Script as a web app endpoint:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.timestamp,
    data.firstName,
    data.lastName,
    data.email,
    data.phone,
    data.organization || "",
    data.consent ? "Yes" : "No"
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Deploy the Apps Script as a web app and set its URL as `LEAD_WEBHOOK_URL`.

### Airtable Webhook

Create an Airtable automation webhook that accepts the same JSON fields:

`timestamp, firstName, lastName, email, phone, organization, consent`

Set the webhook URL as `LEAD_WEBHOOK_URL`.

## Exporting Contacts

Open the deployed site, go to **Admin**, enter `ADMIN_EXPORT_KEY`, and select **Export CSV**.

Direct CSV endpoint:

```text
/api/admin/contacts.csv?key=YOUR_ADMIN_EXPORT_KEY
```

## Analytics

The Admin panel shows:

- Number of visitors
- Number of registrations
- Number of resource views
- Number of downloads
- Most downloaded resources

The app records analytics in the D1 `analytics_events` table.

## Updating Resources

Resource cards are controlled by `lib/resources.ts`.

To replace a document:

1. Put the replacement PDF in `public/resources/handouts/` or `public/resources/appendix/`.
2. Keep the same filename when possible.
3. Regenerate the first-page preview image:

   ```bash
   /Users/yohimartinez/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pdftoppm -png -singlefile -f 1 -l 1 -scale-to-x 640 -scale-to-y -1 public/resources/handouts/YOUR-FILE.pdf public/previews/handouts/YOUR-FILE
   ```

4. Run `npm run build`.

To add a document:

1. Add the PDF to `public/resources/handouts/` or `public/resources/appendix/`.
2. Generate its preview image in the matching `public/previews/` folder.
3. Add a new object in `handoutResources` or `appendixResources` in `lib/resources.ts`.

Each resource object needs:

- `id`
- `kind`
- `title`
- `description`
- `pages`
- `href`
- `preview`
- `keywords`

## QR Code

The QR code currently points to:

```text
https://www.ceali.org/tough-conversations-notebook
```

Regenerate it after choosing the final public URL:

```bash
/Users/yohimartinez/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/generate_qr.py https://YOUR-FINAL-URL public/qr/ceali-notebook-qr.svg
```

## Recommended Hosting

Use **Cloudflare Workers/Sites with D1** for this notebook.

Why:

- Static PDF assets and previews are served efficiently at the edge.
- D1 stores registrations and analytics without a separate database server.
- 400 simultaneous conference attendees is a modest workload for this architecture.
- The app is already built for the Sites/Cloudflare Worker deployment target.

Recommended launch path:

1. Deploy with Sites.
2. Add a custom route or redirect from `www.ceali.org/tough-conversations-notebook`.
3. Set runtime environment variables:
   - `ADMIN_EXPORT_KEY`
   - `LEAD_WEBHOOK_URL` if using Google Sheets or Airtable sync
4. Test one registration, one download, CSV export, and QR scan before the conference.
