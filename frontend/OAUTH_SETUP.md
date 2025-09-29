# OAuth 2.0 Setup Guide

This application supports OAuth 2.0 authentication using Google and Auth0 providers, as well as traditional email/password registration.

## Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your OAuth credentials in the `.env` file.

## Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API or Google Identity API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Set the application type to "Web application"
6. Add authorized JavaScript origins:
   - `http://localhost:5173` (for development)
   - Your production domain (e.g., `https://yourdomain.com`)
7. Add authorized redirect URIs:
   - `http://localhost:5173` (for development)
   - Your production domain (e.g., `https://yourdomain.com`)
8. Copy the Client ID and add it to your `.env` file as `VITE_GOOGLE_CLIENT_ID`

## Auth0 Setup

1. Go to the [Auth0 Dashboard](https://manage.auth0.com/)
2. Create a new Auth0 account if you don't have one
3. Create a new Application → Single Page Application
4. Configure the following settings:
   - **Allowed Callback URLs**: `http://localhost:5173, https://yourdomain.com`
   - **Allowed Logout URLs**: `http://localhost:5173, https://yourdomain.com`
   - **Allowed Web Origins**: `http://localhost:5173, https://yourdomain.com`
5. Note your Domain and Client ID from the application settings
6. Add them to your `.env` file as:
   - `VITE_AUTH0_DOMAIN=your-domain.auth0.com`
   - `VITE_AUTH0_CLIENT_ID=your-client-id`

## Features

- **Google OAuth**: One-click login with Google accounts
- **Auth0**: Configurable identity provider with multiple social connections
- **Email/Password**: Traditional registration and login
- **Protected Routes**: All main application routes require authentication
- **User Profile**: Display user information in navigation
- **Persistent Sessions**: Users remain logged in across browser sessions

## Security Notes

- OAuth tokens are stored in localStorage for persistence
- All API calls should include the auth token in headers
- Backend should validate tokens on each request
- Consider implementing token refresh for long-term sessions

## Development

The authentication system works out of the box for development with placeholder values. For production deployment, you must configure actual OAuth credentials.

To test without OAuth setup:
1. Use the email/password registration form
2. Implement the backend authentication endpoints (`/api/auth/register`, `/api/auth/login`)
3. Mock responses for development can be added to the AuthContext