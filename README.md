# Image Processing App

A full-stack web application built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and Supabase. Features authentication, image upload, and image processing API.

## Features

- **Authentication**: Email/password signup and login with Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Image Upload**: Upload and preview images from the dashboard
- **Image Processing API**: Dummy API endpoint that returns processing results
- **Protected Routes**: Middleware-based route protection with Supabase sessions
- **Clean UI**: Modern, minimal interface with Tailwind CSS

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Create a new project
3. Wait for the project to be set up (takes a few minutes)

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
# Get these from your Supabase project settings: https://app.supabase.com/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

**How to get your Supabase credentials:**

1. Go to your Supabase project dashboard
2. Click on **Settings** (gear icon) → **API**
3. Copy the **Project URL** and paste it as `NEXT_PUBLIC_SUPABASE_URL`
4. Copy the **anon/public** key and paste it as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
encode/
├── app/
│   ├── api/
│   │   ├── logout/route.ts         # Logout API endpoint
│   │   ├── me/route.ts              # Get current user endpoint
│   │   └── process-image/route.ts  # Image processing API
│   ├── dashboard/
│   │   └── page.tsx                 # Protected dashboard page
│   ├── login/
│   │   └── page.tsx                 # Login page
│   ├── signup/
│   │   └── page.tsx                 # Signup page
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Home page (redirects)
├── lib/
│   └── supabase/
│       ├── client.ts                # Browser Supabase client
│       ├── server.ts                # Server Supabase client
│       └── middleware.ts            # Middleware helper
├── middleware.ts                    # Route protection middleware
└── package.json
```

## API Endpoints

### Authentication

- `POST /api/logout` - Logout current user

- `GET /api/me` - Get current authenticated user

### Image Processing

- `POST /api/process-image` - Process uploaded image (requires authentication)
  - Body: `FormData` with `image` field
  - Returns: `{ "labels": ["cat", "animal"], "confidence": 0.92, ... }`

## Authentication Flow

1. **Sign Up**: Users can create an account at `/signup`

   - Supabase handles password hashing and user creation
   - Email confirmation can be enabled in Supabase dashboard

2. **Login**: Users sign in at `/login`

   - Supabase manages session tokens and cookies
   - Sessions are automatically refreshed

3. **Protected Routes**: Middleware checks for valid Supabase session
   - Unauthenticated users are redirected to `/login`
   - Authenticated users accessing `/login` or `/signup` are redirected to `/dashboard`

## Usage

1. **Sign Up**: Navigate to `/signup` and create a new account
2. **Login**: Use `/login` to sign in with your credentials
3. **Dashboard**: After logging in, you'll be redirected to `/dashboard`
4. **Upload Image**: Select an image file (max 10MB) and click "Process Image"
5. **View Results**: See the processing results displayed on the dashboard

## Development

### Build for Production

```bash
npm run build
npm start
```

## Supabase Features Used

- **Authentication**: Email/password authentication
- **Session Management**: Automatic session handling with httpOnly cookies
- **User Management**: Built-in user profiles and metadata

## Security Notes

- Supabase handles all password hashing and encryption
- Sessions are managed securely with httpOnly cookies
- Protected routes are enforced via middleware
- File uploads are validated for type and size
- CORS and security headers should be configured for production

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)

## License

MIT
