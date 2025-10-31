# Bus Passenger Notes - Setup Instructions

## Prerequisites

1. Google Cloud Console account
2. Web hosting service (GitHub Pages, Netlify, Vercel, etc.)

## Setup Steps

### 1. Download SQL.js Library

Download the SQL.js library files and place them in the `lib/` directory:

1. Visit https://github.com/sql-js/sql.js/releases
2. Download the latest release (sql-wasm.js and sql-wasm.wasm)
3. Place both files in the `lib/` directory:
   - `lib/sql-wasm.js`
   - `lib/sql-wasm.wasm`

### 2. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application"
   - Add authorized JavaScript origins (your website URL)
   - Add authorized redirect URIs (your website URL)
   - Copy the Client ID
5. Update `js/main.js`:
   - Replace `YOUR_GOOGLE_CLIENT_ID` with your actual Client ID

### 3. Configure OAuth Scopes

The application requires the following Google Drive API scopes:
- `https://www.googleapis.com/auth/drive.file` (for creating and accessing app-specific files)

These are automatically requested during the OAuth flow.

### 4. Deploy the Application

Upload all files to your web hosting service:

```
/
├── index.html
├── SETUP.md
├── Requirements.txt
├── styles/
│   └── main.css
├── js/
│   ├── main.js
│   ├── auth/
│   │   └── GoogleAuthService.js
│   ├── storage/
│   │   ├── GoogleDriveService.js
│   │   └── DatabaseService.js
│   ├── models/
│   │   ├── Passenger.js
│   │   └── Note.js
│   ├── services/
│   │   ├── PassengerService.js
│   │   └── NoteService.js
│   └── ui/
│       ├── DateSelector.js
│       ├── TripSelector.js
│       ├── PassengerList.js
│       └── PassengerManager.js
└── lib/
    ├── sql-wasm.js
    └── sql-wasm.wasm
```

### 5. Test the Application

1. Navigate to your deployed URL
2. Click "Sign in with Google"
3. Grant the requested permissions
4. The application will create a "BusPassengerNotes" folder in your Google Drive
5. Add passengers using the "Manage Passengers" button
6. Start taking notes

## Features

- **Authentication**: Secure Google OAuth login
- **Auto-save**: Notes are automatically saved as you type (500ms debounce)
- **Background Sync**: Database syncs to Google Drive every 30 seconds
- **Offline-capable**: Works in browser with SQL.js (WebAssembly SQLite)
- **Dark Mode**: Automatically adapts to system preferences
- **Mobile-friendly**: Responsive design for phone and tablet use

## Troubleshooting

### Authentication Issues
- Verify your Client ID is correct in `js/main.js`
- Check that your website URL is added to authorized origins in Google Cloud Console
- Ensure cookies are enabled in your browser

### Database Not Syncing
- Check browser console for errors
- Verify Google Drive API is enabled
- Ensure you granted Drive permissions during login

### SQL.js Not Loading
- Verify both `sql-wasm.js` and `sql-wasm.wasm` are in the `lib/` directory
- Check browser console for 404 errors
- Ensure files are served with correct MIME types

## Architecture

The application follows SOLID principles with clear separation of concerns:

- **Models**: Data structures (Passenger, Note)
- **Services**: Business logic (PassengerService, NoteService)
- **Storage**: Data persistence (DatabaseService, GoogleDriveService)
- **Auth**: Authentication (GoogleAuthService)
- **UI**: User interface components (DateSelector, TripSelector, etc.)

All error handling occurs at the source layer, with no null returns for collections.
