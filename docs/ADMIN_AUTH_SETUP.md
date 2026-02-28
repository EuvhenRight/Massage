# Admin Authentication Setup

Admin routes (`/admin`) are protected with [Auth.js](https://authjs.dev) using Google OAuth.

## 1. Create Google OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a project or select existing
3. **Create Credentials** → **OAuth client ID**
4. Application type: **Web application**
5. Add authorized redirect URI:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
6. Copy **Client ID** and **Client Secret**

## 2. Environment variables

Add to `.env.local`:

```env
AUTH_SECRET=your-secret        # Run: npx auth secret
AUTH_GOOGLE_ID=your-client-id
AUTH_GOOGLE_SECRET=your-client-secret
AUTH_ADMIN_EMAILS=v2studiosk@gmail.com
```

`AUTH_ADMIN_EMAILS` is comma-separated. Only these emails can access `/admin`.

## 3. Test

1. Run `npm run dev`
2. Visit `/admin` → redirects to sign-in
3. Sign in with Google (must be in `AUTH_ADMIN_EMAILS`)
4. Access admin panel
