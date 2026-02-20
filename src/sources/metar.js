const axios = require('axios');
const BaseFetcher = require('./base-fetcher');
const config = require('../config');

class MetarFetcher extends BaseFetcher {
    constructor() {
        super('metar', 'observation');
    }

    canUseAPI() { return config.SOURCES.metar; }
    canUseScraper() { return false; }

    async _fetchAPI(cityConfig) {
        if (!cityConfig.icao) throw new Error('ICAO code required for METAR');

        const url = `https://aviationweather.gov/api/data/metar?ids=${cityConfig.icao}&format=json`;
        const res = await axios.get(url, { timeout: config.RELIABILITY.timeoutMs });

        if (!res.data || res.data.length === 0) {
            throw new Error('No METAR data returned');
        }

        const obs = res.data[0];
        if (obs.temp === undefined || obs.temp === null) {
            throw new Error('METAR missing temp data');
        }

        const tempC = parseFloat(obs.temp);
        return [{
            metric_type: 'current_temp',
            value_c: tempC,
            value_f: (tempC * 9 / 5) + 32,
        }];
    }
}

module.exports = new MetarFetcher();
