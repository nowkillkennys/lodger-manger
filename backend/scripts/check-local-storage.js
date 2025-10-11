/**
 * Debug Script - Check what user data is stored in localStorage
 * This will help identify if the issue is with cached user data
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'changeme123'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5433'}/${process.env.DB_NAME || 'lodger_management'}`,
    ssl: false
});

async function checkLocalStorageIssue() {
    try {
        console.log('🔍 Checking for localStorage data issues...');

        // Get fresh user data from database
        const dbResult = await pool.query(
            'SELECT id, email, user_type, full_name, phone FROM users WHERE email = $1',
            ['admin@example.com']
        );

        if (dbResult.rows.length > 0) {
            const dbUser = dbResult.rows[0];
            console.log('\n📋 Fresh database user data:');
            console.log(JSON.stringify(dbUser, null, 2));

            console.log('\n🔧 What the frontend should receive:');
            console.log(`  - user_type: "${dbUser.user_type}"`);
            console.log(`  - email: "${dbUser.email}"`);

            // Test the routing logic
            console.log('\n🧪 Frontend routing logic test:');
            if (dbUser.user_type === 'sys_admin') {
                console.log('  ✅ Should load: SystemAdminDashboard.jsx (Crown icon, Red theme)');
            } else if (dbUser.user_type === 'admin') {
                console.log('  ✅ Should load: AdminDashboard.jsx (Shield icon, Blue theme)');
            } else if (dbUser.user_type === 'landlord') {
                console.log('  ✅ Should load: LandlordDashboard.jsx');
            } else if (dbUser.user_type === 'lodger') {
                console.log('  ✅ Should load: LodgerDashboard.jsx');
            } else {
                console.log('  ❌ Unknown user type - ERROR');
            }
        }

        console.log('\n💡 Troubleshooting steps:');
        console.log('  1. Clear browser localStorage completely');
        console.log('  2. Clear browser cache and hard reload');
        console.log('  3. Try incognito/private browsing mode');
        console.log('  4. Check browser console for errors');

    } catch (error) {
        console.error('❌ Error checking localStorage issue:', error);
    } finally {
        await pool.end();
    }
}

checkLocalStorageIssue();