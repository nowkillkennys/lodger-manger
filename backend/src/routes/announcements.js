const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * Get all active announcements
 * @route GET /api/announcements
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT a.*, u.full_name as created_by_name
             FROM announcements a
             LEFT JOIN users u ON a.created_by = u.id
             WHERE a.is_active = true
             AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
             AND (a.target_audience = 'all' OR a.target_audience = $1)
             ORDER BY a.created_at DESC`,
            [req.user.user_type]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get announcements error:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

/**
 * Get all announcements (admin only)
 * @route GET /api/announcements/all
 */
router.get('/all', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT a.*, u.full_name as created_by_name
             FROM announcements a
             LEFT JOIN users u ON a.created_by = u.id
             ORDER BY a.created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get all announcements error:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

/**
 * Create announcement (admin only)
 * @route POST /api/announcements
 */
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { title, message, type, target_audience, expires_at } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        const result = await pool.query(
            `INSERT INTO announcements (title, message, type, target_audience, created_by, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [title, message, type || 'info', target_audience || 'all', req.user.id, expires_at || null]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
});

/**
 * Update announcement (admin only)
 * @route PUT /api/announcements/:id
 */
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, message, type, target_audience, is_active, expires_at } = req.body;

        const result = await pool.query(
            `UPDATE announcements
             SET title = COALESCE($1, title),
                 message = COALESCE($2, message),
                 type = COALESCE($3, type),
                 target_audience = COALESCE($4, target_audience),
                 is_active = COALESCE($5, is_active),
                 expires_at = COALESCE($6, expires_at),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $7
             RETURNING *`,
            [title, message, type, target_audience, is_active, expires_at, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update announcement error:', error);
        res.status(500).json({ error: 'Failed to update announcement' });
    }
});

/**
 * Delete announcement (admin only)
 * @route DELETE /api/announcements/:id
 */
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM announcements WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        res.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        console.error('Delete announcement error:', error);
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

/**
 * Send broadcast message (admin only)
 * @route POST /api/announcements/broadcast
 */
router.post('/broadcast', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { subject, message, target_role } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ error: 'Subject and message are required' });
        }

        // Get recipients
        let query = 'SELECT id, email, full_name FROM users WHERE is_active = true';
        const params = [];

        if (target_role && target_role !== 'all') {
            query += ' AND user_type = $1';
            params.push(target_role);
        }

        const recipients = await pool.query(query, params);

        // Create notifications for all recipients
        const notificationPromises = recipients.rows.map(user => {
            return pool.query(
                `INSERT INTO notifications (user_id, type, title, message)
                 VALUES ($1, 'general', $2, $3)`,
                [user.id, subject, message]
            );
        });

        await Promise.all(notificationPromises);

        // Log broadcast
        await pool.query(
            `INSERT INTO broadcast_messages (subject, message, target_role, sent_by, recipient_count)
             VALUES ($1, $2, $3, $4, $5)`,
            [subject, message, target_role || 'all', req.user.id, recipients.rows.length]
        );

        res.json({
            message: 'Broadcast sent successfully',
            recipient_count: recipients.rows.length
        });
    } catch (error) {
        console.error('Send broadcast error:', error);
        res.status(500).json({ error: 'Failed to send broadcast' });
    }
});

/**
 * Get broadcast history (admin only)
 * @route GET /api/announcements/broadcasts
 */
router.get('/broadcasts', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT b.*, u.full_name as sent_by_name
             FROM broadcast_messages b
             LEFT JOIN users u ON b.sent_by = u.id
             ORDER BY b.sent_at DESC
             LIMIT 50`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get broadcasts error:', error);
        res.status(500).json({ error: 'Failed to fetch broadcasts' });
    }
});

module.exports = router;
