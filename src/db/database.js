const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'weather-data.sqlite');
const db = new Database(dbPath, { verbose: null });

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS fetch_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    value_c REAL,
    value_f REAL,
    fetched_at TEXT NOT NULL,
    parse_method TEXT NOT NULL,
    parse_status TEXT NOT NULL,
    raw_snippet TEXT,
    latency_ms INTEGER,
    http_status INTEGER
  );
  
  CREATE INDEX IF NOT EXISTS idx_city_fetched_at ON fetch_log(city, fetched_at);
  CREATE INDEX IF NOT EXISTS idx_city_source_fetched_at ON fetch_log(city, source_id, fetched_at);
`);

const insertStmt = db.prepare(`
  INSERT INTO fetch_log (
    city, source_id, source_type, metric_type, value_c, value_f,
    fetched_at, parse_method, parse_status, raw_snippet, latency_ms, http_status
  ) VALUES (
    @city, @source_id, @source_type, @metric_type, @value_c, @value_f,
    @fetched_at, @parse_method, @parse_status, @raw_snippet, @latency_ms, @http_status
  )
`);

function insertFetchLog(entry) {
  return insertStmt.run({
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
  });
}

function getHistory(city, hours = 24) {
  const stmt = db.prepare(`
    SELECT * FROM fetch_log
    WHERE city = ? AND fetched_at >= datetime('now', ?)
    ORDER BY fetched_at DESC
  `);
  return stmt.all(city, `-${hours} hours`);
}

module.exports = {
  db,
  insertFetchLog,
  getHistory
};
