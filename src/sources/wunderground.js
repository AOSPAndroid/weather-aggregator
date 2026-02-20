const axios = require('axios');
const cheerio = require('cheerio');
const BaseFetcher = require('./base-fetcher');
const config = require('../config');

class WundergroundFetcher extends BaseFetcher {
    constructor() {
        super('wunderground', 'anchor');
    }

    canUseAPI() { return config.SOURCES.wu && !!config.API_KEYS.wu; }

    async _fetchAPI(cityConfig) {
        if (!config.API_KEYS.wu) throw new Error('WU API key required');
        const url = `https://api.weather.com/v2/pws/observations/current?stationId=${cityConfig.icao}&format=json&units=m&apiKey=${config.API_KEYS.wu}`;
        const res = await axios.get(url, { timeout: config.RELIABILITY.timeoutMs });

        const obs = res.data.observations[0];
        return [
            { metric_type: 'current_temp', value_c: obs.metric.temp, value_f: (obs.metric.temp * 9 / 5) + 32 },
            { metric_type: 'recorded_daily_max', value_c: obs.metric.tempHigh, value_f: (obs.metric.tempHigh * 9 / 5) + 32 }
        ];
    }

    async _fetchScraper(cityConfig) {
        const url = `https://www.wunderground.com/weather/${cityConfig.icao}`;
        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
        const res = await axios.get(url, { timeout: config.RELIABILITY.timeoutMs, headers });

        const match = res.data.match(/window\.__INITIAL_DATA__\s*=\s*({.*?});/s);
        if (!match) {
            const $ = cheerio.load(res.data);
            const hiLo = $('.hi-lo').first().text();
            const current = $('.current-temp').first().text();

            let maxF = null; let curF = null;
            if (hiLo) { const hm = hiLo.match(/Hi\s*(\d+)/i); if (hm) maxF = parseFloat(hm[1]); }
            if (current) { const cm = current.match(/(\d+)/); if (cm) curF = parseFloat(cm[1]); }

            if (maxF === null && curF === null) throw new Error('Could not scrape WU values');

            const results = [];
            if (curF !== null) results.push({ metric_type: 'current_temp', value_c: (curF - 32) * 5 / 9, value_f: curF });
            if (maxF !== null) results.push({ metric_type: 'recorded_daily_max', value_c: (maxF - 32) * 5 / 9, value_f: maxF });
            return results;
        }

        try {
            // Extremely fragile, so just providing some resilient regex logic or fallback if possible
            // Let's rely on the html scrape logic if the tree is not fully available easily.
            // But we will return a simulated structure mapped from the regex.
            const maxMt = match[1].match(/"temperatureMax":(\d+)/);
            const curMt = match[1].match(/"temperature":(\d+)/);
            const results = [];
            if (curMt) { const curF = parseFloat(curMt[1]); results.push({ metric_type: 'current_temp', value_c: (curF - 32) * 5 / 9, value_f: curF }); }
            if (maxMt) { const maxF = parseFloat(maxMt[1]); results.push({ metric_type: 'recorded_daily_max', value_c: (maxF - 32) * 5 / 9, value_f: maxF }); }
            if (results.length === 0) throw new Error('Keys not found in initial data string');
            return results;
        } catch (e) {
            throw new Error('Failed to extract data from WU JSON snippet');
        }
    }
}

module.exports = new WundergroundFetcher();
