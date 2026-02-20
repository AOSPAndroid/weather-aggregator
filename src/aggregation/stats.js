function median(values) {
    if (!values || values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function trimmedMean(values, trimPct = 0.1) {
    if (!values || values.length === 0) return null;
    if (values.length < 3) return median(values);
    const sorted = [...values].sort((a, b) => a - b);
    const trimCount = Math.max(1, Math.floor(sorted.length * trimPct));
    const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
    if (trimmed.length === 0) return median(values);
    return trimmed.reduce((sum, v) => sum + v, 0) / trimmed.length;
}

function weightedMean(entries) {
    if (!entries || entries.length === 0) return null;
    let totalWeight = 0;
    let sum = 0;
    for (const e of entries) {
        let w = 1.0;
        if (e.source_type === 'official_api') w = 2.0;
        else if (e.source_type === 'model') w = 1.5;
        if (e.parse_method === 'scrape') w *= 0.8;

        totalWeight += w;
        sum += e.value_c * w;
    }
    return sum / totalWeight;
}

function spread(values) {
    if (!values || values.length === 0) return 0;
    return Math.max(...values) - Math.min(...values);
}

function flagOutliers(values, threshold = 2) {
    if (!values || values.length < 3) return [];
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    const stddev = Math.sqrt(variance);

    if (stddev === 0) return [];
    return values.filter(v => Math.abs(v - mean) > threshold * stddev);
}

module.exports = { median, trimmedMean, weightedMean, spread, flagOutliers };
