/**
 * Debug Script - Debug the authentication flow
 * This will help identify why the sys_admin is being redirected incorrectly
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'changeme123'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5433'}/${process.env.DB_NAME || 'lodger_management'}`,
    ssl: false
});

async function debugAuthFlow() {
    try {
        console.log('🔍 Debugging authentication flow...');

        // Check what the /api/auth/me endpoint would return
        const authMeResult = await pool.query(
            'SELECT id, email, user_type, full_name, phone FROM users WHERE email = $1',
            ['admin@example.com']
        );

        if (authMeResult.rows.length > 0) {
            const user = authMeResult.rows[0];
            console.log('\n📋 /api/auth/me would return:');
            console.log(JSON.stringify(user, null, 2));

            console.log('\n🔍 User properties:');
            console.log(`  - email: ${user.email}`);
            console.log(`  - user_type: ${user.user_type}`);
            console.log(`  - full_name: ${user.full_name}`);

            // Test the routing logic that should happen in frontend
            console.log('\n🧪 Frontend routing logic simulation:');
            if (user.user_type === 'sys_admin') {
                console.log('  ✅ Should load: SystemAdminDashboard.jsx');
                console.log('  ✅ Should show: Crown icon, Red theme, Factory Reset');
            } else if (user.user_type === 'admin') {
                console.log('  ✅ Should load: AdminDashboard.jsx');
                console.log('  ✅ Should show: Shield icon, Blue theme, No Factory Reset');
            } else if (user.user_type === 'landlord') {
                console.log('  ✅ Should load: LandlordDashboard.jsx');
            } else if (user.user_type === 'lodger') {
                console.log('  ✅ Should load: LodgerDashboard.jsx');
            } else {
                console.log('  ❌ Unknown user type - ERROR');
            }

            // Check if there are any other users with admin@example.com
            const allAdminsResult = await pool.query(
                'SELECT id, email, user_type, full_name FROM users WHERE email = $1',
                ['admin@example.com']
            );

            console.log('\n📊 All users with admin@example.com:');
            allAdminsResult.rows.forEach((u, index) => {
                console.log(`  ${index + 1}. ${u.full_name} (${u.email}): ${u.user_type} - ID: ${u.id}`);
            });

        } else {
            console.log('\n❌ Admin user not found!');
        }

        console.log('\n💡 Possible issues:');
        console.log('  1. Browser localStorage has old user data');
        console.log('  2. Browser cache has old JavaScript');
        console.log('  3. Authentication token is invalid');
        console.log('  4. Multiple users with same email');

    } catch (error) {
        console.error('❌ Error debugging auth flow:', error);
    } finally {
        await pool.end();
    }
}

debugAuthFlow();