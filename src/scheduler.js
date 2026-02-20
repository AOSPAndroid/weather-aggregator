const cron = require('node-cron');
const config = require('./config');
const cache = require('./cache');
const database = require('./db/database');

const openMeteo = require('./sources/open-meteo');
const nws = require('./sources/nws');
const metOffice = require('./sources/met-office');
const meteoFrance = require('./sources/meteo-france');
const wunderground = require('./sources/wunderground');
const iem = require('./sources/iem');
const metar = require('./sources/metar');

class Scheduler {
  constructor() {
    this.dailyCaps = {};
    this.backoffs = {};
  }

  getFetchers(city) {
    const fetchers = [];
    if (config.SOURCES.openMeteo) fetchers.push(openMeteo);
    if (config.SOURCES.metar) fetchers.push(metar);
    if (config.SOURCES.wu) fetchers.push(wunderground);

    if (city === 'london' && config.SOURCES.metOffice) fetchers.push(metOffice);
    if (city === 'paris' && config.SOURCES.meteoFrance) fetchers.push(meteoFrance);
    if ((city === 'dallas' || city === 'miami') && config.SOURCES.nws) fetchers.push(nws);
    if ((city === 'dallas' || city === 'miami') && config.SOURCES.iem) fetchers.push(iem);

    return fetchers;
  }

  async runCycle(city) {
    const fetchers = this.getFetchers(city);
    const cityConfig = config.CITIES[city];

    for (const fetcher of fetchers) {
      const lockKey = `${city}_${fetcher.sourceId}`;

      const today = new Date().toISOString().split('T')[0];
      const capKey = `${lockKey}_${today}`;
      if ((this.dailyCaps[capKey] || 0) >= config.SCRAPING.dailyCap) {
        console.warn(`[Scheduler] Daily cap reached for ${lockKey}`);
        continue;
      }

      if (this.backoffs[lockKey] && Date.now() < this.backoffs[lockKey].retryAt) {
        continue;
      }

      try {
        const results = await fetcher.fetch(city, cityConfig);
        this.dailyCaps[capKey] = (this.dailyCaps[capKey] || 0) + 1;

        let successCount = 0;
        for (const r of results) {
          database.insertFetchLog({
            city: city,
            source_id: r.source_id,
            source_type: fetcher.type,
            metric_type: r.metric_type,
            value_c: r.value_c,
            value_f: r.value_f,
            parse_method: r.parse_method,
            parse_status: r.parse_status,
            raw_snippet: r.raw_snippet,
            latency_ms: r.latency_ms,
            http_status: r.http_status
          });

          if (r.parse_status === 'ok') successCount++;
        }

        if (successCount === 0 && results.some(r => r.parse_status === 'fetch_error')) {
          const currentBackoff = this.backoffs[lockKey] ?
            Math.min(this.backoffs[lockKey].currentBackoff * 2, config.SCRAPING.backoffMaxMs) :
            config.SCRAPING.backoffInitialMs;

          this.backoffs[lockKey] = {
            currentBackoff,
            retryAt: Date.now() + currentBackoff
          };
        } else {
          delete this.backoffs[lockKey];
        }

      } catch (err) {
        console.error(`[Scheduler] Uncaught error during ${lockKey} fetch:`, err);
      }
    }

    this.updateCache(city);
  }

  updateCache(city) {
    const history = database.getHistory(city, 24);
    cache.set(city, history);
  }

  start() {
    const cities = Object.keys(config.CITIES);

    cities.forEach((city, index) => {
      const intervalMinutes = Math.floor(config.SCRAPING.intervalMs / 60000);
      const offset = index * 3;
      const cronExp = `${offset}-59/${intervalMinutes} * * * *`;

      cron.schedule(cronExp, async () => {
        const jitterSpan = config.SCRAPING.intervalMs * (config.SCRAPING.jitterPct / 100);
        const jitterWait = Math.random() * jitterSpan;

        setTimeout(() => {
          this.runCycle(city).catch(e => console.error(e));
        }, jitterWait);
      });

      setTimeout(() => this.runCycle(city), index * 3000 + 1000);
    });
  }
}

module.exports = new Scheduler();
