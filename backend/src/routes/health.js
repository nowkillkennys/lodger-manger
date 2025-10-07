/**
 * Health Check Route
 * Simple health check endpoint for monitoring
 */

const express = require('express');
const router = express.Router();

/**
 * Health check endpoint
 * @route GET /api/health
 * @returns {Object} Health status, timestamp, and version
 */
router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

module.exports = router;
