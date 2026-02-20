const express = require('express');
const router = express.Router();
const database = require('../db/database');
const config = require('../config');

router.get('/:city', (req, res) => {
    const city = req.params.city.toLowerCase();
    if (!config.CITIES[city]) return res.status(404).json({ error: 'City not supported' });

    const hours = parseInt(req.query.hours, 10) || 24;
    const history = database.getHistory(city, hours);

    res.json({
        city,
        hours,
        count: history.length,
        data: history
    });
});

module.exports = router;
