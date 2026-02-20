function computeConfidenceTier(forecasts, resolutionSummary, spreadC, configGates, configConfidence) {
    const numSources = forecasts.length;
    const isSpreadTight = spreadC <= configGates.maxSpreadC;
    const hasFreshAnchor = resolutionSummary.anchor_timestamp &&
        (Date.now() - new Date(resolutionSummary.anchor_timestamp).getTime() <= configGates.maxAnchorStaleMin * 60000);
    const anchorReady = resolutionSummary.resolution_ready;

    if (numSources >= configConfidence.highConfidenceMinSources && isSpreadTight && anchorReady && hasFreshAnchor) {
        const fastApiCount = forecasts.filter(f => f.parse_method === 'api').length;
        if (fastApiCount > 0 || !configGates.rejectScraperOnly) {
            return 'HIGH';
        }
    }

    if (numSources >= configGates.minSources && isSpreadTight) {
        return 'MEDIUM';
    }

    return 'LOW';
}

module.exports = { computeConfidenceTier };
