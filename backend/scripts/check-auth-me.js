/**
 * Debug Script - Check what /api/auth/me returns for admin user
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'changeme123'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5433'}/${process.env.DB_NAME || 'lodger_management'}`,
    ssl: false
});

async function checkAuthMe() {
    try {
        console.log('🔍 Checking what /api/auth/me would return for admin user...');

        // Get the admin user data as it would be returned by /api/auth/me
        const result = await pool.query(
            'SELECT id, email, user_type, full_name, phone FROM users WHERE email = $1',
            ['admin@example.com']
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log('\n📋 User data that would be returned by /api/auth/me:');
            console.log(JSON.stringify(user, null, 2));

            console.log('\n🔍 Key values:');
            console.log(`  - email: ${user.email}`);
            console.log(`  - user_type: ${user.user_type}`);
            console.log(`  - full_name: ${user.full_name}`);

            // Test the routing logic
            console.log('\n🧪 Testing routing logic:');
            if (user.user_type === 'sys_admin') {
                console.log('  ✅ Would load: SystemAdminDashboard.jsx');
            } else if (user.user_type === 'admin') {
                console.log('  ✅ Would load: AdminDashboard.jsx');
            } else if (user.user_type === 'landlord') {
                console.log('  ✅ Would load: LandlordDashboard.jsx');
            } else if (user.user_type === 'lodger') {
                console.log('  ✅ Would load: LodgerDashboard.jsx');
            } else {
                console.log('  ❌ Unknown user type - would show error');
            }
        } else {
            console.log('\n❌ Admin user not found!');
        }

    } catch (error) {
        console.error('❌ Error checking auth me:', error);
    } finally {
        await pool.end();
    }
}

checkAuthMe();