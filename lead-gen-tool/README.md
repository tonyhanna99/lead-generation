# LeadGen Tool

Internal lead generation tool — finds businesses without a website using the Google Places API, with a Firestore-backed tracker.

## Run Locally

```bash
cd lead-gen-tool
npm install
node src/server.js
```

Then open:
- **Home:** http://localhost:3000
- **Lead Gen:** http://localhost:3000/lead-gen
- **Tracker:** http://localhost:3000/tracker

The frontend auto-detects localhost — no config changes needed.

## .env file

Create `lead-gen-tool/.env`:
```
GOOGLE_PLACES_API_KEY=your_key
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Deploy

- **Backend** → [Render](https://render.com) — auto-deploys from `main`
- **Frontend** → [Vercel](https://vercel.com) — auto-deploys from `main`

---

3. Create a `.env` file in the root directory and add your Google Places API key:
   ```
   GOOGLE_PLACES_API_KEY=your_api_key_here
   ```

### Running the Application

1. Start the server:
   ```
   node src/server.js
   ```

2. Open your browser and navigate to `http://localhost:3000` to access the application.

### Testing the Application

1. Enter a business keyword (e.g., "plumbers") and a location (e.g., "Blacktown NSW").
2. Click the "Search" button to initiate the search.
3. The results will be displayed in a table format, showing the business name, address, and Place ID.
4. You can also export the results to a CSV file using the "Export CSV" button.

## Contributing

If you would like to contribute to this project, please fork the repository and submit a pull request with your changes.

## License

This project is licensed under the MIT License.