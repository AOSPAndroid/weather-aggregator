require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  
  CITIES: {
    london: { lat: 51.5074, lon: -0.1278, tz: 'Europe/London', icao: 'EGLL' },
    paris: { lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris', icao: 'LFPG' },
    dallas: { lat: 32.7767, lon: -96.7970, tz: 'America/Chicago', icao: 'KDFW' },
    miami: { lat: 25.7617, lon: -80.1918, tz: 'America/New_York', icao: 'KMIA' }
  },

  API_KEYS: {
    metOffice: process.env.MET_OFFICE_API_KEY || null,
    meteoFrance: process.env.METEO_FRANCE_API_KEY || null,
    wu: process.env.WU_API_KEY || null,
  },

  SOURCES: {
    openMeteo: process.env.ENABLE_OPEN_METEO !== 'false',
    nws: process.env.ENABLE_NWS !== 'false',
    metOffice: process.env.ENABLE_MET_OFFICE !== 'false',
    meteoFrance: process.env.ENABLE_METEO_FRANCE !== 'false',
    wu: process.env.ENABLE_WUNDERGROUND !== 'false',
    iem: process.env.ENABLE_IEM !== 'false',
    metar: process.env.ENABLE_METAR !== 'false',
    scrapers: process.env.ENABLE_SCRAPERS !== 'false',
  },

  RELIABILITY: {
    timeoutMs: parseInt(process.env.FETCH_TIMEOUT_MS, 10) || 9000,
    maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 1,
    cbThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD, 10) || 3,
    cbResetMs: parseInt(process.env.CIRCUIT_BREAKER_RESET_MS, 10) || 300000,
  },

  SCRAPING: {
    intervalMs: parseInt(process.env.SCRAPE_INTERVAL_MS, 10) || 720000,
    jitterPct: parseInt(process.env.SCRAPE_JITTER_PCT, 10) || 30,
    backoffInitialMs: parseInt(process.env.SCRAPE_BACKOFF_INITIAL_MS, 10) || 1800000,
    backoffMaxMs: parseInt(process.env.SCRAPE_BACKOFF_MAX_MS, 10) || 3600000,
    dailyCap: parseInt(process.env.SCRAPE_DAILY_CAP, 10) || 100,
  },

  GATES: {
    minSources: parseInt(process.env.MIN_INDEPENDENT_SOURCES, 10) || 2,
    maxSpreadC: parseFloat(process.env.MAX_SPREAD_C) || 5.0,
    maxAnchorStaleMin: parseInt(process.env.MAX_ANCHOR_STALE_MINUTES, 10) || 120,
    rejectScraperOnly: process.env.REJECT_SCRAPER_ONLY !== 'false',
  },

  CONFIDENCE: {
    anchorConflictThresholdC: parseFloat(process.env.ANCHOR_CONFLICT_THRESHOLD_C) || 2.0,
    highConfidenceMinSources: parseInt(process.env.HIGH_CONFIDENCE_MIN_SOURCES, 10) || 3,
  }
};
