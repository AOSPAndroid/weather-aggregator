const { computeResolutionSummary } = require('../src/aggregation/resolution');

describe('Resolution Anchor Logic', () => {
    test('flags conflict if anchor deviates from median', () => {
        const forecasts = [{ value_c: 10 }, { value_c: 10 }, { value_c: 11 }];
        const anchor = { source_id: 'wunderground', value_c: 15, fetched_at: new Date().toISOString() };

        const res = computeResolutionSummary(forecasts, anchor, 2.0);
        expect(res.resolution_ready).toBe(false);
        expect(res.conflict_reason).toContain('conflicts with forecast consensus');
    });

    test('ready if anchor is within threshold', () => {
        const forecasts = [{ value_c: 10 }, { value_c: 10 }, { value_c: 11 }];
        const anchor = { source_id: 'wunderground', value_c: 11, fetched_at: new Date().toISOString() };

        const res = computeResolutionSummary(forecasts, anchor, 2.0);
        expect(res.resolution_ready).toBe(true);
        expect(res.conflict_reason).toBeNull();
    });
});
