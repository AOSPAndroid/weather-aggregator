const express = require('express');
const router = express.Router();
const database = require('../db/database');
const config = require('../config');
const stats = require('../aggregation/stats');
const resolution = require('../aggregation/resolution');
const riskGates = require('../aggregation/risk-gates');

router.get('/:city/:date', (req, res) => {
  const { city, date } = req.params;

  if (!config.CITIES[city]) return res.status(404).json({ error: 'City not supported' });

  const stmt = database.db.prepare(`
    SELECT * FROM fetch_log 
    WHERE city = ? AND date(fetched_at) = ?
  `);
  const logs = stmt.all(city, date);

  if (!logs || logs.length === 0) return res.status(404).json({ error: 'No data for this date' });

  const recordedLogs = logs.filter(l => l.metric_type === 'recorded_daily_max' && l.parse_status === 'ok');
  recordedLogs.sort((a, b) => new Date(b.fetched_at) - new Date(a.fetched_at));

  let anchorEntry = recordedLogs.find(r => r.source_id.startsWith('wunderground'));
  if (!anchorEntry) anchorEntry = recordedLogs.find(r => r.source_id === 'iem');

  const forecastLogs = logs.filter(l => l.metric_type === 'provisional_daily_high' && l.parse_status === 'ok');

  const latestFcst = {};
  for (const f of forecastLogs) {
    if (!latestFcst[f.source_id]) latestFcst[f.source_id] = f;
    else if (new Date(f.fetched_at) > new Date(latestFcst[f.source_id].fetched_at)) latestFcst[f.source_id] = f;
  }
  const forecasts = Object.values(latestFcst);

  const resSummary = resolution.computeResolutionSummary(forecasts, anchorEntry, config.CONFIDENCE.anchorConflictThresholdC);

  const fcstVals = forecasts.map(f => f.value_c);
  const spreadC = stats.spread(fcstVals);
  const risk = riskGates.evaluateRiskGates(forecasts, resSummary, spreadC, config.GATES);

  res.json({
    city,
    date,
    decision_ready: !!anchorEntry,
    anchor: anchorEntry,
    forecast_consensus: {
      median_c: stats.median(fcstVals),
      spread_c: spreadC,
      sources_count: forecasts.length
    },
    resolution_summary: resSummary,
    risk_evaluation: risk,
    audit_logs_count: logs.length
  });
});

module.exports = router;
