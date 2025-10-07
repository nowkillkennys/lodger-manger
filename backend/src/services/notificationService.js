const { pool } = require('../config/database');

async function createNotification(userId, tenancyId, type, title, message) {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, tenancy_id, type, title, message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, tenancyId, type, title, message]
  );
  return result.rows[0];
}

async function getNotificationsByUser(userId) {
  const result = await pool.query(
    `SELECT n.*, t.property_address
     FROM notifications n
     LEFT JOIN tenancies t ON n.tenancy_id = t.id
     WHERE n.user_id = $1
     ORDER BY n.created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function markNotificationAsRead(notificationId, userId) {
  const result = await pool.query(
    `UPDATE notifications
     SET is_read = true, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [notificationId, userId]
  );
  return result.rows[0];
}

module.exports = {
  createNotification,
  getNotificationsByUser,
  markNotificationAsRead
};
