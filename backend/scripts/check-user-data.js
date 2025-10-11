/**
 * Debug Script - Check current user data
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'changeme123'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5433'}/${process.env.DB_NAME || 'lodger_management'}`,
    ssl: false
});

async function checkUserData() {
    try {
        console.log('🔍 Checking current user data...');

        // Check all users
        const allUsersResult = await pool.query(
            'SELECT id, email, user_type, full_name FROM users ORDER BY created_at DESC'
        );

        console.log('\n📋 All Users:');
        allUsersResult.rows.forEach(user => {
            console.log(`  - ${user.full_name} (${user.email}): ${user.user_type}`);
        });

        // Specifically check the admin user
        const adminResult = await pool.query(
            'SELECT id, email, user_type, full_name FROM users WHERE email = $1',
            ['admin@example.com']
        );

        if (adminResult.rows.length > 0) {
            const admin = adminResult.rows[0];
            console.log(`\n👑 System Administrator:`);
            console.log(`  - Name: ${admin.full_name}`);
            console.log(`  - Email: ${admin.email}`);
            console.log(`  - User Type: ${admin.user_type}`);
            console.log(`  - ID: ${admin.id}`);
        } else {
            console.log('\n❌ System Administrator not found!');
        }

        // Check user type distribution
        const typeResult = await pool.query(
            'SELECT user_type, COUNT(*) as count FROM users GROUP BY user_type'
        );

        console.log('\n📊 User Type Distribution:');
        typeResult.rows.forEach(type => {
            console.log(`  - ${type.user_type}: ${type.count} users`);
        });

    } catch (error) {
        console.error('❌ Error checking user data:', error);
    } finally {
        await pool.end();
    }
}

checkUserData();