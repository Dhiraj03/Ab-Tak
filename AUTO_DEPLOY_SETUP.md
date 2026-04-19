# Auto-Deployment Setup

This repository automatically deploys to Cloudflare on every push to the `main` branch.

## Required GitHub Secrets

You need to add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

### 1. CLOUDFLARE_API_TOKEN
Create a Cloudflare API token with these permissions:
- **Cloudflare Workers**: Edit
- **Cloudflare Pages**: Edit
- **Account**: Read

Get it from: https://dash.cloudflare.com/profile/api-tokens

Template: `Edit Cloudflare Workers` + `Edit Cloudflare Pages`

### 2. CLOUDFLARE_ACCOUNT_ID
Your Cloudflare account ID. Find it in the right sidebar of any domain in your Cloudflare dashboard.

### 3. VITE_API_BASE_URL
The URL of your deployed backend Worker:
```
https://ab-tak-api.ashishajr.workers.dev
```

## How It Works

On every push to `main`:
1. Backend builds and deploys to Cloudflare Workers
2. Frontend builds (using the backend URL) and deploys to Cloudflare Pages
3. Both deployments happen automatically

## Manual Deployment

If you need to deploy manually:

```bash
# Deploy backend only
npm run deploy:backend

# Deploy frontend only
npm run deploy:ui

# Deploy both
npm run deploy
```

## Troubleshooting

**Build fails in GitHub Actions?**
- Check that all secrets are set correctly
- Verify the API token has the right permissions
- Check the Actions logs for specific errors

**Frontend not connecting to backend?**
- Make sure `VITE_API_BASE_URL` secret is set to the correct Worker URL
- Verify CORS is enabled on the backend

## Local Development

```bash
# Install dependencies
npm install

# Run locally (both frontend and backend)
npm run dev

# Run just backend
npm run dev:backend

# Run just frontend
npm run dev:ui
```
