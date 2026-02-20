// In-memory database for cloud deployment
// Replace SQLite with simple array storage

const fetchHistory = [];

function insertFetchLog(entry) {
  const record = {
    id: fetchHistory.length + 1,
    city: entry.city,
    source_id: entry.source_id,
    source_type: entry.source_type,
    metric_type: entry.metric_type,
    value_c: entry.value_c !== undefined ? entry.value_c : null,
    value_f: entry.value_f !== undefined ? entry.value_f : null,
    fetched_at: entry.fetched_at || new Date().toISOString(),
    parse_method: entry.parse_method,
    parse_status: entry.parse_status,
    raw_snippet: entry.raw_snippet ? String(entry.raw_snippet).substring(0, 500) : null,
    latency_ms: entry.latency_ms || null,
    http_status: entry.http_status || null,
  };
  
  fetchHistory.push(record);
  return { changes: 1, lastInsertRowid: record.id };
}

function getHistory(city, hours = 24) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return fetchHistory
    .filter(r => r.city === city && new Date(r.fetched_at) >= cutoff)
    .sort((a, b) => new Date(b.fetched_at) - new Date(a.fetched_at));
}

module.exports = {
  db: { exec: () => {} },
  insertFetchLog,
  getHistory
};
