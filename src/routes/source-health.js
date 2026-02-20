const express = require('express');
const router = express.Router();
const circuitBreaker = require('../circuit-breaker');
const scheduler = require('../scheduler');

router.get('/', (req, res) => {
    res.json({
        circuit_breakers: circuitBreaker.getStatus(),
        daily_caps: scheduler.dailyCaps,
        backoffs: scheduler.backoffs
    });
});

module.exports = router;
