/**
 * Property Routes
 * Handles property management for landlords
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * Get landlord's properties
 * @route GET /api/properties
 * @auth Landlord/Admin only
 * @returns {Array} List of properties
 */
router.get('/', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM properties WHERE landlord_id = $1 AND is_active = true ORDER BY created_at DESC',
            [req.user.id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get properties error:', error);
        res.status(500).json({ error: 'Failed to get properties' });
    }
});

/**
 * Create property
 * @route POST /api/properties
 * @auth Landlord/Admin only
 * @body {string} property_name - Property name
 * @body {string} address_line1 - Address line 1
 * @body {string} address_line2 - Address line 2 (optional)
 * @body {string} city - City
 * @body {string} county - County (optional)
 * @body {string} postcode - Postcode
 * @body {Object} shared_areas - Shared areas details (optional)
 * @returns {Object} Created property
 */
router.post('/', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    try {
        const { property_name, address_line1, address_line2, city, county, postcode, shared_areas } = req.body;

        const result = await pool.query(
            `INSERT INTO properties (landlord_id, property_name, address_line1, address_line2, city, county, postcode, shared_areas)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [req.user.id, property_name, address_line1, address_line2, city, county, postcode, shared_areas]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create property error:', error);
        res.status(500).json({ error: 'Failed to create property' });
    }
});

module.exports = router;
