# Vercel Environment Variables Setup

## Required Environment Variables for Vercel Deployment

### 1. Frontend-Only Variables (Exposed to client - VITE_ prefix)

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Backend URL (Coolify)
VITE_API_URL=https://alphaanalyzer-wisewolfpt.coolify.app
```

### 2. How to Configure in Vercel

1. Go to your project settings in Vercel
2. Navigate to "Environment Variables" section
3. Add each variable above with the correct values
4. Make sure to select the appropriate environments (Production, Preview, Development)

### 3. Important Notes

- The `VITE_API_URL` is already set in vercel.json but can be overridden in the Vercel dashboard
- The Supabase variables must be obtained from your Supabase project dashboard
- All backend API keys should remain on Coolify (not exposed to frontend)

### 4. Verifying Configuration

After deployment, you can verify the environment variables are working by:
1. Checking the browser's Network tab for API calls to the correct backend URL
2. Ensuring Supabase authentication is functioning
3. Verifying that the application loads without errors

## Next Steps

1. Create a Vercel account if you don't have one
2. Import the GitHub repository into Vercel
3. Configure the environment variables as listed above
4. Deploy the frontend
5. Update DNS if using a custom domain