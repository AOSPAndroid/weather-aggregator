const axios = require('axios');
const cheerio = require('cheerio');
const BaseFetcher = require('./base-fetcher');
const config = require('../config');

class NwsFetcher extends BaseFetcher {
    constructor() {
        super('nws', 'official_api');
    }

    canUseAPI() { return config.SOURCES.nws; }

    async _fetchAPI(cityConfig) {
        if (cityConfig.tz !== 'America/Chicago' && cityConfig.tz !== 'America/New_York') {
            throw new Error('NWS only supports US cities');
        }

        const pointsUrl = `https://api.weather.gov/points/${cityConfig.lat},${cityConfig.lon}`;
        const headers = { 'User-Agent': '(weather-aggregator-bot, contact@example.com)' };

        const pointsRes = await axios.get(pointsUrl, { timeout: config.RELIABILITY.timeoutMs, headers });
        const gridDataUrl = pointsRes.data.properties.forecastGridData;

        const gridRes = await axios.get(gridDataUrl, { timeout: config.RELIABILITY.timeoutMs, headers });
        const maxTempData = gridRes.data.properties.maxTemperature.values;

        if (!maxTempData || maxTempData.length === 0) {
            throw new Error('No maxTemperature data found');
        }

        const results = [];
        const metricTypes = [
            'provisional_daily_high',
            'provisional_daily_high_d1',
            'provisional_daily_high_d2'
        ];

        for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
            const targetStart = new Date();
            targetStart.setHours(0, 0, 0, 0);
            targetStart.setDate(targetStart.getDate() + dayOffset);
            const targetEnd = new Date(targetStart);
            targetEnd.setDate(targetEnd.getDate() + 1);

            let maxC = null;
            for (const entry of maxTempData) {
                const timeStr = entry.validTime.split('/')[0];
                const validDate = new Date(timeStr);
                if (validDate >= targetStart && validDate < targetEnd) {
                    maxC = entry.value;
                    break;
                }
            }

            if (maxC !== null) {
                results.push({
                    metric_type: metricTypes[dayOffset],
                    value_c: maxC,
                    value_f: (maxC * 9 / 5) + 32,
                });
            }
        }

        if (results.length === 0) {
            // Fallback: just emit the first value as today
            results.push({
                metric_type: 'provisional_daily_high',
                value_c: maxTempData[0].value,
                value_f: (maxTempData[0].value * 9 / 5) + 32,
            });
        }

        return results;
    }

    async _fetchScraper(cityConfig) {
        const url = `https://forecast.weather.gov/MapClick.php?lat=${cityConfig.lat}&lon=${cityConfig.lon}`;
        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
        const res = await axios.get(url, { timeout: config.RELIABILITY.timeoutMs, headers });

        const $ = cheerio.load(res.data);
        let highFText = $('.temp.temp-high').first().text();
        if (!highFText) {
            throw new Error('Could not parse NWS DOM for high temp');
        }

        const match = highFText.match(/\d+/);
        if (!match) throw new Error('Could not extract number from NWS DOM');

        const maxF = parseFloat(match[0]);
        return [{
            metric_type: 'provisional_daily_high',
            value_c: (maxF - 32) * 5 / 9,
            value_f: maxF,
        }];
    }
}

module.exports = new NwsFetcher();
