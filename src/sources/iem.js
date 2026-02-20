const axios = require('axios');
const BaseFetcher = require('./base-fetcher');
const config = require('../config');

class IemFetcher extends BaseFetcher {
    constructor() {
        super('iem', 'observation');
    }

    canUseAPI() { return config.SOURCES.iem; }
    canUseScraper() { return false; }

    async _fetchAPI(cityConfig) {
        if (cityConfig.tz !== 'America/Chicago' && cityConfig.tz !== 'America/New_York') {
            throw new Error('IEM daily climate data used mainly for US');
        }

        const year = new Date().getFullYear();
        const url = `https://mesonet.agron.iastate.edu/json/cli.py?station=${cityConfig.icao}&year=${year}`;
        const res = await axios.get(url, { timeout: config.RELIABILITY.timeoutMs });

        // Sometimes the CLI runs a bit behind today's local time, or just pulls the previous day.
        // We get the most recent valid day
        const results = res.data.results || [];
        if (results.length === 0) throw new Error('No IEM CLI data');

        const latest = results[results.length - 1]; // sorted chronically usually

        if (latest.high === null) {
            throw new Error('IEM CLI latest high is null');
        }

        const maxF = latest.high;
        return [{
            metric_type: 'recorded_daily_max',
            value_c: (maxF - 32) * 5 / 9,
            value_f: maxF,
        }];
    }
}

module.exports = new IemFetcher();
