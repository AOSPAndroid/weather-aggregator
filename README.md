# Prediction Market Weather Aggregator

A production-grade weather data aggregation service that ingests multiple sources per city (London, Paris, Dallas, Miami), computes resolution-ready outputs for prediction-market daily-high-temperature contracts, and surfaces confidence/risk signals through both a REST API and a visual dashboard.

## Architecture & Features

- **Sources**: Priority ingestion of official APIs (Open-Meteo, NWS, Met Office, Météo-France), with robust scraper fallbacks.
- **Resolution Anchor**: Uses Weather Underground as the anchor source for resolving contracts, and IEM for US daily max recording.
- **Risk Gates**: Demands >= 2 independent sources, strict spread thresholds, and rejects scraper-only data without cross-confirmation. 
- **Polite Scraping**: Node-cron scheduler runs every 12 mins with backoff/jitter. Frontend hits cached data without triggering new scrapes.
- **Strict Metric Separation**: \`current_temp\`, \`provisional_daily_high\`, and \`recorded_daily_max\` are never mixed silently.

## Quick Start

1. \`npm install\`
2. Optional: configure API keys in \`.env\`
   \`\`\`bash
   cp .env.example .env
   \`\`\`
3. \`npm start\`
4. Visit \`http://localhost:3000\`

## Configuration

See \`.env.example\` for all configurable parameters including risk gates (\`MAX_SPREAD_C\`, \`MAX_ANCHOR_STALE_MINUTES\`) and reliability thresholds (\`FETCH_TIMEOUT_MS\`).

## API Endpoints

- \`GET /api/all/:city\` - Full dashboard state & resolution data
- \`GET /api/decision/:city/:date\` - Structured decision snapshot for audit
- \`GET /api/history/:city?hours=24\` - Fetch log dump
- \`GET /api/source-health\` - Circuit breaker statuses
- \`GET /api/health\` - Service uptime and DB check
