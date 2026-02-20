const { median, trimmedMean, spread, flagOutliers } = require('../src/aggregation/stats');

describe('Aggregation Stats Math', () => {
    test('median calculates correctly', () => {
        expect(median([1, 2, 3, 4, 5])).toBe(3);
        expect(median([1, 2, 3, 4])).toBe(2.5);
        expect(median([10])).toBe(10);
        expect(median([])).toBeNull();
    });

    test('trimmedMean drops outliers', () => {
        expect(trimmedMean([1, 2, 3, 4, 100], 0.2)).toBe(3);
    });

    test('spread finds range', () => {
        expect(spread([10, 15, 12])).toBe(5);
    });

    test('flagOutliers identifies > 2 stddev out', () => {
        expect(flagOutliers([10, 10, 10, 10, 10, 10, 10, 10, 10, 50], 2)).toEqual([50]);
    });
});
