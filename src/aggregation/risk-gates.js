function evaluateRiskGates(forecasts, resolutionSummary, spreadC, configGates) {
  const reasons = [];

  if (forecasts.length < configGates.minSources) {
    reasons.push(`Insufficient independent sources (found ${forecasts.length}, need >= ${configGates.minSources})`);
  }

  if (spreadC > configGates.maxSpreadC) {
    reasons.push(`Forecast spread (${spreadC.toFixed(1)}°C) exceeds threshold (${configGates.maxSpreadC}°C)`);
  }

  if (resolutionSummary.anchor_timestamp) {
    const ageMs = Date.now() - new Date(resolutionSummary.anchor_timestamp).getTime();
    if (ageMs > configGates.maxAnchorStaleMin * 60000) {
      reasons.push(`Resolution anchor is stale (> ${configGates.maxAnchorStaleMin} mins)`);
    }
  }

  if (resolutionSummary.conflict_reason) {
    reasons.push(resolutionSummary.conflict_reason);
  }

  if (configGates.rejectScraperOnly && forecasts.length > 0) {
    const allScraped = forecasts.every(f => f.parse_method === 'scrape');
    if (allScraped) {
      reasons.push('All incoming forecast data is scraper-derived with no official API confirmation');
    }
  }

  const tradeable = reasons.length === 0;

  return {
    tradeable,
    trade_signal: tradeable ? 'TRADE' : 'NO_TRADE',
    no_trade_reasons: reasons
  };
}

module.exports = { evaluateRiskGates };
