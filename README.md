# Address Geocoder

Internal tool. Takes a Kinabase CSV export that has an address (location) field, looks each address up with the HERE geocoding API, and gives back the same CSV with the `Latitude` and `Longitude` columns filled in. Re-import the file and the records show up on the map.

## Run it

```bash
npm install
npm start
```

That opens the tool in your browser. Nothing is uploaded anywhere except the address text sent to HERE for lookup.

## Use it

1. Export the collection from Kinabase as CSV (collection menu → Export). The address field exports as `Address » Line 1`, `Address » City`, `Address » Postcode` and so on; older exports used `address (Line 1)`. Both are understood.
2. Drop the file on the page. If the file has more than one address field, pick the one to fill.
3. Choose the country to search in. The tool suggests one when most rows name the same country.
4. Click **Find coordinates**. Rows that already have coordinates or have no address are skipped.
5. Check the **Needs a look** filter for anything low confidence or not found, fix the address in the file if needed, and use **Retry problem rows**.
6. **Download CSV** and import it back into Kinabase with **Update matching records**, matching the CSV `Name` column (or whichever column identifies the record) to that field. The address columns map automatically, so only the match column needs choosing. Open the collection's map and the records are there.

Importing as **Create new records** also works, for a brand-new collection, but on an existing one it makes duplicates.

## What the outcomes mean

| Outcome | Meaning | In the download? |
|---------|---------|------------------|
| Placed | The exact address was found. The pin is on the building. | Always |
| Approximate | Only the postcode or street was found. The pin is close, usually within a street. | Yes, unless "Include approximate pins" is turned off |
| Check this | The result is doubtful: only the town was found, the row had no town or postcode, or the match was loose. | Only if "Include Check this pins" is turned on |
| Not found | Nothing came back. Check the spelling and postcode, fix the row in the file, and run again. | No |
| Skipped | The row had no address, or already had a pin. | Left as it was |

The **Why** column on each row says which of these applied in plain words.

## Sharing it with non-developers

```bash
npm run build:single
```

writes `release/address-geocoder.html`: the whole tool in one file, about 430 KB, with nothing to install and nothing to host. Send it by email or Teams, or put it on a shared drive. Double-clicking it opens the tool in the browser, and it works from there, including the HERE lookups and the CSV download. It never leaves the company except for the address text sent to HERE, so it is as private as the file is.

`npm run build` writes a `dist` folder instead, a normal static site. The included GitHub Actions workflow publishes it to GitHub Pages on every push to `main`: in the repo's Settings → Pages set Source to "GitHub Actions", add the `HERE_API_KEY` secret, and the URL appears after the first run. A claude.ai artifact can't host it because the artifact sandbox blocks the HERE requests.

Whichever way it is shared, the HERE key ends up in the page's JavaScript, as it must for a browser-only tool. That is why the tool has its own key, restricted to its domain.

## The HERE key

The tool uses its own HERE key, separate from the Kinabase client's, so its usage never touches the live quota. The key is never committed:

1. Get a free key: sign in at https://platform.here.com, choose the Freemium plan (250,000 requests a month), create an app and copy its REST API key. In the app's settings, restrict the key to the site's domain so a leaked copy is useless elsewhere.
2. **Locally**: copy `.env.example` to `.env` and paste the key after `VITE_HERE_API_KEY=`.
3. **On GitHub Pages**: add the key as a repository secret named `HERE_API_KEY` (Settings → Secrets and variables → Actions). The workflow bakes it in at build time.

A build with no key still opens, but says so and asks for a key in the settings cog.

## Settings (cog in the toolbar)

- **HERE API key**: the built-in one from the build, or a different key pasted in and remembered in the browser.
- **Include the title column**: helps when titles are business or building names, hurts when they are people's names.
- **Re-check rows that already have coordinates**: off by default so hand-placed pins are kept.
- **Add match and score columns**: extra columns for checking the result; leave them unmapped when importing.

## Samples

| File | What it is for |
|------|----------------|
| `samples/test-customers-import.csv` | 20 UK customers with a `Name` and an address, no coordinates. Import this into a fresh collection that has a `Name` text field and an `Address` location field to set up a round-trip test. |
| `samples/kinabase-export-before.csv` | What Kinabase exported after that import. Drop this on the tool. |
| `samples/kinabase-export-geocoded.csv` | What the tool gave back for it, all 20 rows placed. Import with Update matching records on `Name`. |
| `samples/customers-without-coordinates.csv` | 30 rows in the older bracket header style, including awkward cases (typo, postcode only, empty, overseas, already geocoded, street with no town) to see how each is handled. |
