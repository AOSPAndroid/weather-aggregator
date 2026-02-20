# Weather Aggregator - Windows Server Setup

## Step 1: Download Cloudflare Tunnel

1. Download from: https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
2. Rename to `cloudflared.exe`
3. Place in this folder

## Step 2: Run Setup (as Administrator)

Right-click this file → "Run with PowerShell" (as Administrator)

Or paste these commands in PowerShell (as Admin):

```powershell
# Navigate to this folder
cd C:\path\to\weather-aggregator

# Create tunnel
.\cloudflared.exe tunnel create weather-server

# Create config
$config = @"
hostname: weather.yourdomain.com
url: http://localhost:3000
 Tunnel: weather-server
"@
Set-Content -Path "$env:USERPROFILE\.cloudflared\config.yml" -Value $config

# Run tunnel
.\cloudflared.exe tunnel --url http://localhost:3000
```

## Step 3: Set up your domain (optional)

- Go to Cloudflare Dashboard → Tunnels
- Add your custom domain (requires Cloudflare DNS)

## Step 4: Run the Weather Aggregator

```powershell
# In a new terminal
cd C:\path\to\weather-aggregator
npm install
npm start
```

---

## Quick Start (without custom domain):

```powershell
.\cloudflared.exe tunnel --url http://localhost:3000
```

This gives you a temporary URL like:
`https://random-name.trycloudflare.com`

## To run 24/7 as a Windows Service:

```powershell
.\cloudflared.exe service install
.\cloudflared.exe tunnel run weather-server
```
