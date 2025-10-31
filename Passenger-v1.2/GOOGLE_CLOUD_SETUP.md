# Google Cloud Console Setup Guide

This guide walks you through setting up Google OAuth 2.0 and Drive API access for the Bus Passenger Notes application.

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Click "New Project"
4. Enter project name: "Bus Passenger Notes" (or your preferred name)
5. Click "Create"
6. Wait for project creation to complete

## Step 2: Enable Google Drive API

1. In your project, go to "APIs & Services" > "Library"
2. Search for "Google Drive API"
3. Click on "Google Drive API"
4. Click "Enable"
5. Wait for the API to be enabled

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type (unless you have a Google Workspace)
3. Click "Create"

### Fill in App Information:
- **App name**: Bus Passenger Notes
- **User support email**: Your email address
- **Developer contact email**: Your email address
- Click "Save and Continue"

### Scopes:
1. Click "Add or Remove Scopes"
2. Filter for "Google Drive API"
3. Select: `https://www.googleapis.com/auth/drive.file`
   - This allows the app to create and access only files it creates
4. Click "Update"
5. Click "Save and Continue"

### Test Users (for development):
1. Click "Add Users"
2. Add your email address (and any other test users)
3. Click "Save and Continue"
4. Click "Back to Dashboard"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"

### Configure the OAuth Client:
- **Name**: Bus Passenger Notes Web Client
- **Authorized JavaScript origins**:
  - For local development: `http://localhost:5500` (or your local server port)
  - For production: `https://yourdomain.com`
- **Authorized redirect URIs**:
  - For local development: `http://localhost:5500` (or your local server port)
  - For production: `https://yourdomain.com`

4. Click "Create"
5. **Copy the Client ID** - you'll need this!

## Step 5: Update Application Configuration

1. Open `Passenger/js/config.js`
2. Replace the `googleClientId` with your new Client ID:

```javascript
export const AppConfig = {
    useLocalStorage: false,  // Set to false to use Google Drive
    googleClientId: 'YOUR-CLIENT-ID-HERE.apps.googleusercontent.com',
    localStorageKey: 'bus-passenger-notes-db'
};
```

## Step 6: Update HTML Script Tag

Ensure your `index.html` has the correct Google API script:

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

## Step 7: Test the Application

1. Serve your application locally (e.g., with Live Server on port 5500)
2. Open the application in your browser
3. Click "Sign in with Google"
4. You should see a consent screen asking for Drive API permissions
5. Grant permissions
6. The app should now be able to access Google Drive

## Troubleshooting

### "Method doesn't allow unregistered callers"
- **Cause**: Using ID token instead of OAuth access token
- **Solution**: Ensure you're using the updated `GoogleAuthService.js` that uses `google.accounts.oauth2`

### "Access blocked: This app's request is invalid"
- **Cause**: OAuth consent screen not configured or missing scopes
- **Solution**: Complete Step 3 above, ensure Drive API scope is added

### "redirect_uri_mismatch"
- **Cause**: Your application URL doesn't match authorized redirect URIs
- **Solution**: Add your exact URL (including port) to authorized redirect URIs in Step 4

### "idpiframe_initialization_failed"
- **Cause**: Cookies blocked or third-party cookies disabled
- **Solution**: Enable cookies in browser settings

### Token expires too quickly
- **Cause**: OAuth tokens expire after 1 hour by default
- **Solution**: The app automatically refreshes tokens when needed

## Security Notes

1. **Never commit your Client ID to public repositories** if it's for production
2. Keep your OAuth consent screen information accurate
3. Only request the minimum scopes needed (`drive.file` not `drive`)
4. Regularly review authorized applications in your Google Account settings

## Production Deployment

When deploying to production:

1. Update authorized JavaScript origins and redirect URIs with your production domain
2. Consider publishing your OAuth consent screen (requires verification for >100 users)
3. Use environment variables for the Client ID instead of hardcoding
4. Enable HTTPS (required for OAuth in production)

## Scope Explanation

`https://www.googleapis.com/auth/drive.file`
- Allows the app to create files in Google Drive
- Allows the app to access only files it created
- Does NOT allow access to other files in the user's Drive
- Most secure option for this use case

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [OAuth 2.0 for Client-side Web Applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)
