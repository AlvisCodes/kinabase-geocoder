# Address Geocoder

Live at **https://alviscodes.github.io/kinabase-geocoder/** (published from `main` by GitHub Actions).

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


