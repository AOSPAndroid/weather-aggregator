const axios = require('axios');
const BaseFetcher = require('./base-fetcher');
const config = require('../config');

const DAY_SUFFIXES = ['', '_d1', '_d2']; // today, tomorrow, day-after
const METRIC_TYPES = [
    'provisional_daily_high',
    'provisional_daily_high_d1',
    'provisional_daily_high_d2'
];

class OpenMeteoFetcher extends BaseFetcher {
    constructor() {
        super('open_meteo', 'model');
    }

    canUseAPI() { return config.SOURCES.openMeteo; }
    canUseScraper() { return false; }

    async _fetchAPI(cityConfig) {
        const lat = cityConfig.lat;
        const lon = cityConfig.lon;

        let models = 'ecmwf_ifs025,gfs_seamless,ukmo_seamless';
        if (lat > 40 && lat < 52 && lon > -5 && lon < 10) {
            models += ',meteofrance_arome_france_hd';
        }

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max&current=temperature_2m&models=${models}&timezone=auto&forecast_days=3`;
        const res = await axios.get(url, { timeout: config.RELIABILITY.timeoutMs });

        const data = res.data;
        const results = [];

        if (data.current) {
            results.push({
                source_id: 'open_meteo_current',
                metric_type: 'current_temp',
                value_c: data.current.temperature_2m,
                value_f: (data.current.temperature_2m * 9 / 5) + 32,
            });
        }

        const returnedModels = Object.keys(data.daily || {}).filter(k => k.startsWith('temperature_2m_max_'));

        for (const key of returnedModels) {
            const modelName = key.replace('temperature_2m_max_', '');
            const vals = data.daily[key];
            // Emit today (index 0), tomorrow (index 1), day-after (index 2)
            for (let dayIdx = 0; dayIdx < 3; dayIdx++) {
                if (vals && vals.length > dayIdx && vals[dayIdx] !== null) {
                    results.push({
                        source_id: `open_meteo_${modelName}`,
                        metric_type: METRIC_TYPES[dayIdx],
                        value_c: vals[dayIdx],
                        value_f: (vals[dayIdx] * 9 / 5) + 32,
                    });
                }
            }
        }

        return results;
    }
}

module.exports = new OpenMeteoFetcher();
