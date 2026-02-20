const { evaluateRiskGates } = require('../src/aggregation/risk-gates');

const defaultGates = {
    minSources: 2,
    maxSpreadC: 5.0,
    maxAnchorStaleMin: 120,
    rejectScraperOnly: true
};

describe('Risk Gates Guardrails', () => {
    test('passes valid inputs', () => {
        const forecasts = [
            { parse_method: 'api', value_c: 12 },
            { parse_method: 'scrape', value_c: 13 }
        ];
        const resSummary = { anchor_timestamp: new Date().toISOString(), conflict_reason: null };
        const result = evaluateRiskGates(forecasts, resSummary, 1.0, defaultGates);

        expect(result.tradeable).toBe(true);
        expect(result.trade_signal).toBe('TRADE');
    });

    test('fails on high spread', () => {
        const forecasts = [
            { parse_method: 'api', value_c: 10 },
            { parse_method: 'api', value_c: 20 }
        ];
        const resSummary = { anchor_timestamp: new Date().toISOString(), conflict_reason: null };
        const result = evaluateRiskGates(forecasts, resSummary, 10.0, defaultGates);

        expect(result.tradeable).toBe(false);
        expect(result.trade_signal).toBe('NO_TRADE');
        expect(result.no_trade_reasons.join()).toContain('exceeds threshold');
    });

    test('fails on scraper only', () => {
        const forecasts = [
            { parse_method: 'scrape', value_c: 10 },
            { parse_method: 'scrape', value_c: 11 }
        ];
        const resSummary = { anchor_timestamp: new Date().toISOString(), conflict_reason: null };
        const result = evaluateRiskGates(forecasts, resSummary, 1.0, defaultGates);

        expect(result.tradeable).toBe(false);
        expect(result.no_trade_reasons.join()).toContain('scraper-derived');
    });
});
