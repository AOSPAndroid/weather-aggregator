const express = require('express');
const router = express.Router();
const cache = require('../cache');
const config = require('../config');
const stats = require('../aggregation/stats');
const resolution = require('../aggregation/resolution');
const riskGates = require('../aggregation/risk-gates');
const confidence = require('../aggregation/confidence');

const FORECAST_DAYS = [
  { key: 'today', metric: 'provisional_daily_high', label: 'Today' },
  { key: 'tomorrow', metric: 'provisional_daily_high_d1', label: 'Tomorrow' },
  { key: 'after_tomorrow', metric: 'provisional_daily_high_d2', label: 'After Tomorrow' },
];

function buildDayBlock(entries) {
  const fcstVals = entries.map(f => f.value_c);
  return {
    forecast_highs: entries.map(f => ({
      source_id: f.source_id,
      value_c: f.value_c,
      value_f: f.value_f,
      method: f.parse_method,
      fetched_at: f.fetched_at
    })),
    derived: {
      median_c: stats.median(fcstVals),
      trimmed_mean_c: stats.trimmedMean(fcstVals),
      weighted_mean_c: stats.weightedMean(entries),
      spread_c: stats.spread(fcstVals),
      outliers: stats.flagOutliers(fcstVals)
    }
  };
}

router.get('/:city', (req, res) => {
  const city = req.params.city.toLowerCase();
  if (!config.CITIES[city]) return res.status(404).json({ error: 'City not supported' });

  const cached = cache.get(city);
  if (!cached || !cached.data || cached.data.length === 0) {
    return res.status(503).json({ error: 'Data not available yet, fetch cycles running' });
  }

  const data = cached.data;

  const latestBySource = {};
  for (const row of data) {
    if (row.parse_status !== 'ok') continue;
    const key = `${row.source_id}_${row.metric_type}`;
    if (!latestBySource[key]) {
      latestBySource[key] = row;
    }
  }

  const validEntries = Object.values(latestBySource);

  const currentEntries = validEntries.filter(r => r.metric_type === 'current_temp');
  const recordedEntries = validEntries.filter(r => r.metric_type === 'recorded_daily_max');

  const current = currentEntries.length > 0 ? {
    temp_c: currentEntries[0].value_c,
    temp_f: currentEntries[0].value_f,
    source: currentEntries[0].source_id,
    observed_at: currentEntries[0].fetched_at
  } : null;

  const recorded = recordedEntries.length > 0 ? {
    daily_max_c: recordedEntries[0].value_c,
    daily_max_f: recordedEntries[0].value_f,
    source: recordedEntries[0].source_id,
    observed_at: recordedEntries[0].fetched_at
  } : null;

  // Build per-day forecast blocks
  const days = {};
  for (const day of FORECAST_DAYS) {
    const entries = validEntries.filter(r => r.metric_type === day.metric);
    days[day.key] = buildDayBlock(entries);
  }

  // Today's forecasts used for resolution & risk (backward compat)
  const todayForecasts = validEntries.filter(r => r.metric_type === 'provisional_daily_high');
  const todayBlock = days.today;

  let anchorEntry = recordedEntries.find(r => r.source_id.startsWith('wunderground'));
  if (!anchorEntry) anchorEntry = recordedEntries.find(r => r.source_id === 'iem');

  const resSummary = resolution.computeResolutionSummary(todayForecasts, anchorEntry, config.CONFIDENCE.anchorConflictThresholdC);

  const risk = riskGates.evaluateRiskGates(todayForecasts, resSummary, todayBlock.derived.spread_c || 0, config.GATES);
  const confTier = confidence.computeConfidenceTier(todayForecasts, resSummary, todayBlock.derived.spread_c || 0, config.GATES, config.CONFIDENCE);

  risk.confidence = confTier;

  const sources = [];
  const uniqueGroups = new Set(data.map(d => d.source_id));
  for (const s of uniqueGroups) {
    const latest = data.find(d => d.source_id === s);
    if (latest) {
      sources.push({
        id: latest.source_id,
        status: latest.parse_status,
        method: latest.parse_method,
        latency_ms: latest.latency_ms,
        fetched_at: latest.fetched_at,
        stale: (Date.now() - new Date(latest.fetched_at).getTime()) > 3600000
      });
    }
  }

  // Backward-compatible flat fields + new days object
  res.json({
    city,
    current,
    forecast_highs: todayBlock.forecast_highs,
    recorded,
    derived: todayBlock.derived,
    days,
    resolution: resSummary,
    risk,
    sources,
    fetchedAt: new Date().toISOString(),
    is_cache_stale: cached.stale
  });
});

module.exports = router;
