# Mobile Device Access Setup Guide

This guide will help you access the application from your mobile device on the same local network.

## Prerequisites
- Your computer and mobile device must be connected to the same Wi-Fi network
- Backend server must be running
- Frontend dev server must be running

## Step 1: Find Your Computer's Local IP Address

### Windows:
1. Open Command Prompt or PowerShell
2. Run: `ipconfig`
3. Look for "IPv4 Address" under your active network adapter (usually Wi-Fi or Ethernet)
4. Example: `192.168.1.100`

### macOS:
1. Open Terminal
2. Run: `ifconfig | grep "inet " | grep -v 127.0.0.1`
3. Look for the IP address (usually starts with 192.168.x.x or 10.x.x.x)

### Linux:
1. Open Terminal
2. Run: `hostname -I` or `ip addr show`
3. Look for your local IP address

## Step 2: Configure Backend (Already Done)

The backend server is now configured to listen on all network interfaces (`0.0.0.0`), so it will accept connections from any device on your network.

## Step 3: Configure Frontend

### Option A: Using Environment Variable (Recommended)

1. **Find your local IP address:**
   ```bash
   cd backend
   npm run get-ip
   ```
   This will show your local IP and the exact URLs to use.

2. **Create a `.env` file in the project root** (same level as `package.json`):
   ```bash
   # Copy the example file
   cp .env.example .env
   ```

3. **Edit `.env` and update `VITE_API_URL`** with your local IP:
   ```
   VITE_API_URL=http://YOUR_LOCAL_IP:3000
   ```
   Example:
   ```
   VITE_API_URL=http://192.168.1.100:3000
   ```

4. **Restart your frontend dev server:**
   ```bash
   npm run dev
   ```

### Option B: Temporary Testing (Quick Method)

1. Find your local IP (e.g., `192.168.1.100`)
2. On your mobile device, open the browser
3. Navigate to: `http://YOUR_LOCAL_IP:8080` (frontend port)
4. The frontend will try to connect to `localhost:3000` by default, which won't work

**For quick testing, you can:**
- Use a browser extension to modify requests
- Or use the environment variable method (Option A)

## Step 4: Access from Mobile Device

1. Make sure both servers are running:
   - Backend: `http://localhost:3000` (or `http://YOUR_LOCAL_IP:3000`)
   - Frontend: `http://localhost:8080` (or `http://YOUR_LOCAL_IP:8080`)

2. On your mobile device's browser, navigate to:
   ```
   http://YOUR_LOCAL_IP:8080
   ```
   Replace `YOUR_LOCAL_IP` with your computer's local IP address.

## Troubleshooting

### Cannot connect from mobile
- ✅ Check that both devices are on the same Wi-Fi network
- ✅ Verify your computer's firewall allows connections on ports 3000 and 8080
- ✅ Make sure both servers are running
- ✅ Try accessing `http://YOUR_LOCAL_IP:3000/health` from mobile to test backend connectivity

### CORS errors
- The backend is configured to allow all origins in development mode
- If you see CORS errors, check that `ALLOWED_ORIGINS` is not set in your backend `.env` file (or set it to `*`)

### Connection refused
- Check Windows Firewall settings
- On Windows, you may need to allow Node.js through the firewall:
  1. Open Windows Defender Firewall
  2. Click "Allow an app or feature through Windows Defender Firewall"
  3. Find Node.js and allow it for both Private and Public networks

## Security Note

⚠️ **Important**: The current configuration allows all origins in development mode for easier testing. In production, you should:
- Set `ALLOWED_ORIGINS` to specific domains
- Use HTTPS
- Configure proper firewall rules

## Quick Test

1. From your mobile device, try accessing:
   ```
   http://YOUR_LOCAL_IP:3000/health
   ```
   You should see: `{"success":true,"message":"Server is healthy",...}`

2. If that works, try the frontend:
   ```
   http://YOUR_LOCAL_IP:8080
   ```

