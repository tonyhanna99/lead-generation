# Lead Generation Tool

This project is a simple internal lead generation tool that utilizes the Google Places API to find businesses without a website listed on Google. 

## Project Structure

```
lead-gen-tool
├── src
│   ├── server.js          # Entry point of the application
│   ├── routes
│   │   └── places.js      # API endpoints for Google Places
│   ├── services
│   │   └── googlePlaces.js # Logic for interacting with Google Places API
│   └── utils
│       ├── delay.js       # Function to implement delay for rate limiting
│       └── csvExport.js    # Function to export business data to CSV
├── public
│   ├── index.html         # Frontend HTML structure
│   ├── style.css          # Styles for the frontend
│   └── app.js             # Frontend JavaScript logic
├── .env                   # Environment variables (API key)
├── .gitignore             # Files and directories to ignore in Git
├── package.json           # npm configuration file
└── README.md              # Project documentation
```

## Getting Started

### Prerequisites

- Node.js installed on your machine
- An active Google Cloud account with access to the Google Places API

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd lead-gen-tool
   ```

2. Install the dependencies:
   ```
   npm install
   ```

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