# Focus Now

React/Vite habit tracker with an Express API.

## Run Locally

Prerequisite: Node.js 20 or newer.

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend and backend run together locally.

## Production Deployment

The production setup uses:

- Vercel for the Vite frontend.
- Render Web Service for the Express API.
- A Render persistent disk for `mountain_habit_tracker_db.json`.

### Render Backend

Create a Render Web Service from this repository:

```text
Build Command: npm ci && npm run build
Start Command: npm start
```

Add these Render environment variables:

```text
NODE_ENV=production
JWT_SECRET=<long-random-secret>
CLIENT_ORIGIN=https://your-project.vercel.app
DATA_DIR=/var/data
```

Attach a persistent disk mounted at `/var/data`. Without the disk, accounts and
habits can disappear whenever the Render service restarts or redeploys.

On startup the API logs the database path and user count. Verify persistence with:

```text
https://your-api-name.onrender.com/api/health
```

You should see `database.usersInMemory` increase after registration and stay
the same after a redeploy when `DATA_DIR=/var/data` and the disk are configured.

### Vercel Frontend

Import the same repository into Vercel and configure:

```text
Framework Preset: Vite
Build Command: npm run build:client
Output Directory: dist
```

Add this Vercel environment variable for Production, Preview, and Development:

```text
VITE_API_BASE_URL=https://your-api-name.onrender.com/api
```

Redeploy after changing any `VITE_` environment variable because Vite embeds it
during the build.

For preview deployments, either add each preview origin to `CLIENT_ORIGIN` or
set `ALLOW_VERCEL_ORIGINS=true` on Render.

Verify the backend before testing login:

```text
https://your-api-name.onrender.com/api/health
```

It should return `{"status":"ok"}`.
