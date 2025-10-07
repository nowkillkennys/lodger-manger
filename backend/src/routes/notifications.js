/**
 * Notification Routes
 * Handles user notifications and payment reminders
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * Get notifications for user
 * @route GET /api/notifications
 * @auth Required
 * @returns {Array} List of user notifications
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT n.*,
                    CONCAT_WS(', ', t.property_house_number, t.property_street_name, t.property_city, t.property_county, t.property_postcode) as property_address,
                    u.full_name as from_user_name
             FROM notifications n
             LEFT JOIN tenancies t ON n.tenancy_id = t.id
             LEFT JOIN users u ON t.landlord_id = u.id
             WHERE n.user_id = $1
             ORDER BY n.created_at DESC
             LIMIT 50`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
});

/**
 * Mark notification as read
 * @route PUT /api/notifications/:id/read
 * @auth Required
 * @param {string} id - Notification ID
 * @returns {Object} Updated notification
 */
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await pool.query(
            `UPDATE notifications
             SET is_read = true, read_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

module.exports = router;
