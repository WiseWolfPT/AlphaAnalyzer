# Koyeb Deployment Troubleshooting

## Issue: "No active service" Error

The application is running (health checks pass) but shows "No active service" when accessing the main URL.

## Root Cause
Port configuration mismatch. Koyeb dynamically assigns ports through the PORT environment variable, but the configuration was hardcoding port 3001.

## Solution Applied

1. **Updated koyeb.yaml**:
   - Changed service port from 3001 to 8000
   - Removed hardcoded PORT environment variable
   - Let Koyeb assign the port dynamically

2. **Updated server files**:
   - Modified koyeb-server.ts to use `process.env.PORT || 8000`
   - Modified simple-server.ts to use `process.env.PORT || 8000`
   - Added comments explaining Koyeb port assignment

3. **Updated Dockerfile**:
   - Changed EXPOSE from 3001 to 8000

## Deployment Steps

1. **Commit and push changes**:
   ```bash
   git add koyeb.yaml server/koyeb-server.ts server/simple-server.ts Dockerfile.koyeb
   git commit -m "fix: Update Koyeb configuration to use dynamic port assignment"
   git push origin phase-0-main
   ```

2. **In Koyeb Dashboard**:
   - Go to your service
   - Click "Redeploy" to pick up the new configuration
   - Remove the PORT environment variable if it's set to 3001

3. **Verify deployment**:
   - Check build logs for any errors
   - Wait for health checks to pass
   - Test the main URL

## Important Notes

- Koyeb assigns ports dynamically through the PORT environment variable
- Never hardcode the PORT in Koyeb deployments
- The application must listen on the port provided by Koyeb
- Health checks use the internal port, but external access uses Koyeb's routing

## Testing After Deployment

1. Test health endpoint: `https://your-app.koyeb.app/api/health`
2. Test root endpoint: `https://your-app.koyeb.app/`
3. Test API endpoints: `https://your-app.koyeb.app/api/market-data/health`

## If Issue Persists

1. Check Koyeb logs for any port binding errors
2. Ensure no PORT environment variable is hardcoded in Koyeb settings
3. Verify the application starts without errors
4. Check if the service is listening on 0.0.0.0 (all interfaces) not just localhost