# CEALI Digital Training Notebook

Professional Next.js resource portal for CEALI conference participants.

Built with:

- Next.js
- Tailwind CSS
- Google Apps Script Web App for registrations
- Google Sheets for lead storage
- Google Drive-ready PDF links
- Google Analytics 4 event tracking
- Vercel deployment

## What Participants Experience

1. They open the landing page from a QR code.
2. They submit first name, last name, email, mobile phone, optional organization, and consent.
3. Their information posts to a Google Apps Script Web App.
4. Apps Script appends the registration to Google Sheets.
5. They immediately unlock the Digital Training Notebook.
6. They can search, filter, favorite, view, download, or download all resources.

## Included Notebook Content

- 22 Presentation Handout cards
- 13 Appendix Resource cards
- Additional Resources area for CEALI website, upcoming trainings, Google Drive folder, Instagram, and contact information
- QR code asset at `public/qr/ceali-notebook-qr.svg`

Resource content is managed in:

```text
content/resources.json
```

## Local Setup

Use Node 22+.

```bash
pnpm install
pnpm run dev
```

Open:

```text
http://localhost:3000
```

Build check:

```bash
pnpm run build
pnpm run lint
```

## Environment Variables

Copy `.env.example` to `.env.local` for local testing. Add the same variables in Vercel.

Required for registrations:

```text
ADMIN_EXPORT_KEY=
NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL=
```

Recommended public links:

```text
NEXT_PUBLIC_NOTEBOOK_URL=
NEXT_PUBLIC_GOOGLE_SHEET_URL=
NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_URL=
NEXT_PUBLIC_GOOGLE_ANALYTICS_URL=https://analytics.google.com/
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_UPCOMING_TRAININGS_URL=https://www.ceali.org
```

Current live production URL:

```text
https://ceali-digital-training-notebook.vercel.app
```

Current Google assets:

```text
Google Sheet: https://docs.google.com/spreadsheets/d/1VVodUjabJLezHVroiysgnQU2Hte0lPw2nURM8QNHeu8
Google Drive Folder: https://drive.google.com/drive/folders/1btpWPeXYqQU7ntfEK5djxsVElrhKoiAt
```

## Google Sheets Setup

1. Create a Google Sheet named `CEALI Conference Registrations`.
2. Create a tab named `Registrations`.
3. Add this header row, or let Apps Script create it on first submission:

```text
Timestamp | First Name | Last Name | Email | Phone Number | Organization | Consent Status | Consent Text | Session ID | Page URL | Submitted At | User Agent
```

## Google Apps Script Setup

This replaces the old Google Sheets API service-account setup. You do not need a Google Cloud project, service account, JSON key, or private key.

1. Open the registration Google Sheet.
2. Choose **Extensions > Apps Script**.
3. Delete any starter code.
4. Paste the complete script from:

```text
google-apps-script/Code.gs
```

5. Confirm `SPREADSHEET_ID` matches the ID in your Google Sheet URL.
6. In Apps Script, open **Project Settings > Script properties**.
7. Add this script property:

```text
ADMIN_EXPORT_KEY = the same value you use in Vercel
```

8. Click **Save**.
9. Click **Deploy > New deployment**.
10. Click the gear next to **Select type** and choose **Web app**.
11. Use these deployment settings:

```text
Description: CEALI Registration Endpoint
Execute as: Me
Who has access: Anyone
```

12. Click **Deploy**.
13. Authorize the script when Google asks.
14. Copy the Web App URL. It should end in `/exec`.
15. In Vercel, add:

```text
NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/.../exec
```

16. Redeploy the Vercel project.

To view submissions, open the Google Sheet. To export contacts manually, use Google Sheets: **File > Download > Comma Separated Values (.csv)**.

The app also provides CSV export through the Apps Script Web App:

```text
/api/admin/contacts.csv?key=YOUR_ADMIN_EXPORT_KEY
```

## Google Drive PDF Setup

1. Create a Google Drive folder named `CEALI Digital Training Notebook`.
2. Upload all handout and appendix PDFs.
3. Set each PDF sharing to anyone with the link can view.
4. Copy each file ID from its Drive URL.

Example Drive URL:

```text
https://drive.google.com/file/d/FILE_ID_HERE/view
```

Paste `FILE_ID_HERE` into the matching item in `content/resources.json`:

```json
{
  "id": "template-01-general-child-observation",
  "driveFileId": "FILE_ID_HERE"
}
```

The app automatically creates Drive view and download URLs from `driveFileId`. Local PDFs in `public/resources/` remain as fallback files.

## Updating Resources Without Coding

Open:

```text
content/resources.json
```

To update a card, edit:

- `title`
- `description`
- `pages`
- `keywords`
- `driveFileId`

To replace a PDF:

1. Upload the new PDF to Google Drive.
2. Copy the new file ID.
3. Replace `driveFileId` for that resource.
4. Redeploy on Vercel.

To update a preview image:

1. Replace the image in `public/previews/handouts/` or `public/previews/appendix/`.
2. Keep the filename listed in `content/resources.json`.
3. Redeploy.

## Google Analytics

Create a GA4 property and web data stream.

Add the measurement ID to Vercel:

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Tracked events:

- `registration_complete`
- `resource_view`
- `resource_download`
- `download_all_handouts`

Use Google Analytics reports to see visitors, registrations, most viewed resources, and most downloaded resources.

## Vercel Deployment

1. Push this project to GitHub.
2. In Vercel, select **Add New Project**.
3. Import the GitHub repository.
4. Framework preset should be **Next.js**.
5. Add all environment variables from `.env.example`.
6. Deploy.
7. Test one registration and one resource download.

Recommended for 400+ attendees:

- Vercel Hobby or Pro is fine for a conference resource portal.
- PDFs should use Google Drive links for large public traffic.
- Keep the Google Sheet private. Apps Script writes to it as you.

## QR Code

Current QR target:

```text
https://ceali-digital-training-notebook.vercel.app
```

Regenerate after choosing the final Vercel or custom-domain URL:

```bash
/Users/yohimartinez/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/generate_qr.py https://YOUR-FINAL-URL public/qr/ceali-notebook-qr.svg
```

Use the QR image in slides, handouts, signage, or emails.

## Admin Checklist

Before the conference:

- Confirm Google Sheet receives a test registration.
- Confirm all Google Drive files open in an incognito/private browser.
- Confirm the QR code points to the final live URL.
- Confirm mobile layout on a phone.
- Confirm Google Analytics receives test events.
- Save the `ADMIN_EXPORT_KEY` somewhere secure.

After the conference:

- Export contacts from Google Sheets.
- Review GA4 events for most viewed and downloaded materials.
- Update `content/resources.json` for future events.
