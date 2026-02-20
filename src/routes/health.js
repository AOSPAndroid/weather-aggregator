const express = require('express');
const router = express.Router();
const database = require('../db/database');
const config = require('../config');

const startTime = Date.now();

router.get('/', (req, res) => {
    let dbOk = false;
    try {
        const row = database.db.prepare('SELECT 1').get();
        if (row) dbOk = true;
    } catch (e) { }

    res.json({
        status: dbOk ? 'ok' : 'degraded',
        uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
        db_connected: dbOk,
        sources_active: Object.keys(config.SOURCES).filter(k => config.SOURCES[k]).length,
        scrapers_enabled: config.SOURCES.scrapers
    });
});

module.exports = router;
