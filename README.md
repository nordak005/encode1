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
 <img width="643" height="622" alt="image" src="https://github.com/user-attachments/assets/7f807093-02a9-4410-9073-23b9a2c9102a" />
**How to get your Supabase credentials:**

1. Go to your Supabase project dashboard
2. Click on **Settings** (gear icon) → **API**
3. Copy the **Project URL** and paste it as `NEXT_PUBLIC_SUPABASE_URL`
4. Copy the **anon/public** key and paste it as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
<img width="1344" height="641" alt="image" src="https://github.com/user-attachments/assets/836f6302-ef6c-4a4d-a2d1-51051e6b0165" />



### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
<img width="1125" height="595" alt="image" src="https://github.com/user-attachments/assets/1c97d040-990e-4c17-9717-b48a74ebdf02" />



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

<img width="800" height="533" alt="image" src="https://github.com/user-attachments/assets/e6f52cdf-d233-40fa-a24f-bbe46d77a763" />


## API Endpoints

### Authentication

- `POST /api/logout` - Logout current user

- `GET /api/me` - Get current authenticated user

### Image Processing

- `POST /api/process-image` - Process uploaded image (requires authentication)
  - Body: `FormData` with `image` field
  - Returns: `{ "labels": ["cat", "animal"], "confidence": 0.92, ... }`
  - <img width="1333" height="645" alt="image" src="https://github.com/user-attachments/assets/19658ab2-d2c5-43f3-8516-f65af9ea86a7" />


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


<img width="1333" height="632" alt="image" src="https://github.com/user-attachments/assets/b5b65994-39ec-408c-a55d-525cd8f2d51b" />


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

##blender
<img width="617" height="383" alt="image" src="https://github.com/user-attachments/assets/61672ecf-5a03-430e-ab4a-7a99d5d680b4" />

-Used blender and also learned how to do 3-d modeling using it
<img width="198" height="309" alt="image" src="https://github.com/user-attachments/assets/c1453c9a-98a7-44f5-8006-ba4b054d16b8" />


## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)

## License


MIT
