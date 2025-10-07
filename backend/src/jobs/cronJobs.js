const cron = require('node-cron');
const { pool } = require('../config/database');

/**
 * Check for tenancies expiring in 30 days and send reminders
 */
async function checkExpiringTenancies() {
  console.log('[CRON] Running daily tenancy expiry check at', new Date().toISOString());

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find tenancies expiring in 30 days that haven't received a reminder
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringTenancies = await client.query(`
      SELECT t.*, l.full_name as lodger_name, l.email as lodger_email,
             ll.full_name as landlord_name, ll.email as landlord_email
      FROM tenancies t
      JOIN users l ON t.lodger_id = l.id
      JOIN users ll ON t.landlord_id = ll.id
      WHERE t.status = 'active'
      AND t.end_date IS NOT NULL
      AND t.end_date <= $1
      AND t.end_date >= CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.tenancy_id = t.id
        AND n.type = 'tenancy_expiring'
        AND n.created_at > CURRENT_DATE - INTERVAL '35 days'
      )
    `, [thirtyDaysFromNow]);

    let remindersCreated = 0;

    for (const tenancy of expiringTenancies.rows) {
      const daysUntilExpiry = Math.ceil((new Date(tenancy.end_date) - new Date()) / (1000 * 60 * 60 * 24));

      // Send notification to landlord
      await client.query(
        `INSERT INTO notifications (user_id, tenancy_id, type, title, message)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          tenancy.landlord_id,
          tenancy.id,
          'tenancy_expiring',
          'Tenancy Expiring Soon - Action Required',
          `The tenancy with ${tenancy.lodger_name} expires in ${daysUntilExpiry} days on ${new Date(tenancy.end_date).toLocaleDateString('en-GB')}. Please consider offering an extension if you wish to continue the tenancy.`
        ]
      );

      // Send notification to lodger
      const propertyAddress = [tenancy.property_house_number, tenancy.property_street_name, tenancy.property_city, tenancy.property_county, tenancy.property_postcode]
        .filter(part => part)
        .join(', ');
      await client.query(
        `INSERT INTO notifications (user_id, tenancy_id, type, title, message)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          tenancy.lodger_id,
          tenancy.id,
          'tenancy_expiring',
          'Your Tenancy is Expiring Soon',
          `Your tenancy at ${propertyAddress} expires in ${daysUntilExpiry} days on ${new Date(tenancy.end_date).toLocaleDateString('en-GB')}. Your landlord may offer you an extension, or you may need to make alternative arrangements.`
        ]
      );

      remindersCreated++;
    }

    await client.query('COMMIT');
    console.log(`[CRON] Extension reminders sent: ${remindersCreated} tenancies notified`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[CRON] Error in tenancy expiry check:', error);
  } finally {
    client.release();
  }
}

/**
 * Initialize all cron jobs
 */
function initializeCronJobs() {
  console.log('✓ Starting daily tenancy expiry check scheduler');

  // Run daily at 9 AM
  cron.schedule('0 9 * * *', checkExpiringTenancies);
}

module.exports = { initializeCronJobs, checkExpiringTenancies };
