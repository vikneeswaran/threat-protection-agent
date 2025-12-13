# GitHub Actions Workflows

## Build Tray Agents

Automatically builds macOS, Windows, and Linux tray agent bundles using GitHub Actions runners.

### Trigger

- Runs on push to `main` when `agent-tray/**` files change
- Can be triggered manually via "Actions" tab → "Build Tray Agents" → "Run workflow"

### What it does

1. **build-macos**: Runs on macOS runner, builds .app bundle, zips it
2. **build-windows**: Runs on Windows runner, builds .exe bundle, zips it  
3. **build-linux**: Runs on Ubuntu runner, builds Linux binary, zips it
4. **deploy**: Downloads all 3 zips, places them in `public/tray/`, commits and pushes

### After build completes

The zips are automatically committed to `public/tray/`:
- `public/tray/macos.zip`
- `public/tray/windows.zip`
- `public/tray/linux.zip`

Then deploy your Next.js app and the downloads will work.

### Manual trigger

If you need to rebuild:
1. Go to GitHub repo → Actions tab
2. Select "Build Tray Agents" workflow
3. Click "Run workflow" button
4. Wait ~5-10 minutes for builds to complete
5. Pull the changes: `git pull origin main`
6. Deploy
