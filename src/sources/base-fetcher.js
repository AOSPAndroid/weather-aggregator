const axios = require('axios');
const circuitBreaker = require('../circuit-breaker');
const config = require('../config');

class BaseFetcher {
    constructor(sourceId, type) {
        this.sourceId = sourceId;
        this.type = type; // official_api, model, observation, anchor
    }

    /**
     * Abstract method: override in subclasses
     * Should return array of { metric_type, value_c, value_f, ... }
     */
    async _fetchAPI(cityConfig) { throw new Error('Not implemented'); }
    async _fetchScraper(cityConfig) { throw new Error('Not implemented'); }

    getCircuitKey(cityName) {
        return `${cityName}_${this.sourceId}`;
    }

    async fetch(cityName, cityConfig) {
        const circuitKey = this.getCircuitKey(cityName);
        if (!circuitBreaker.canRequest(circuitKey)) {
            return [{ parse_status: 'circuit_open', latency_ms: 0, metric_type: 'unknown' }];
        }

        let results = [];
        const startTime = Date.now();
        let parseStatus = 'ok';
        let httpStatus = 200;
        let snippet = '';
        let usedMethod = 'api';

        try {
            if (this.canUseAPI()) {
                try {
                    results = await this.executeWithRetry(() => this._fetchAPI(cityConfig));
                } catch (err) {
                    console.warn(`[${this.sourceId}] API failed for ${cityName}, falling back to scraper. Reason: ${err.message}`);
                    usedMethod = 'scrape';
                    if (this.canUseScraper()) {
                        results = await this.executeWithRetry(() => this._fetchScraper(cityConfig));
                    } else {
                        throw err;
                    }
                }
            } else if (this.canUseScraper()) {
                usedMethod = 'scrape';
                results = await this.executeWithRetry(() => this._fetchScraper(cityConfig));
            } else {
                throw new Error('No fetch method available (API/scraper disabled or missing keys)');
            }

            circuitBreaker.recordSuccess(circuitKey);
        } catch (err) {
            parseStatus = 'fetch_error';
            httpStatus = err.response ? err.response.status : 500;
            snippet = err.message;
            circuitBreaker.recordFailure(circuitKey);
        }

        const latencyMs = Date.now() - startTime;

        if (results.length === 0) {
            return [{
                source_id: this.sourceId,
                source_type: this.type,
                metric_type: 'unknown',
                parse_method: usedMethod,
                parse_status: parseStatus,
                raw_snippet: snippet ? snippet.substring(0, 500) : null,
                latency_ms: latencyMs,
                http_status: httpStatus
            }];
        }

        return results.map(r => ({
            source_id: this.sourceId,
            source_type: this.type,
            parse_method: usedMethod,
            parse_status: r.parse_status || parseStatus,
            raw_snippet: r.raw_snippet || (snippet ? snippet.substring(0, 500) : null),
            latency_ms: latencyMs,
            http_status: r.http_status || httpStatus,
            ...r
        }));
    }

    async executeWithRetry(fn) {
        let attempts = 0;
        while (attempts <= config.RELIABILITY.maxRetries) {
            try {
                attempts++;
                // Configure axios timeout directly here or ensure the inner fn passes it.
                // For simplicity we trust the inner fn uses config.RELIABILITY.timeoutMs
                return await fn();
            } catch (err) {
                if (attempts > config.RELIABILITY.maxRetries) throw err;
                // Jitter: wait 500ms to 2000ms
                const delay = 500 + Math.random() * 1500;
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }

    canUseAPI() { return true; }
    canUseScraper() { return config.SOURCES.scrapers; }
}

module.exports = BaseFetcher;
