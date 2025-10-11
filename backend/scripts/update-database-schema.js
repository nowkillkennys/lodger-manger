/**
 * Database Schema Update Script
 * Updates the users table to allow 'sys_admin' user type
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'changeme123'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5433'}/${process.env.DB_NAME || 'lodger_management'}`,
    ssl: false
});

async function updateDatabaseSchema() {
    try {
        console.log('🔄 Updating database schema to support sys_admin user type...');

        // Drop the existing constraint
        await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check');
        console.log('✅ Dropped existing user_type constraint');

        // Add the new constraint with sys_admin included
        await pool.query(`
            ALTER TABLE users ADD CONSTRAINT users_user_type_check
            CHECK (user_type IN ('landlord', 'lodger', 'admin', 'sys_admin'))
        `);
        console.log('✅ Added new user_type constraint with sys_admin support');

        // Now update the system administrator user type
        const updateResult = await pool.query(
            'UPDATE users SET user_type = $1 WHERE email = $2 AND user_type = $3',
            ['sys_admin', 'admin@example.com', 'admin']
        );

        console.log(`✅ Updated ${updateResult.rowCount} user(s) to sys_admin user type`);

        // Verify the update
        const verifyResult = await pool.query(
            'SELECT email, user_type FROM users WHERE email = $1',
            ['admin@example.com']
        );

        if (verifyResult.rows.length > 0) {
            console.log(`✅ Verified: ${verifyResult.rows[0].email} now has user_type: ${verifyResult.rows[0].user_type}`);
        }

        console.log('🎉 Database schema update completed successfully!');

    } catch (error) {
        console.error('❌ Schema update failed:', error);
    } finally {
        await pool.end();
    }
}

updateDatabaseSchema();