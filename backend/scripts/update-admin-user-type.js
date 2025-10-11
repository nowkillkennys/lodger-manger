/**
 * Database Migration Script
 * Updates the system administrator user type from 'admin' to 'sys_admin'
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'changeme123'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5433'}/${process.env.DB_NAME || 'lodger_management'}`,
    ssl: false
});

async function updateAdminUserType() {
    try {
        console.log('🔄 Updating system administrator user type...');

        // Update the system administrator user type
        const result = await pool.query(
            'UPDATE users SET user_type = $1 WHERE email = $2 AND user_type = $3',
            ['sys_admin', 'admin@example.com', 'admin']
        );

        console.log(`✅ Updated ${result.rowCount} user(s) to sys_admin user type`);

        // Verify the update
        const verifyResult = await pool.query(
            'SELECT email, user_type FROM users WHERE email = $1',
            ['admin@example.com']
        );

        if (verifyResult.rows.length > 0) {
            console.log(`✅ Verified: ${verifyResult.rows[0].email} now has user_type: ${verifyResult.rows[0].user_type}`);
        }

        console.log('🎉 Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

updateAdminUserType();