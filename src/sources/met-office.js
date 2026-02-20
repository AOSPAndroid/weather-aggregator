const axios = require('axios');
const cheerio = require('cheerio');
const BaseFetcher = require('./base-fetcher');
const config = require('../config');

class MetOfficeFetcher extends BaseFetcher {
    constructor() {
        super('met_office', 'official_api');
    }

    canUseAPI() { return config.SOURCES.metOffice && !!config.API_KEYS.metOffice; }

    async _fetchAPI(cityConfig) {
        throw new Error('Met Office API fetch logic requires proper DataHub Auth which is missing. Dropping to scraper.');
    }

    async _fetchScraper(cityConfig) {
        if (cityConfig.tz !== 'Europe/London') throw new Error('Met Office scrape uses UK URLs');

        const url = `https://www.metoffice.gov.uk/weather/forecast/gcpv7fnqv`;
        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
        const res = await axios.get(url, { timeout: config.RELIABILITY.timeoutMs, headers });

        const $ = cheerio.load(res.data);
        const firstTabTemp = $('.tab-temp[data-value]').first();
        let maxC = null;
        if (firstTabTemp.length) {
            maxC = parseFloat(firstTabTemp.attr('data-value'));
        }

        if (maxC === null) {
            const rx = /"maxTemp":(\d+)/i;
            const m = rx.exec(res.data);
            if (m) maxC = parseFloat(m[1]);
        }

        if (maxC === null) {
            // Very basic fallback to extract any high temp around "High:"
            const pageText = $('body').text();
            const simpleMatch = pageText.match(/High:\s*(\d+)°C/i);
            if (simpleMatch) maxC = parseFloat(simpleMatch[1]);
        }

        if (maxC === null) throw new Error('Could not parse Met Office temp');

        return [{
            metric_type: 'provisional_daily_high',
            value_c: maxC,
            value_f: (maxC * 9 / 5) + 32,
        }];
    }
}

module.exports = new MetOfficeFetcher();
