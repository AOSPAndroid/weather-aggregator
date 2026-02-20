const axios = require('axios');
const cheerio = require('cheerio');
const BaseFetcher = require('./base-fetcher');
const config = require('../config');

class MeteoFranceFetcher extends BaseFetcher {
    constructor() {
        super('meteo_france', 'official_api');
    }

    canUseAPI() { return config.SOURCES.meteoFrance && !!config.API_KEYS.meteoFrance; }

    async _fetchAPI(cityConfig) {
        throw new Error('Météo-France API fetch logic requires API token from Portail des API.');
    }

    async _fetchScraper(cityConfig) {
        if (cityConfig.tz !== 'Europe/Paris') throw new Error('Météo-France scrape mostly for FR');

        const url = `https://meteofrance.com/previsions-meteo-france/paris/75000`;
        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
        const res = await axios.get(url, { timeout: config.RELIABILITY.timeoutMs, headers });

        const $ = cheerio.load(res.data);
        const maxText = $('.temp-max').first().text();
        let maxC = null;

        const match = maxText.match(/\d+/);
        if (match) {
            maxC = parseFloat(match[0]);
        } else {
            const maxMatch = res.data.match(/"TMax":\s*(\d+)/i);
            if (maxMatch) maxC = parseFloat(maxMatch[1]);
        }

        if (maxC === null) {
            // generic fallback
            const text = $('body').text();
            const m = text.match(/max\s*(\d+)\s*°/i);
            if (m) maxC = parseFloat(m[1]);
        }

        if (maxC === null) throw new Error('Could not extract max temp from Météo-France');

        return [{
            metric_type: 'provisional_daily_high',
            value_c: maxC,
            value_f: (maxC * 9 / 5) + 32,
        }];
    }
}

module.exports = new MeteoFranceFetcher();
